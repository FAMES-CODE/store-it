import { NextResponse } from "next/server"

import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createShareToken, expiresAtFromDuration, isShareDuration } from "@/lib/share"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await safeAuth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => null)
  const expiresIn = body?.expiresIn
  if (!isShareDuration(expiresIn)) {
    return NextResponse.json({ error: "Choose how long the link should stay valid." }, { status: 400 })
  }

  const file = await db.file.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 })

  const share = await db.shareLink.create({
    data: {
      token: createShareToken(),
      fileId: file.id,
      expiresAt: expiresAtFromDuration(expiresIn),
    },
    select: { token: true, expiresAt: true },
  })

  return NextResponse.json({
    token: share.token,
    path: `/share/${share.token}`,
    expiresAt: share.expiresAt?.toISOString() ?? null,
  }, { status: 201 })
}
