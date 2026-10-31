// One safe log line for an unexpected error: name, code, message and a short stack, with anything that looks like
// an email address or a phone number blanked out. Nothing else (no input, no session, no environment) is logged.
const EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/g;
const NUMBER = /\+?\d[\d\s().-]{6,}\d/g;

const clean = (value, max) => String(value ?? "").replace(EMAIL, "[email]").replace(NUMBER, "[number]").slice(0, max);

export function describeError(error) {
  return {
    name: clean(error?.name || "Error", 60),
    ...(error?.code != null ? { code: clean(error.code, 40) } : {}),
    message: clean(error?.message, 400),
    stack: String(error?.stack ?? "").split("\n").slice(1, 7).map((line) => clean(line, 200).trim()).join(" | "),
  };
}

export function logServerError(scope, error) {
  console.error(`[${scope}] unexpected error`, describeError(error));
}
