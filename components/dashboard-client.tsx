"use client"

import { FormEvent, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { useTheme } from "next-themes"
import {
  Cloud,
  File,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  HardDrive,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Search,
  Share2,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type FolderItem = { id: string; name: string; parentId: string | null }
type FileItem = {
  id: string
  name: string
  mimeType: string
  size: string
  createdAt: string
}
type Target = { kind: "folder" | "file"; item: FolderItem | FileItem }
type ShareDuration = "1h" | "6h" | "1d" | "7d" | "30d"
type Props = {
  name: string
  folders: FolderItem[]
  files: FileItem[]
  storageUsed: string
  storageQuota: string
}

const durations: { value: ShareDuration; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
]
const size = (value: string) => {
  const n = Number(value)
  return n < 1024 ** 2
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : n < 1024 ** 3
      ? `${(n / 1024 ** 2).toFixed(1)} MB`
      : `${(n / 1024 ** 3).toFixed(2)} GB`
}
const icon = (mime: string) =>
  mime.startsWith("image/") ? (
    <FileImage className="size-5 text-violet-500" />
  ) : mime.includes("zip") ? (
    <FileArchive className="size-5 text-emerald-500" />
  ) : mime.includes("pdf") ? (
    <FileText className="size-5 text-rose-500" />
  ) : (
    <File className="size-5 text-blue-500" />
  )

export function DashboardClient({
  name,
  folders: initialFolders,
  files: initialFiles,
  storageUsed: initialStorageUsed,
  storageQuota,
}: Props) {
  const { resolvedTheme, setTheme } = useTheme()
  const [folders, setFolders] = useState(initialFolders),
    [files, setFiles] = useState(initialFiles),
    [used, setUsed] = useState(initialStorageUsed)
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false),
    [rename, setRename] = useState<Target | null>(null),
    [deleting, setDeleting] = useState<Target | null>(null),
    [sharing, setSharing] = useState<FileItem | null>(null)
  const [shareDuration, setShareDuration] = useState<ShareDuration>("1d"),
    [shareUrl, setShareUrl] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)
  const matchingFolders = useMemo(
    () =>
      folders.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    [folders, query]
  )
  const matchingFiles = useMemo(
    () =>
      files.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    [files, query]
  )
  const percent = Math.min(100, (Number(used) / Number(storageQuota)) * 100)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setNotice("")
    try {
      await action()
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setBusy(false)
    }
  }
  async function refresh(folder: FolderItem | null = currentFolder) {
    const [a, b] = await Promise.all([
      fetch(`/api/folders${folder ? `?parentId=${folder.id}` : ""}`),
      fetch(`/api/files${folder ? `?folderId=${folder.id}` : ""}`),
    ])
    if (!a.ok || !b.ok) throw new Error("Unable to refresh this location.")
    setFolders((await a.json()).folders)
    setFiles((await b.json()).files)
  }
  function openFolder(folder: FolderItem | null) {
    setCurrentFolder(folder)
    setQuery("")
    void refresh(folder)
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await run(async () => {
      const r = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          parentId: currentFolder?.id ?? null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await refresh()
      setCreateOpen(false)
      setNotice("Folder created.")
    })
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget,
      upload = fileInput.current?.files?.[0]
    if (!upload) return
    await run(async () => {
      const data = new FormData()
      data.append("file", upload)
      if (currentFolder) data.append("folderId", currentFolder.id)
      const r = await fetch("/api/files", { method: "POST", body: data })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      form.reset()
      await refresh()
      setUsed((value) => (BigInt(value) + BigInt(upload.size)).toString())
      setNotice("File uploaded.")
    })
  }
  async function renameItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rename) return
    const form = new FormData(event.currentTarget)
    await run(async () => {
      const r = await fetch(
        rename.kind === "folder" ? "/api/folders" : "/api/files",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rename.item.id, name: form.get("name") }),
        }
      )
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await refresh()
      setRename(null)
      setNotice(`${rename.kind === "folder" ? "Folder" : "File"} renamed.`)
    })
  }
  async function deleteItem() {
    if (!deleting) return
    await run(async () => {
      const endpoint =
        deleting.kind === "folder" ? "/api/folders" : "/api/files"
      const r = await fetch(`${endpoint}?id=${deleting.item.id}`, {
        method: "DELETE",
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await refresh()
      if (deleting.kind === "file")
        setUsed((value) =>
          (BigInt(value) - BigInt((deleting.item as FileItem).size)).toString()
        )
      setDeleting(null)
      setNotice(`${deleting.kind === "folder" ? "Folder" : "File"} deleted.`)
    })
  }
  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sharing) return
    await run(async () => {
      const r = await fetch(`/api/files/${sharing.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: shareDuration }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setShareUrl(`${window.location.origin}${d.path}`)
    })
  }

  return (
    <main className="flex min-h-svh bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/25 p-4 lg:flex">
        <div className="mb-10 flex items-center gap-2 px-2 text-lg font-semibold">
          <Cloud className="size-6 text-primary" />
          Store it
        </div>
        <p className="mb-3 px-2 text-xs font-semibold tracking-wide text-muted-foreground">
          WORKSPACE
        </p>
        <nav className="space-y-1">
          <button
            onClick={() => openFolder(null)}
            className="flex w-full items-center gap-3 rounded-lg bg-background px-3 py-2.5 text-sm font-medium shadow-sm"
          >
            <HardDrive className="size-4" />
            All files
          </button>
          <Link href="/Shared" className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground">
            <Share2 className="size-4" />
            Shared
          </Link>
        </nav>
        <div className="mt-auto space-y-4">
          <section className="rounded-xl bg-muted p-3">
            <div className="flex justify-between text-xs">
              <span className="font-medium">Storage</span>
              <span className="text-muted-foreground">
                {Math.round(percent)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {size(used)} of {size(storageQuota)} used
            </p>
          </section>
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              {resolvedTheme === "dark" ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              )}
              Appearance
            </span>
            <span className="text-xs text-muted-foreground">
              {resolvedTheme === "dark" ? "Dark" : "Light"}
            </span>
          </button>
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-3 border-b px-4 md:px-6">
          <div className="min-w-0 flex-1 text-sm text-muted-foreground">
            <button
              onClick={() => openFolder(null)}
              className="hover:text-foreground"
            >
              Files
            </button>
            {currentFolder && (
              <>
                <span className="mx-2">/</span>
                <span className="font-medium text-foreground">
                  {currentFolder.name}
                </span>
              </>
            )}
          </div>
          <label className="hidden max-w-xs flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-2 md:flex">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <Button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Moon /> : <Sun />}
          </Button>
          <Button
            onClick={() => signOut({ callbackUrl: "/login" })}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <LogOut />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
          <span className="grid size-8 place-items-center rounded-full bg-amber-500 text-xs font-semibold text-black">
            {name.slice(0, 2).toUpperCase()}
          </span>
        </header>
        <div className="mx-auto max-w-6xl p-5 md:p-7">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">
                {currentFolder?.name ?? "All files"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {matchingFiles.length} files · {matchingFolders.length} folders
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInput.current?.click()}
                className="gap-2"
              >
                <Upload />
                Upload
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus />
                New folder
              </Button>
            </div>
          </div>
          <form onSubmit={upload}>
            <input
              ref={fileInput}
              required
              type="file"
              className="sr-only"
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
          </form>
          {notice && (
            <div
              role="status"
              className="mb-5 flex justify-between rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary"
            >
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          )}
          <section>
            <div className="mb-3 flex justify-between">
              <h2 className="font-semibold">Folders</h2>
              <span className="text-xs text-muted-foreground">Name</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {matchingFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group relative rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <button
                    onClick={() => openFolder(folder)}
                    className="flex w-full flex-col items-center gap-3"
                  >
                    <Folder
                      className="size-11 stroke-[1.5] text-primary"
                      fill="currentColor"
                      fillOpacity=".12"
                    />
                    <span className="w-full truncate text-center text-sm font-medium">
                      {folder.name}
                    </span>
                  </button>
                  <div className="absolute top-2 right-2 hidden group-hover:flex">
                    <button
                      onClick={() =>
                        setRename({ kind: "folder", item: folder })
                      }
                      className="rounded p-1.5 hover:bg-muted"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleting({ kind: "folder", item: folder })
                      }
                      className="rounded p-1.5 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setCreateOpen(true)}
                className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                <Plus className="size-6" />
                New folder
              </button>
            </div>
          </section>
          <section className="mt-9">
            <div className="mb-3 flex justify-between">
              <h2 className="font-semibold">Recent files</h2>
              <span className="text-xs text-muted-foreground">
                {matchingFiles.length} items
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_130px_110px] border-b bg-muted/35 px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
                <span>Name</span>
                <span>Size</span>
                <span>Modified</span>
                <span />
              </div>
              {matchingFiles.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b px-4 py-3.5 last:border-0 sm:grid-cols-[minmax(0,1fr)_120px_130px_110px] sm:px-5"
                >
                  <a
                    href={`/api/files/${file.id}/download`}
                    className="flex min-w-0 items-center gap-3 hover:text-primary"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                      {icon(file.mimeType)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {size(file.size)} ·{" "}
                        {new Date(file.createdAt).toLocaleDateString("en-US")}
                      </span>
                    </span>
                  </a>
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {size(file.size)}
                  </span>
                  <span className="hidden text-sm text-muted-foreground sm:block">
                    {new Date(file.createdAt).toLocaleDateString("en-US")}
                  </span>
                  <span className="flex justify-end">
                    <button
                      onClick={() => {
                        setSharing(file)
                        setShareUrl("")
                      }}
                      className="rounded p-2 hover:bg-muted"
                    >
                      <Share2 className="size-4" />
                    </button>
                    <button
                      onClick={() => setRename({ kind: "file", item: file })}
                      className="rounded p-2 hover:bg-muted"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleting({ kind: "file", item: file })}
                      className="rounded p-2 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </div>
              ))}
              {!matchingFiles.length && (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No files found in this location.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Create a folder
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Add a folder to {currentFolder?.name ?? "your files"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createFolder}>
            <label className="mt-5 grid gap-2 text-sm font-medium">
              Folder name
              <input
                name="name"
                required
                autoFocus
                maxLength={120}
                placeholder="e.g. Design assets"
                className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <DialogFooter>
              <DialogClose className="h-9 rounded-md border px-4 text-sm hover:bg-muted">
                Cancel
              </DialogClose>
              <Button disabled={busy}>Create folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(rename)}
        onOpenChange={(open) => !open && setRename(null)}
      >
        {rename && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Rename {rename.kind}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Choose a clear, descriptive name.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={renameItem}>
              <label className="mt-5 grid gap-2 text-sm font-medium">
                Name
                <input
                  name="name"
                  required
                  autoFocus
                  defaultValue={rename.item.name}
                  maxLength={rename.kind === "folder" ? 120 : 255}
                  className="h-10 rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <DialogFooter>
                <DialogClose className="h-9 rounded-md border px-4 text-sm hover:bg-muted">
                  Cancel
                </DialogClose>
                <Button disabled={busy}>Save changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        {deleting && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Delete {deleting.kind}?
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                “{deleting.item.name}” will be permanently deleted
                {deleting.kind === "folder" ? ", including its contents" : ""}.
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose className="h-9 rounded-md border px-4 text-sm hover:bg-muted">
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={deleteItem}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={Boolean(sharing)}
        onOpenChange={(open) => !open && setSharing(null)}
      >
        {sharing && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Share “{sharing.name}”
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Anyone with the link can download this file until it expires.
              </DialogDescription>
            </DialogHeader>
            {shareUrl ? (
              <div className="mt-5">
                <label className="grid gap-2 text-sm font-medium">
                  Temporary link
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm font-normal"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void navigator.clipboard.writeText(shareUrl)
                        setNotice("Share link copied.")
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </label>
                <DialogFooter>
                  <DialogClose className="h-9 rounded-md border px-4 text-sm hover:bg-muted">
                    Done
                  </DialogClose>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={share}>
                <label className="mt-5 grid gap-2 text-sm font-medium">
                  Link expires after
                  <select
                    value={shareDuration}
                    onChange={(e) =>
                      setShareDuration(e.target.value as ShareDuration)
                    }
                    className="h-10 rounded-md border bg-background px-3 text-sm font-normal"
                  >
                    {durations.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <DialogFooter>
                  <DialogClose className="h-9 rounded-md border px-4 text-sm hover:bg-muted">
                    Cancel
                  </DialogClose>
                  <Button disabled={busy}>Create link</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        )}
      </Dialog>
    </main>
  )
}
