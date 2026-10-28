import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";
import { consumeEmailVerificationToken, dispatchOneTimeEmailVerification } from "@/lib/auth/email-verification-tokens";
import { requireEnv } from "@/config/env";
import { getMongo } from "@/lib/db/mongo";
import { isValidSignInPayload, normalizeSignInFailure, stripSessionTokenFromResponse } from "@/lib/auth/request-security";

async function dispatch(request) {
  const isEmailSignIn = request.method === "POST" && new URL(request.url).pathname.endsWith("/sign-in/email");
  const isEmailVerification = request.method === "GET" && new URL(request.url).pathname.endsWith("/verify-email");
  const startedAt = Date.now();
  if (isEmailSignIn) {
    let body;
    try {
      body = await request.clone().json();
    } catch {
      return Response.json({ message: "Invalid sign-in request" }, { status: 400 });
    }
    if (!isValidSignInPayload(body)) {
      return Response.json({ message: "Invalid sign-in request" }, { status: 400 });
    }
  }
  const auth = await getAuth();
  const handler = toNextJsHandler(auth);
  const runHandler = () => (handler[request.method] || handler.GET)(request);
  let response;
  if (isEmailVerification) {
    const { db } = await getMongo();
    const token = new URL(request.url).searchParams.get("token");
    response = await dispatchOneTimeEmailVerification({
      token,
      consume: (candidate) => consumeEmailVerificationToken(db, candidate, requireEnv("BETTER_AUTH_SECRET")),
      dispatch: runHandler,
    });
  } else {
    response = await runHandler();
  }
  const safeResponse = await stripSessionTokenFromResponse(response);
  return isEmailSignIn ? normalizeSignInFailure(safeResponse, startedAt) : safeResponse;
}

export const GET = dispatch;
export const POST = dispatch;
