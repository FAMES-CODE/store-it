import { NextResponse } from "next/server"
import { z } from "zod"

import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"

const folderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required.").max(120),
  parentId: z.string().cuid().nullable().optional(),
})

const folderUpdateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1, "Folder name is required.").max(120),
})

async function currentUserId() {
  const session = await safeAuth()
  return session?.user?.id
}

export async function GET(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const parentId = new URL(request.url).searchParams.get("parentId")
  const folders = await db.folder.findMany({
    where: { userId, parentId: parentId || null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true, createdAt: true, updatedAt: true },
  })
  return NextResponse.json({ folders })
}

export async function POST(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const parsed = folderSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 400 })

  if (parsed.data.parentId) {
    const parent = await db.folder.findFirst({ where: { id: parsed.data.parentId, userId }, select: { id: true } })
    if (!parent) return NextResponse.json({ error: "Parent folder not found." }, { status: 404 })
  }

  const folder = await db.folder.create({ data: { ...parsed.data, userId } })
  return NextResponse.json({ folder }, { status: 201 })
}

export async function PATCH(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const parsed = folderUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 400 })

  const result = await db.folder.updateMany({ where: { id: parsed.data.id, userId }, data: { name: parsed.data.name } })
  if (!result.count) return NextResponse.json({ error: "Folder not found." }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const userId = await currentUserId()
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

  const id = new URL(request.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing folder ID." }, { status: 400 })

  const result = await db.folder.deleteMany({ where: { id, userId } })
  if (!result.count) return NextResponse.json({ error: "Folder not found." }, { status: 404 })
  return NextResponse.json({ ok: true })
}
