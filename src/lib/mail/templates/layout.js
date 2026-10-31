// One branded layout for every booking email: table-based (works in Outlook and Gmail), 600 px wide and fluid below
// that, inline styles only (no <style> block, so it also renders in the dev preview under our content security policy),
// explicit background colours on the page and the card so dark-mode "auto invert" clients keep the look, and a
// plain-text twin built from the same parts. Every piece of text that came from a person is escaped here.

const COLORS = Object.freeze({ page: "#041018", card: "#071923", panel: "#0a2029", text: "#f2e8d9", muted: "#a9b8bf", gold: "#dba663", ink: "#1a1208" });

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

// Only http(s) links are ever put in an href.
function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "#";
  } catch {
    return "#";
  }
}

const paragraphHtml = (text) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${COLORS.text}">${escapeHtml(text)}</p>`;

function detailsHtml(rows) {
  if (!rows.length) return "";
  const body = rows.map(([label, value]) => `<tr><td style="padding:8px 0;width:36%;vertical-align:top;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:${COLORS.muted}">${escapeHtml(label)}</td><td style="padding:8px 0;vertical-align:top;font-size:16px;line-height:1.5;color:${COLORS.text}">${escapeHtml(value)}</td></tr>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:${COLORS.panel};border-left:3px solid ${COLORS.gold};border-collapse:separate"><tr><td style="padding:12px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr></table>`;
}

function buttonHtml(button) {
  if (!button) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${COLORS.gold};border-radius:6px"><a href="${escapeHtml(safeUrl(button.url))}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:bold;color:${COLORS.ink};text-decoration:none">${escapeHtml(button.label)}</a></td></tr></table>`;
}

// parts: { brand, preheader, heading, paragraphs[], details[[label,value]], button?, note?, footerLines[] }
export function renderEmail({ brand, preheader = "", heading, paragraphs = [], details = [], button = null, note = "", footerLines = [] }) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${escapeHtml(heading)}</title></head><body style="margin:0;padding:0;background:${COLORS.page};color:${COLORS.text};font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLORS.page}">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COLORS.card};border:1px solid #17313d;border-collapse:separate"><tr><td style="padding:24px 28px 8px"><div style="font-size:12px;letter-spacing:.32em;color:${COLORS.gold};font-weight:bold">${escapeHtml(brand.main)}</div><div style="font-size:10px;letter-spacing:.42em;color:${COLORS.muted}">${escapeHtml(brand.sub)}</div></td></tr><tr><td style="padding:8px 28px 4px"><h1 style="margin:12px 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:normal;color:${COLORS.text}">${escapeHtml(heading)}</h1>${paragraphs.map(paragraphHtml).join("")}${detailsHtml(details)}${buttonHtml(button)}${note ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${COLORS.muted}">${escapeHtml(note)}</p>` : ""}</td></tr><tr><td style="padding:16px 28px 26px;border-top:1px solid #17313d;font-size:12px;line-height:1.7;color:${COLORS.muted}">${footerLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")}</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `${brand.main} ${brand.sub}`,
    "",
    heading,
    "",
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(details.length ? [...details.map(([label, value]) => `${label}: ${value}`), ""] : []),
    ...(button ? [`${button.label}: ${safeUrl(button.url)}`, ""] : []),
    ...(note ? [note, ""] : []),
    "--",
    ...footerLines,
  ].join("\n");

  return { html, text };
}

// The part of a rendered document that can sit inside another page (used by the development preview).
export const bodyFragment = (html) => html.replace(/^[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*$/i, "");
