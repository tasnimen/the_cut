// Email verification is optional (AUTH_REQUIRE_EMAIL_VERIFICATION, default off).
// When off, an unverified address never blocks sign-in or any protected action.
export function isEmailVerificationSatisfied(user, requireVerification) {
  return !requireVerification || Boolean(user?.emailVerified);
}

// Better Auth options derived from the flag, so server.js and tests share one definition.
export function emailVerificationAuthOptions(requireVerification) {
  const enabled = Boolean(requireVerification);
  return {
    emailAndPassword: { enabled: true, requireEmailVerification: enabled },
    emailVerification: { sendOnSignUp: enabled, sendOnSignIn: enabled },
  };
}
