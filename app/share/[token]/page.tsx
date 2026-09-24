import Link from "next/link"

import { recordShareVisit } from "@/lib/share"

function fileSize(size: bigint) {
  const bytes = Number(size)
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const share = await recordShareVisit(token)

  if (!share) {
    return (
      <main className="grid min-h-svh place-items-center bg-muted/40 p-6">
        <section className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <p className="mb-2 text-sm font-medium text-primary">Store it</p>
          <h1 className="text-2xl font-semibold">Link unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This share link is invalid or has expired.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-6">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <p className="mb-2 text-sm font-medium text-primary">Store it</p>
        <h1 className="text-2xl font-semibold">Shared file</h1>
        <p className="mt-2 text-sm text-muted-foreground">You can download this file without an account.</p>
        <div className="mt-6 rounded-xl border bg-muted/40 px-4 py-3">
          <p className="truncate font-medium">{share.file.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {fileSize(share.file.size)}
            {share.expiresAt ? ` · Expires ${share.expiresAt.toLocaleString("en-US")}` : ""}
          </p>
        </div>
        <a
          href={`/share/${token}/download`}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
        >
          Download
        </a>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Already have an account? Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}
