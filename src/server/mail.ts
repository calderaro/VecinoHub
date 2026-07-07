import nodemailer from "nodemailer";

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

export function getAppBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getSmtpTransporter() {
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

export function requireSmtpTransporter({
  errorMessage,
  warningPrefix,
}: {
  errorMessage: string;
  warningPrefix: string;
}) {
  const transporter = getSmtpTransporter();

  if (!transporter) {
    if (!warnedMissingSmtp) {
      warnedMissingSmtp = true;
      console.warn(
        `${warningPrefix} email delivery is disabled because SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM.`,
      );
    }

    throw new Error(errorMessage);
  }

  return transporter;
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  errorMessage,
  warningPrefix,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  errorMessage: string;
  warningPrefix: string;
}) {
  const transporter = requireSmtpTransporter({
    errorMessage,
    warningPrefix,
  });

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html,
  });
}

export async function sendGroupInviteEmail({
  email,
  groupName,
  neighborhoodName,
  inviterName,
  role,
  inviteUrl,
  expiresAt,
}: {
  email: string;
  groupName: string;
  neighborhoodName: string;
  inviterName: string;
  role: "group_member" | "group_admin";
  inviteUrl: string;
  expiresAt: Date;
}) {
  const roleLabel = role === "group_admin" ? "group admin" : "group member";
  const expiryLabel = expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await sendMail({
    to: email,
    subject: `You were invited to join ${groupName} on VecinoHub`,
    text: `${inviterName} invited you to join ${groupName} in ${neighborhoodName} as a ${roleLabel}. Review the invite here: ${inviteUrl}. This invite expires on ${expiryLabel}.`,
    html: `<p><strong>${inviterName}</strong> invited you to join <strong>${groupName}</strong> in <strong>${neighborhoodName}</strong> as a <strong>${roleLabel}</strong>.</p><p><a href="${inviteUrl}">Review the invite in VecinoHub</a></p><p>This invite expires on ${expiryLabel}.</p>`,
    errorMessage: "Email delivery is not configured.",
    warningPrefix: "[mail]",
  });
}
