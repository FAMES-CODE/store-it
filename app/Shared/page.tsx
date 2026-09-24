import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, Cloud, Eye, File, HardDrive, Link2, XCircle } from "lucide-react"

import { safeAuth } from "@/lib/auth"
import { db } from "@/lib/db"

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

export default async function SharedPage() {
  const session = await safeAuth()
  if (!session?.user?.id) redirect("/login")

  const links = await db.shareLink.findMany({
    where: { file: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      clickCount: true,
      createdAt: true,
      expiresAt: true,
      file: { select: { name: true, mimeType: true, size: true } },
    },
  })

  const now = new Date()
  const activeCount = links.filter((link) => !link.expiresAt || link.expiresAt > now).length

  return (
    <main className="flex min-h-svh bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/25 p-4 lg:flex">
        <div className="mb-10 flex items-center gap-2 px-2 text-lg font-semibold"><Cloud className="size-6 text-primary" /> Store it</div>
        <p className="mb-3 px-2 text-xs font-semibold tracking-wide text-muted-foreground">WORKSPACE</p>
        <nav className="space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><HardDrive className="size-4" /> All files</Link>
          <Link href="/Shared" className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5 text-sm font-medium shadow-sm"><Link2 className="size-4" /> Shared</Link>
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b px-5 md:px-7"><p className="text-sm text-muted-foreground">Files <span className="mx-2">/</span> <span className="font-medium text-foreground">Shared</span></p><div className="flex items-center gap-3"><Link href="/dashboard" className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium hover:bg-muted"><HardDrive className="size-4" /> <span className="hidden sm:inline">My files</span></Link><span className="grid size-8 place-items-center rounded-full bg-amber-500 text-xs font-semibold text-black">{(session.user.name ?? "U").slice(0, 2).toUpperCase()}</span></div></header>
        <div className="mx-auto max-w-6xl p-5 md:p-7">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Shared links</h1><p className="mt-1 text-sm text-muted-foreground">Track every link you have created and see how it performs.</p></div><div className="rounded-lg border bg-card px-4 py-3 text-sm"><span className="font-semibold">{activeCount}</span> <span className="text-muted-foreground">active of {links.length} links</span></div></div>
          <section className="overflow-hidden rounded-xl border bg-card"><div className="hidden grid-cols-[minmax(0,1fr)_130px_140px_110px] border-b bg-muted/35 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid"><span>File</span><span>Visits</span><span>Expiration</span><span>Status</span></div>{links.map((link) => { const expired = Boolean(link.expiresAt && link.expiresAt <= now); return <div key={link.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b px-4 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_130px_140px_110px] md:px-5"><a href={`/share/${link.token}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 hover:text-primary"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><File className="size-5 text-primary" /></span><span className="min-w-0"><span className="block truncate text-sm font-medium">{link.file.name}</span><span className="block truncate text-xs text-muted-foreground">/share/{link.token}</span></span></a><span className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><Eye className="size-4" /> {link.clickCount}</span><span className="hidden text-sm text-muted-foreground md:block">{link.expiresAt ? formatDate(link.expiresAt) : "Never"}</span><span className={expired ? "inline-flex items-center gap-1.5 text-xs font-medium text-destructive" : "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"}>{expired ? <XCircle className="size-4" /> : <CheckCircle2 className="size-4" />}{expired ? "Expired" : "Active"}</span><span className="col-span-2 mt-2 text-xs text-muted-foreground md:hidden"><Eye className="mr-1 inline size-3" />{link.clickCount} visits · {link.expiresAt ? `Expires ${formatDate(link.expiresAt)}` : "Never expires"}</span></div> })}{!links.length && <div className="px-5 py-16 text-center"><Link2 className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-medium">No shared links yet</h2><p className="mt-1 text-sm text-muted-foreground">Create a link from any file in your dashboard to see it here.</p><Link href="/dashboard" className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to my files</Link></div>}</section>
        </div>
      </section>
    </main>
  )
}
