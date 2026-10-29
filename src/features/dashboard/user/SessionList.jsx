"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/app/user/profile/actions";
import { notify } from "@/lib/toast/notify";

const WHEN = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });

export function SessionList({ sessions }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(action, ...args) {
    start(async () => {
      const result = await action(...args);
      if (result.status === "success") notify("sessionRevoked");
      else notify(result.code === "denied" ? "signInRequired" : result.code === "rate" ? "rateLimited" : "adminFailed");
      router.refresh();
    });
  }

  const others = sessions.filter((session) => !session.current);

  return (
    <div className="dash-session-list">
      <ul className="dash-session-items">
        {sessions.map((session) => (
          <li key={session.id} className="dash-session">
            <div>
              <strong>{session.device}</strong>{" "}
              {session.current ? <span className="dash-badge">This device</span> : null}
              <p className="dash-muted">Signed in {WHEN.format(new Date(session.createdAt))} (Eastern)</p>
            </div>
            {session.current ? null : (
              <button className="dash-link-button" type="button" disabled={pending} onClick={() => run(revokeSessionAction, session.id)} aria-label={`Sign out ${session.device}`}>
                {pending ? "Working…" : "Sign out"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {others.length > 0 ? (
        <div className="dash-form-actions">
          <button className="button button-small button-outline" type="button" disabled={pending} onClick={() => run(revokeOtherSessionsAction)}><span>Sign out all other devices</span></button>
        </div>
      ) : (
        <p className="dash-muted">You are signed in on this device only.</p>
      )}
    </div>
  );
}
