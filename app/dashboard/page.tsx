import { redirect } from "next/navigation"

import { DashboardClient } from "@/components/dashboard-client"
import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function DashboardPage() {
  const session = await safeAuth()
  if (!session?.user?.id) redirect("/login")

  const [folders, files] = await Promise.all([
    db.folder.findMany({
      where: { userId: session.user.id, parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true },
    }),
    db.file.findMany({
      where: { userId: session.user.id, folderId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    }),
  ])

  return (
    <DashboardClient
      name={session.user.name ?? "User"}
      folders={folders}
      files={files.map((file) => ({
        ...file,
        size: file.size.toString(),
        createdAt: file.createdAt.toISOString(),
      }))}
    />
  )
}
