import { createAuthClient } from "better-auth/client";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [magicLinkClient(), emailOTPClient()],
});
