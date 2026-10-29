// Email verification is optional (AUTH_REQUIRE_EMAIL_VERIFICATION, default off).
// When off, an unverified address never blocks sign-in or any protected action.
export function isEmailVerificationSatisfied(user, requireVerification) {
  return !requireVerification || Boolean(user?.emailVerified);
}
