"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAdminPermissionsAction } from "@/app/super-admin/permissions/actions";
import { ADMIN_CAPABILITIES, ADMIN_CAPABILITY_GROUPS, defaultGrants, describeEffectiveGrants, groupOf, resolveGrants } from "@/config/admin-capabilities";
import { ROUTES } from "@/config/routes";
import { notify } from "@/lib/toast/notify";

const isView = (id) => id === `${groupOf(id)}.view`;

// The Super Admin switches for Admin users. Page ("view") switches are shown first in each group; turning a
// page off greys out and turns off its actions. Nothing is saved until "Save changes", which needs a recent
// authenticator code (asked inline when needed). The server validates everything again.
export function PermissionMatrix({ initial }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [grants, setGrants] = useState(initial);
  const [pending, start] = useTransition();
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const changedIds = useMemo(() => ADMIN_CAPABILITIES.filter((id) => grants[id] !== saved[id]), [grants, saved]);
  const review = useMemo(() => describeEffectiveGrants(resolveGrants(grants)), [grants]);

  function toggle(id) {
    setGrants((current) => ({ ...current, [id]: !current[id] }));
    setMessage("");
  }

  function save() {
    setMessage("");
    start(async () => {
      const result = await saveAdminPermissionsAction(grants);
      if (result.status === "success") {
        setSaved(result.grants);
        setGrants(result.grants);
        setNeedsCode(false);
        setCode("");
        notify("permissionsSaved");
        router.refresh();
        return;
      }
      if (result.code === "step_up_required") { setNeedsCode(true); notify("stepUpNeeded"); return; }
      setMessage(result.message);
      notify(result.code === "denied" ? "adminDenied" : result.code === "rate" ? "rateLimited" : "adminFailed");
    });
  }

  function confirmAndSave() {
    const clean = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) { setMessage("Enter the 6-digit code from your authenticator app."); return; }
    start(async () => {
      try {
        const response = await fetch(`${ROUTES.auth}/two-factor/verify-totp`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: clean }) });
        if (!response.ok) {
          setMessage(response.status === 429 ? "Too many attempts. Wait a moment and try again." : "That code was not accepted. Check it and try again.");
          notify(response.status === 429 ? "rateLimited" : "twoFactorInvalid");
          return;
        }
      } catch {
        notify("network");
        return;
      }
      save();
    });
  }

  return (
    <div className="dash-form dash-permissions">
      {ADMIN_CAPABILITY_GROUPS.map((group) => {
        const viewId = `${group.key}.view`;
        const groupHasView = group.capabilities.some((capability) => capability.id === viewId);
        const viewOn = !groupHasView || grants[viewId];
        return (
          <fieldset className="dash-fieldset" key={group.key}>
            <legend>{group.label}</legend>
            {group.routes.length > 0 ? <p className="dash-form-note">Pages: {group.routes.map((route) => <code key={route}>{route}</code>).reduce((all, element) => (all.length ? [...all, ", ", element] : [element]), [])}</p> : <p className="dash-form-note">No page; API only.</p>}
            <div className="dash-check-grid">
              {group.capabilities.map((capability) => {
                const disabled = !isView(capability.id) && groupHasView && !viewOn;
                return (
                  <label className={`dash-check dash-capability${disabled ? " is-disabled" : ""}`} key={capability.id}>
                    <input type="checkbox" checked={Boolean(grants[capability.id]) && !disabled} disabled={disabled || pending} onChange={() => toggle(capability.id)} aria-describedby={`${capability.id}-d`} />
                    {" "}<strong>{capability.label}</strong>
                    <small id={`${capability.id}-d`} className="dash-muted"> {capability.description}</small>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="dash-fieldset">
        <legend>What an Admin can do with these choices</legend>
        <ul className="dash-review">
          {review.map((group) => (
            <li key={group.key}>
              <strong>{group.label}:</strong>{" "}
              {group.allowed.length ? group.allowed.join(", ") : <span className="dash-muted">nothing</span>}
              {group.denied.length ? <span className="dash-muted"> (switched off: {group.denied.join(", ")})</span> : null}
            </li>
          ))}
        </ul>
      </fieldset>

      {needsCode ? (
        <div className="dash-confirm" role="group" aria-label="Confirm with your authenticator code">
          <p>To protect this page, confirm with the 6-digit code from your authenticator app.</p>
          <div className="dash-field">
            <label htmlFor="permissions-code">Authenticator code</label>
            <input id="permissions-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(event) => setCode(event.target.value)} />
          </div>
          <div className="dash-form-actions">
            <button className="button button-small" type="button" disabled={pending} onClick={confirmAndSave}><span>{pending ? "Saving…" : "Confirm and save"}</span></button>
            <button className="button button-small button-outline" type="button" disabled={pending} onClick={() => { setNeedsCode(false); setCode(""); setMessage(""); }}><span>Cancel</span></button>
          </div>
        </div>
      ) : null}

      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      <p className="dash-form-note" role="status">{changedIds.length === 0 ? "No unsaved changes." : `${changedIds.length} unsaved change${changedIds.length === 1 ? "" : "s"}.`}</p>
      <div className="dash-form-actions">
        <button className="button" type="button" disabled={pending || changedIds.length === 0 || needsCode} onClick={save}><span>{pending ? "Saving…" : "Save changes"}</span></button>
        <button className="button button-outline" type="button" disabled={pending || changedIds.length === 0} onClick={() => { setGrants(saved); setNeedsCode(false); setMessage(""); }}><span>Discard changes</span></button>
        <button className="dash-link-button" type="button" disabled={pending} onClick={() => { setGrants(defaultGrants()); setMessage(""); }}>Switch everything on</button>
      </div>
    </div>
  );
}
