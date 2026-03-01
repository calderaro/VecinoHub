import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, magicLink } from "better-auth/plugins";
import nodemailer from "nodemailer";

import { db } from "@/db";
import * as schema from "@/db/schema";

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
const mailFrom =
  process.env.MAIL_FROM ??
  process.env.EMAIL_FROM ??
  "VecinoHub <no-reply@vecinohub.com>";

let warnedMissingSmtp = false;
let smtpTransporter: nodemailer.Transporter | null = null;

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

async function sendMagicLinkEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  const transporter = getSmtpTransporter();

  if (!transporter) {
    if (!warnedMissingSmtp) {
      warnedMissingSmtp = true;
      console.warn(
        "[auth] Magic link email skipped: SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.",
      );
    }

    console.info(`[auth] Magic link for ${email}: ${url}`);
    return;
  }

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
  const transporter = getSmtpTransporter();

  if (!transporter) {
    if (!warnedMissingSmtp) {
      warnedMissingSmtp = true;
      console.warn(
        "[auth] Password reset email skipped: SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM."
      );
    }

    console.info(`[auth] Password reset link for ${email}: ${url}`);
    return;
  }

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
  const transporter = getSmtpTransporter();
  const purpose =
    type === "forget-password"
      ? "password reset"
      : type === "email-verification"
        ? "email verification"
        : "sign in";

  if (!transporter) {
    if (!warnedMissingSmtp) {
      warnedMissingSmtp = true;
      console.warn(
        "[auth] Email OTP skipped: SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM."
      );
    }

    console.info(`[auth] OTP (${type}) for ${email}: ${otp}`);
    return;
  }

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
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        url,
      });
    },
  },
  socialProviders:
    Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
  rateLimit: { enabled: false },
  advanced: {
    database: {
      generateId: false,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
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
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      },
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendEmailOtp({ email, otp, type });
      },
    }),
  ],
});
