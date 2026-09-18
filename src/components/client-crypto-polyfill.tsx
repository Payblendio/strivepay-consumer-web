"use client";

import {ensureClientRandomUUID} from "@/lib/client-id";

ensureClientRandomUUID();

/** Runs before interactive client code on LAN HTTP phones. */
export function ClientCryptoPolyfill() {
  return null;
}
