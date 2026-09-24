import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Password must contain at least 8 characters.").max(128),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = registrationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details." }, { status: 400 })
  }

  const email = parsed.data.email.toLowerCase()
  const passwordHash = await bcrypt.hash(parsed.data.password, 12)
  try {
    const user = await db.user.create({
      data: { name: parsed.data.name, email, passwordHash },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account already exists for this email address." }, { status: 409 })
    }

    throw error
  }
}
