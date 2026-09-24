import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"
import { z } from "zod"

import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { StorageQuotaExceededError } from "@/lib/quota"
import { removeUpload, saveUpload } from "@/lib/storage"

const MAX_FILE_SIZE = 50 * 1024 * 1024
const fileUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1, "File name is required.").max(255),
})

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
  const uploadSize = BigInt(upload.size)

  try {
    const file = await db.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { storageUsed: true, storageQuota: true },
      })

      if (user.storageUsed + uploadSize > user.storageQuota) {
        throw new StorageQuotaExceededError()
      }

      // The serializable transaction prevents concurrent uploads from overshooting the quota.
      await tx.user.update({ where: { id: userId }, data: { storageUsed: { increment: uploadSize } } })

      const createdFile = await tx.file.create({
        data: {
          name: upload.name,
          originalName: upload.name,
          mimeType: upload.type || "application/octet-stream",
          size: uploadSize,
          storageKey,
          userId,
          folderId: typeof folderId === "string" && folderId ? folderId : null,
        },
      })
      return createdFile
    }, { isolationLevel: "Serializable" })
    return NextResponse.json({ file: { ...file, size: file.size.toString() } }, { status: 201 })
  } catch (error) {
    await removeUpload(storageKey)
    if (error instanceof StorageQuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 413 })
    }
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

export async function PATCH(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const parsed = fileUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 400 })

  const result = await db.file.updateMany({
    where: { id: parsed.data.id, userId },
    data: { name: parsed.data.name },
  })
  if (!result.count) return NextResponse.json({ error: "File not found." }, { status: 404 })
  return NextResponse.json({ ok: true })
}
