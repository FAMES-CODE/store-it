import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { removeUpload, saveUpload } from "@/lib/storage"

const MAX_FILE_SIZE = 50 * 1024 * 1024

async function currentUserId() {
  const session = await safeAuth()
  return session?.user?.id
}

export async function GET(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const folderId = new URL(request.url).searchParams.get("folderId")
  const files = await db.file.findMany({
    where: { userId, folderId: folderId || null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, originalName: true, mimeType: true, size: true, createdAt: true, folderId: true },
  })
  return NextResponse.json({ files: files.map((file) => ({ ...file, size: file.size.toString() })) })
}

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const formData = await request.formData()
  const upload = formData.get("file")
  const folderId = formData.get("folderId")

  if (!(upload instanceof File) || upload.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 })
  }
  if (upload.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Files cannot exceed 50 MB." }, { status: 400 })
  }
  if (folderId !== null && (typeof folderId !== "string" || !folderId)) {
    return NextResponse.json({ error: "Invalid folder." }, { status: 400 })
  }
  if (typeof folderId === "string" && folderId) {
    const folder = await db.folder.findFirst({ where: { id: folderId, userId }, select: { id: true } })
    if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 })
  }

  const storageKey = randomUUID()
  await saveUpload(storageKey, await upload.arrayBuffer())

  try {
    const file = await db.$transaction(async (tx) => {
      const createdFile = await tx.file.create({
        data: {
          name: upload.name,
          originalName: upload.name,
          mimeType: upload.type || "application/octet-stream",
          size: BigInt(upload.size),
          storageKey,
          userId,
          folderId: typeof folderId === "string" && folderId ? folderId : null,
        },
      })
      await tx.user.update({ where: { id: userId }, data: { storageUsed: { increment: BigInt(upload.size) } } })
      return createdFile
    })
    return NextResponse.json({ file: { ...file, size: file.size.toString() } }, { status: 201 })
  } catch (error) {
    await removeUpload(storageKey)
    throw error
  }
}

export async function DELETE(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing file ID." }, { status: 400 })

  const file = await db.file.findFirst({ where: { id, userId } })
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 })

  await db.$transaction([
    db.file.delete({ where: { id: file.id } }),
    db.user.update({ where: { id: userId }, data: { storageUsed: { decrement: file.size } } }),
  ])
  await removeUpload(file.storageKey)
  return NextResponse.json({ ok: true })
}
