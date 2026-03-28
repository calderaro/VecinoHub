export const authSelectors = {
  loginEmail: "auth-login-email",
  loginPassword: "auth-login-password",
  loginSubmit: "auth-login-submit",
  loginError: "auth-login-error",
  loginMagicLink: "auth-login-magic-link",
  loginNotice: "auth-login-notice",
  registerName: "auth-register-name",
  registerEmail: "auth-register-email",
  registerPassword: "auth-register-password",
  registerSubmit: "auth-register-submit",
  registerOtp: "auth-register-otp",
  registerOtpVerify: "auth-register-otp-verify",
  registerOtpResend: "auth-register-otp-resend",
  registerOtpBack: "auth-register-otp-back",
  registerVerificationEmail: "auth-register-verification-email",
  forgotPasswordEmail: "forgot-password-email",
  forgotPasswordRequest: "forgot-password-request",
  forgotPasswordOtp: "forgot-password-otp",
  forgotPasswordNewPassword: "forgot-password-new-password",
  forgotPasswordConfirmPassword: "forgot-password-confirm-password",
  forgotPasswordSubmit: "forgot-password-submit",
  forgotPasswordBack: "forgot-password-back",
  forgotPasswordBackLogin: "forgot-password-back-login",
  socialGoogle: "auth-social-google",
};

export const shellSelectors = {
  userMenuTrigger: "user-menu-trigger",
  userMenuSignOut: "user-menu-signout",
  dashboardNoGroupState: "dashboard-no-group-state",
  dashboardNoGroupSignout: "dashboard-no-group-signout",
  dashboardOverviewRoot: "dashboard-overview-root",
  navMembers: "nav-members",
  navPolls: "nav-polls",
  navFundraising: "nav-fundraising",
  navEvents: "nav-events",
  navPosts: "nav-posts",
};

export const adminSelectors = {
  groupsTable: "admin-groups-table",
  pollsTable: "admin-polls-table",
  fundraisingTable: "admin-fundraising-table",
  eventsTable: "admin-events-table",
  postsTable: "admin-posts-table",
  usersTable: "admin-users-table",
};

export const platformSelectors = {
  neighborhoodsForm: "platform-neighborhood-create-form",
  usersRoot: "platform-users-root",
  userDetailRoot: "platform-user-detail-root",
};
