import { NextResponse } from "next/server"

import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { readUpload } from "@/lib/storage"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await safeAuth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const { id } = await params
  const file = await db.file.findFirst({ where: { id, userId: session.user.id } })
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 })

  try {
    const content = await readUpload(file.storageKey)
    return new NextResponse(content, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      },
    })
  } catch {
    return NextResponse.json({ error: "The file content is unavailable." }, { status: 404 })
  }
}
