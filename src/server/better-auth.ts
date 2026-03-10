import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, magicLink } from "better-auth/plugins";
import { eq, sql } from "drizzle-orm";
import nodemailer from "nodemailer";

import { db } from "@/db";
import * as schema from "@/db/schema";

import { secondaryStorage } from "./secondary-storage";

const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const socialProviders = {
  ...(googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : {}),
};

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const authEmailOtpExpiresInSeconds = 10 * 60;
const authMagicLinkExpiresInSeconds = 10 * 60;
const mailFrom =
  process.env.MAIL_FROM ??
  process.env.EMAIL_FROM ??
  "VecinoHub <no-reply@vecinohub.com>";

let warnedMissingSmtp = false;
let smtpTransporter: nodemailer.Transporter | null = null;

function buildBaseUsername(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");

  const fallback = normalized || "vecino";
  const expanded = fallback.length >= 3 ? fallback : `${fallback}.user`;

  return expanded.slice(0, 32).replace(/\.$/, "") || "vecino";
}

function buildUsernameCandidate(base: string, suffix: number) {
  if (suffix === 0) {
    return base;
  }

  const suffixText = `.${suffix}`;
  const trimmedBase = base.slice(0, Math.max(3, 32 - suffixText.length)).replace(/\.$/, "");
  return `${trimmedBase}${suffixText}`;
}

async function generateUniqueUsername(name: string) {
  const base = buildBaseUsername(name);

  for (let suffix = 0; suffix < 10_000; suffix += 1) {
    const candidate = buildUsernameCandidate(base, suffix);
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`lower(${schema.users.username}) = lower(${candidate})`)
      .limit(1);

    if (!existing[0]) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username.");
}

async function requireActiveUser(userId: string) {
  const user = await db
    .select({
      status: schema.users.status,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user[0] || user[0].status !== "active") {
    throw new APIError("FORBIDDEN", { message: "Account is inactive" });
  }
}

function getSmtpTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) {
    return null;
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  return smtpTransporter;
}

function requireSmtpTransporter() {
  const transporter = getSmtpTransporter();

  if (!transporter) {
    if (!warnedMissingSmtp) {
      warnedMissingSmtp = true;
      console.warn(
        "[auth] Auth email delivery is disabled because SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.",
      );
    }

    throw new Error("Auth email delivery is not configured.");
  }

  return transporter;
}

async function sendMagicLinkEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const transporter = requireSmtpTransporter();

  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: "Your VecinoHub sign-in link",
    text: `Use this link to sign in to VecinoHub: ${url}`,
    html: `<p>Use this link to sign in to <strong>VecinoHub</strong>:</p><p><a href="${url}">${url}</a></p>`,
  });
}

async function sendPasswordResetEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const transporter = requireSmtpTransporter();

  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: "Reset your VecinoHub password",
    text: `Use this link to reset your VecinoHub password: ${url}`,
    html: `<p>Use this link to reset your <strong>VecinoHub</strong> password:</p><p><a href="${url}">${url}</a></p>`,
  });
}

async function sendEmailOtp({
  email,
  otp,
  type,
}: {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password";
}) {
  const transporter = requireSmtpTransporter();
  const purpose =
    type === "forget-password"
      ? "password reset"
      : type === "email-verification"
        ? "email verification"
        : "sign in";

  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: `Your VecinoHub ${purpose} code`,
    text: `Your VecinoHub ${purpose} code is: ${otp}`,
    html: `<p>Your VecinoHub <strong>${purpose}</strong> code is:</p><p style="font-size:20px;font-weight:700;letter-spacing:0.15em">${otp}</p>`,
  });
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: authEmailOtpExpiresInSeconds,
  },
  socialProviders:
    Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          if ("username" in user && typeof user.username === "string" && user.username.trim()) {
            return;
          }

          const username = await generateUniqueUsername(user.name);
          return {
            data: {
              ...user,
              username,
            },
          };
        },
      },
    },
    session: {
      create: {
        async before(session) {
          await requireActiveUser(session.userId);
        },
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secondaryStorage,
  user: {
    modelName: "users",
    fields: {
      emailVerified: "emailVerified",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      preferredLanguage: {
        type: "string",
        required: true,
        defaultValue: "es",
      },
      role: {
        type: "string",
        required: true,
        defaultValue: "user",
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "active",
      },
    },
  },
  account: {
    modelName: "accounts",
    encryptOAuthTokens: true,
    fields: {
      accountId: "accountId",
      providerId: "providerId",
      userId: "userId",
      accessToken: "accessToken",
      refreshToken: "refreshToken",
      idToken: "idToken",
      accessTokenExpiresAt: "accessTokenExpiresAt",
      refreshTokenExpiresAt: "refreshTokenExpiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  session: {
    modelName: "sessions",
    storeSessionInDatabase: false,
    preserveSessionInDatabase: false,
    fields: {
      userId: "userId",
      expiresAt: "expiresAt",
      ipAddress: "ipAddress",
      userAgent: "userAgent",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  plugins: [
    nextCookies(),
    magicLink({
      expiresIn: authMagicLinkExpiresInSeconds,
      rateLimit: {
        window: 60,
        max: 5,
      },
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: authEmailOtpExpiresInSeconds,
      allowedAttempts: 5,
      overrideDefaultEmailVerification: true,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendEmailOtp({ email, otp, type });
      },
    }),
  ],
});
