import { randomBytes } from "node:crypto"

import { db } from "@/lib/db"

export const SHARE_DURATIONS = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
} as const

export type ShareDuration = keyof typeof SHARE_DURATIONS

export function isShareDuration(value: unknown): value is ShareDuration {
  return typeof value === "string" && value in SHARE_DURATIONS
}

export function createShareToken() {
  return randomBytes(32).toString("base64url")
}

export function expiresAtFromDuration(duration: ShareDuration) {
  return new Date(Date.now() + SHARE_DURATIONS[duration])
}

export function isShareExpired(expiresAt: Date | null) {
  return expiresAt !== null && expiresAt.getTime() <= Date.now()
}

export async function findActiveShare(token: string) {
  const share = await db.shareLink.findUnique({
    where: { token },
    include: {
      file: {
        select: {
          id: true,
          name: true,
          originalName: true,
          mimeType: true,
          size: true,
          storageKey: true,
        },
      },
    },
  })

  if (!share || isShareExpired(share.expiresAt)) return null
  return share
}

export async function recordShareVisit(token: string) {
  const share = await findActiveShare(token)
  if (!share) return null

  await db.shareLink.update({
    where: { id: share.id },
    data: { clickCount: { increment: 1 } },
  })

  return share
}
