import type { AuditResult } from "./types";

const store = new Map<string, { result: AuditResult; expiresAt: number }>();
const TTL_MS = 60 * 60 * 1000; // 1시간

export function saveResult(result: AuditResult): void {
  store.set(result.id, { result, expiresAt: Date.now() + TTL_MS });
  pruneExpired();
}

export function getResult(id: string): AuditResult | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(id); return null; }
  return entry.result;
}

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, e] of store.entries()) {
    if (now > e.expiresAt) store.delete(id);
  }
}
