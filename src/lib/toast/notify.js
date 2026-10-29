"use client";

import { toast } from "sonner";
import { TOAST_MESSAGES } from "@/lib/toast/messages";

export function notify(key) {
  const message = TOAST_MESSAGES[key] ?? TOAST_MESSAGES.unexpected;
  toast[message.type](message.text, { id: key });
}
