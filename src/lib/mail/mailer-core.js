function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function validateAddress(value, label) {
  const address = String(value || "").trim();
  const mailbox = address.match(/<([^<>]+)>$/)?.[1] || address;
  if (/[\r\n]/.test(address) || address.length > 320 || /[<>]/.test(mailbox) || !/^\S+@\S+\.\S+$/.test(mailbox)) {
    throw new Error(`Invalid mail address: ${label}`);
  }
  return address;
}

function contactEmailDocument(brandName, title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#041018;color:#f2e8d9;font-family:Arial,sans-serif"><main style="box-sizing:border-box;width:100%;max-width:600px;margin:0 auto;padding:28px;border:1px solid #174452;border-radius:8px;background:#071923"><p style="margin:0 0 22px;color:#f0c487;font-size:12px;letter-spacing:2px">${escapeHtml(brandName.toUpperCase())}</p><h1 style="margin:0 0 18px;color:#f2e8d9;font-size:26px;line-height:1.2">${escapeHtml(title)}</h1><div style="color:#c5d0d0;font-size:15px;line-height:1.7">${content}</div></main></body></html>`;
}

export function createAuthMailer({ transport, from, alertTo, allowedOrigin }) {
  const sender = validateAddress(from, "sender");
  const alertRecipient = validateAddress(alertTo, "alert recipient");
  const expectedOrigin = new URL(allowedOrigin).origin;

  return {
    async sendVerificationEmail({ to, name, url, testMode = false }) {
      const recipient = validateAddress(to, "verification recipient");
      const verificationUrl = new URL(url);
      if (verificationUrl.origin !== expectedOrigin || !["http:", "https:"].includes(verificationUrl.protocol)) {
        throw new Error("Refusing to send an email with an unexpected verification origin");
      }

      const greeting = name ? `Hello ${String(name).slice(0, 100)},` : "Hello,";
      const link = verificationUrl.toString();
      const testNotice = testMode ? "TEST ONLY: no account was created, and this link is not usable." : "";
      await transport.sendMail({
        from: sender,
        to: recipient,
        subject: testMode ? "[TEST] Email verification delivery | The Cut Barbershop" : "Verify your email | The Cut Barbershop",
        text: `${testNotice ? `${testNotice}\n\n` : ""}${greeting}\n\nConfirm your email address by opening this link. It expires in one hour.\n${link}\n\nIf you did not create an account, you can ignore this message.`,
        html: `${testNotice ? `<p><strong>${escapeHtml(testNotice)}</strong></p>` : ""}<p>${escapeHtml(greeting)}</p><p>Confirm your email address using the link below. It expires in one hour.</p><p><a href="${escapeHtml(link)}">Verify your email</a></p><p>If you did not create an account, you can ignore this message.</p>`,
      });
    },

    async sendPasswordResetEmail({ to, name, url }) {
      const recipient = validateAddress(to, "password reset recipient");
      const resetUrl = new URL(url);
      if (resetUrl.origin !== expectedOrigin || !["http:", "https:"].includes(resetUrl.protocol)) {
        throw new Error("Refusing to send an email with an unexpected password reset origin");
      }
      const greeting = name ? `Hello ${String(name).slice(0, 100)},` : "Hello,";
      const link = resetUrl.toString();
      await transport.sendMail({
        from: sender,
        to: recipient,
        subject: "Reset your password | The Cut Barbershop",
        text: `${greeting}\n\nUse this link to choose a new password. It expires in one hour and works once.\n${link}\n\nIf you did not ask for this, you can ignore this email; your password stays the same.`,
        html: `<p>${escapeHtml(greeting)}</p><p>Use the link below to choose a new password. It expires in one hour and works once.</p><p><a href="${escapeHtml(link)}">Reset your password</a></p><p>If you did not ask for this, you can ignore this email; your password stays the same.</p>`,
      });
    },

    async sendFailedAuthAlert({ ip, userAgent, occurredAt }) {
      const timestamp = new Date(occurredAt).toISOString();
      const sourceIp = String(ip || "unknown").slice(0, 64);
      const agent = String(userAgent || "unknown").slice(0, 512);
      const details = `At: ${timestamp}\nSource IP: ${sourceIp}\nUser agent: ${agent}\n\nFive or more failed sign-in or two-factor attempts were recorded from this IP within ten minutes.`;
      await transport.sendMail({
        from: sender,
        to: alertRecipient,
        subject: "Security alert: repeated failed sign-in attempts | The Cut Barbershop",
        text: details,
        html: `<p>Five or more failed sign-in or two-factor attempts were recorded from one IP within ten minutes.</p><p>${escapeHtml(details).replace(/\n/g, "<br>")}</p>`,
      });
    },
  };
}

export function createContactMailer({ transport, from, alertTo, brandName = "The Cut Barbershop" }) {
  const sender = validateAddress(from, "sender");
  const shopRecipient = validateAddress(alertTo, "contact recipient");

  return Object.freeze({
    async sendNotification({ name, email, message }) {
      const customer = validateAddress(email, "customer email");
      const safeName = String(name).slice(0, 100);
      const safeMessage = String(message).slice(0, 5000);
      const text = `New contact message\n\nName: ${safeName}\nEmail: ${customer}\n\n${safeMessage}`;
      const html = contactEmailDocument(brandName, "New contact message", `<p><strong>Name:</strong> ${escapeHtml(safeName)}</p><p><strong>Email:</strong> ${escapeHtml(customer)}</p><div style="padding:16px;border-left:3px solid #dba663;background:#0a2029">${escapeHtml(safeMessage).replace(/\n/g, "<br>")}</div>`);
      await transport.sendMail({
        from: sender,
        to: shopRecipient,
        replyTo: customer,
        subject: `New contact message | ${brandName}`,
        text,
        html,
      });
    },

    async sendAutoReply({ name, email, message }) {
      const customer = validateAddress(email, "customer email");
      const safeName = String(name).slice(0, 100);
      const greeting = safeName ? `Hello ${safeName},` : "Hello,";
      const text = `${greeting}\n\nThanks for contacting ${brandName}. We received your message and will follow up as soon as we can.\n\nYour message:\n${String(message).slice(0, 5000)}\n\n${brandName}`;
      const html = contactEmailDocument(brandName, "We received your message", `<p>${escapeHtml(greeting)}</p><p>Thanks for contacting ${escapeHtml(brandName)}. We received your message and will follow up as soon as we can.</p><blockquote style="margin:20px 0;padding:16px;border-left:3px solid #dba663;background:#0a2029">${escapeHtml(String(message).slice(0, 5000)).replace(/\n/g, "<br>")}</blockquote><p style="color:#f0c487">${escapeHtml(brandName)}</p>`);
      await transport.sendMail({
        from: sender,
        to: customer,
        subject: `We received your message | ${brandName}`,
        text,
        html,
      });
    },
  });
}

// Booking emails live in lib/mail/booking-mail.js and lib/mail/templates (with a mail log and retries).

export function scheduleMailDelivery({ schedule, send, onFailure }) {
  schedule(async () => {
    try {
      await send();
    } catch {
      try {
        await onFailure();
      } catch {
        // Mail failure must not surface secrets or alter the auth response.
      }
    }
  });
}
