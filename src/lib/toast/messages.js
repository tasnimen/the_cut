// Central toast copy. Generic wording only: nothing here reveals whether an account exists.
export const TOAST_MESSAGES = Object.freeze({
  signUpSuccess: { type: "success", text: "Your account is ready." },
  signUpCheckInbox: { type: "info", text: "Check your inbox to finish creating your account." },
  signUpFailure: { type: "error", text: "We couldn't create your account. Check the details and try again." },
  signInSuccess: { type: "success", text: "You are signed in." },
  signInFailure: { type: "error", text: "Sign-in failed. Check your email and password and try again." },
  signOutSuccess: { type: "success", text: "You are signed out." },
  signOutFailure: { type: "error", text: "Sign out failed. Try again." },
  passwordResetRequested: { type: "info", text: "If an account exists for that email, a reset link is on its way." },
  passwordResetSuccess: { type: "success", text: "Your password was updated. Sign in with the new password." },
  passwordResetFailure: { type: "error", text: "This reset link is invalid or has expired. Request a new one." },
  twoFactorEnabled: { type: "success", text: "Two-step verification is on. Sign in again with your code." },
  twoFactorInvalid: { type: "error", text: "That code was not accepted. Check it and try again." },
  twoFactorPasswordInvalid: { type: "error", text: "That password was not accepted." },
  copied: { type: "success", text: "Copied." },
  adminSaved: { type: "success", text: "Saved. The public site will show the change shortly." },
  adminDenied: { type: "error", text: "You are not allowed to do that." },
  adminFailed: { type: "error", text: "We could not save that. Check the fields and try again." },
  adminDuplicate: { type: "error", text: "That identifier is already in use." },
  bookingCreated: { type: "success", text: "Your appointment is confirmed." },
  bookingCancelled: { type: "success", text: "Your appointment was cancelled." },
  bookingRescheduled: { type: "success", text: "Your appointment was rescheduled." },
  slotTaken: { type: "error", text: "That time was just taken. Choose another available time." },
  bookingFailure: { type: "error", text: "Your booking could not be completed. Please retry." },
  signInRequired: { type: "info", text: "Sign in to continue." },
  contactSent: { type: "success", text: "Message sent. We'll be in touch." },
  contactFailure: { type: "error", text: "Your message could not be sent. Please try again." },
  uploadFailure: { type: "error", text: "The image could not be uploaded. Check the file and try again." },
  rateLimited: { type: "error", text: "Too many attempts. Please wait a moment and try again." },
  unexpected: { type: "error", text: "Something went wrong. Please try again." },
  network: { type: "error", text: "We couldn't reach the service. Check your connection and retry." },
});

// Maps an HTTP status to a shared toast key so 429 and 5xx wording stays consistent.
export function toastKeyForStatus(status, fallback = "unexpected") {
  if (status === 429) return "rateLimited";
  if (status >= 500) return "unexpected";
  return fallback;
}
