import { NextResponse } from "next/server"

import { findActiveShare } from "@/lib/share"
import { readUpload } from "@/lib/storage"

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const share = await findActiveShare(token)
  if (!share) return NextResponse.json({ error: "This share link is invalid or has expired." }, { status: 404 })

  try {
    const content = await readUpload(share.file.storageKey)
    return new NextResponse(content, {
      headers: {
        "Content-Type": share.file.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(share.file.originalName)}`,
      },
    })
  } catch {
    return NextResponse.json({ error: "The file content is unavailable." }, { status: 404 })
  }
}
