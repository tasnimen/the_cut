"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction, updateProfileAction } from "@/app/user/profile/actions";
import { ROUTES } from "@/config/routes";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/account/account-input";
import { notify } from "@/lib/toast/notify";

function Field({ id, label, hint, error, children }) {
  return (
    <div className="dash-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
      {error ? <small className="dash-field-error" id={`${id}-error`} role="alert">{error}</small> : null}
    </div>
  );
}

function toastFor(state) {
  if (state.code === "denied") return "signInRequired";
  if (state.code === "rate") return "rateLimited";
  return "adminFailed";
}

export function ProfileForm({ name, email }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProfileAction, { status: "idle" });
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") { notify("profileSaved"); router.refresh(); }
    else if (state.status === "error") notify(toastFor(state));
  }, [state, router]);

  return (
    <form action={formAction} className="dash-form" noValidate>
      <Field id="profile-name" label="Name" error={errors.name}>
        <input id="profile-name" name="name" autoComplete="name" maxLength={80} required defaultValue={state.values?.name ?? name} aria-invalid={errors.name ? "true" : undefined} aria-describedby={errors.name ? "profile-name-error" : undefined} />
      </Field>
      <Field id="profile-email" label="Email" hint="This is your sign-in address. To change it, contact the shop.">
        <input id="profile-email" value={email} readOnly aria-describedby="profile-email-hint" />
      </Field>
      {state.status === "error" && state.message && !state.fieldErrors ? <p className="auth-error" role="alert">{state.message}</p> : null}
      <div className="dash-form-actions">
        <button className="button button-small" type="submit" disabled={pending}><span>{pending ? "Saving…" : "Save changes"}</span></button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(changePasswordAction, { status: "idle" });
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "error") notify(state.code === "wrong_password" ? "twoFactorPasswordInvalid" : toastFor(state));
    if (state.status !== "success") return;
    // The server ended every session when the password changed; clear this browser's cookie and sign in again.
    fetch(`${ROUTES.auth}/sign-out`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: "{}" })
      .catch(() => {})
      .finally(() => { notify("passwordResetSuccess"); router.push(ROUTES.signIn); router.refresh(); });
  }, [state, router]);

  return (
    <form action={formAction} className="dash-form" noValidate>
      <p className="dash-form-note">Changing your password signs you out on every device, including this one.</p>
      <Field id="pw-current" label="Current password" error={errors.currentPassword}>
        <input id="pw-current" name="currentPassword" type="password" autoComplete="current-password" maxLength={PASSWORD_MAX} required aria-invalid={errors.currentPassword ? "true" : undefined} />
      </Field>
      <Field id="pw-new" label="New password" hint={`At least ${PASSWORD_MIN} characters.`} error={errors.newPassword}>
        <input id="pw-new" name="newPassword" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} required aria-invalid={errors.newPassword ? "true" : undefined} />
      </Field>
      <Field id="pw-confirm" label="Confirm new password" error={errors.confirm}>
        <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" maxLength={PASSWORD_MAX} required aria-invalid={errors.confirm ? "true" : undefined} />
      </Field>
      <div className="dash-form-actions">
        <button className="button button-small" type="submit" disabled={pending || state.status === "success"}><span>{pending ? "Updating…" : "Update password"}</span></button>
      </div>
    </form>
  );
}
