import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";

async function dispatch(request) {
  const handler = toNextJsHandler(await getAuth());
  return (handler[request.method] || handler.GET)(request);
}

export const GET = dispatch;
export const POST = dispatch;
