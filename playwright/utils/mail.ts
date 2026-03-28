export function expectMailCaptureConfigured() {
  if (!process.env.PLAYWRIGHT_MAILBOX_MODE) {
    throw new Error(
      "PLAYWRIGHT_MAILBOX_MODE is not configured. Set up a mailbox adapter before implementing OTP or magic-link E2E flows."
    );
  }
}

export function extractOtpFromText(message: string) {
  const match = message.match(/\b(\d{6})\b/);
  return match?.[1] ?? null;
}
