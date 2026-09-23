"use client"

import { FormEvent, useRef, useState } from "react"
import { signOut } from "next-auth/react"
import { Copy, FileIcon, Folder, FolderPlus, LogOut, Pencil, Share2, Trash2, Upload } from "lucide-react"

type FolderItem = { id: string; name: string; parentId: string | null }
type FileItem = { id: string; name: string; mimeType: string; size: string; createdAt: string }
type ShareDuration = "1h" | "6h" | "1d" | "7d" | "30d"

type DashboardClientProps = {
  name: string
  folders: FolderItem[]
  files: FileItem[]
  storageUsed: string
  storageQuota: string
}

const shareDurations: { value: ShareDuration; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
]

const fileSize = (size: string) => {
  const bytes = Number(size)
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function DashboardClient({ name, folders: initialFolders, files: initialFiles, storageUsed: initialStorageUsed, storageQuota }: DashboardClientProps) {
  const [folders, setFolders] = useState(initialFolders)
  const [files, setFiles] = useState(initialFiles)
  const [storageUsed, setStorageUsed] = useState(initialStorageUsed)
  const [currentFolder, setCurrentFolder] = useState<FolderItem | null>(null)
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [shareFile, setShareFile] = useState<FileItem | null>(null)
  const [shareDuration, setShareDuration] = useState<ShareDuration>("1d")
  const [shareUrl, setShareUrl] = useState("")
  const [shareExpiresAt, setShareExpiresAt] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  async function refresh(folder: FolderItem | null = currentFolder) {
    const suffix = folder ? `?parentId=${folder.id}` : ""
    const [foldersResponse, filesResponse] = await Promise.all([fetch(`/api/folders${suffix}`), fetch(`/api/files${folder ? `?folderId=${folder.id}` : ""}`)])
    if (!foldersResponse.ok || !filesResponse.ok) throw new Error("Unable to load this location.")
    setFolders((await foldersResponse.json()).folders)
    setFiles((await filesResponse.json()).files)
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy(true); setNotice("")
    try {
      const response = await fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), parentId: currentFolder?.id ?? null }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      formElement.reset(); await refresh(); setNotice("Folder created.")
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong.") } finally { setBusy(false) }
  }

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const selectedFile = fileInput.current?.files?.[0]
    if (!selectedFile) return
    setBusy(true); setNotice("")
    try {
      const data = new FormData(); data.append("file", selectedFile); if (currentFolder) data.append("folderId", currentFolder.id)
      const response = await fetch("/api/files", { method: "POST", body: data })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error)
      formElement.reset(); await refresh(); setNotice("File uploaded.")
      setStorageUsed((used) => (BigInt(used) + BigInt(selectedFile.size)).toString())
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong.") } finally { setBusy(false) }
  }

  async function deleteFolder(folder: FolderItem) {
    if (!confirm(`Delete the folder “${folder.name}”?`)) return
    setBusy(true); setNotice("")
    try { const response = await fetch(`/api/folders?id=${folder.id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await refresh(); setNotice("Folder deleted.") } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong.") } finally { setBusy(false) }
  }

  async function renameFolder(folder: FolderItem) {
    const name = prompt("New folder name:", folder.name)?.trim()
    if (!name || name === folder.name) return
    setBusy(true); setNotice("")
    try { const response = await fetch("/api/folders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: folder.id, name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await refresh(); setNotice("Folder renamed.") } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong.") } finally { setBusy(false) }
  }

  async function deleteFile(file: FileItem) {
    if (!confirm(`Delete “${file.name}”?`)) return
    setBusy(true); setNotice("")
    try { const response = await fetch(`/api/files?id=${file.id}`, { method: "DELETE" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await refresh(); setStorageUsed((used) => (BigInt(used) - BigInt(file.size)).toString()); setNotice("File deleted.") } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong.") } finally { setBusy(false) }
  }

  function openShareDialog(file: FileItem) {
    setShareFile(file)
    setShareDuration("1d")
    setShareUrl("")
    setShareExpiresAt("")
    setNotice("")
  }

  function closeShareDialog() {
    setShareFile(null)
    setShareUrl("")
    setShareExpiresAt("")
  }

  async function createShareLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!shareFile) return
    setBusy(true)
    setNotice("")
    try {
      const response = await fetch(`/api/files/${shareFile.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: shareDuration }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setShareUrl(`${window.location.origin}${data.path}`)
      setShareExpiresAt(data.expiresAt ?? "")
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setNotice("Share link copied.")
  }

  async function openFolder(folder: FolderItem | null) { setCurrentFolder(folder); setNotice(""); await refresh(folder) }

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="border-b bg-background"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><div><p className="text-lg font-semibold">Store it</p><p className="text-sm text-muted-foreground">Hello, {name}</p></div><button onClick={() => signOut({ callbackUrl: "/login" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><LogOut className="size-4" /> Sign out</button></div></header>
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">My files</h1><p className="mt-1 text-sm text-muted-foreground">{currentFolder ? `Folder: ${currentFolder.name}` : "Your personal storage"}</p></div>{currentFolder && <button onClick={() => openFolder(null)} className="rounded-md border px-3 py-2 text-sm hover:bg-muted">← Root</button>}</div>
        <section className="mb-6 rounded-xl border bg-card p-4" aria-label="Storage usage">
          <div className="flex items-center justify-between gap-4 text-sm"><span className="font-medium">Storage</span><span className="text-muted-foreground">{fileSize(storageUsed)} of {fileSize(storageQuota)} used</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (Number(storageUsed) / Number(storageQuota)) * 100)}%` }} /></div>
        </section>
        <div className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2"><form onSubmit={createFolder} className="flex gap-2"><input name="name" required maxLength={120} placeholder="New folder name" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" /><button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"><FolderPlus className="size-4" /> Create</button></form><form onSubmit={uploadFile} className="flex gap-2"><input ref={fileInput} required type="file" className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2" /><button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"><Upload className="size-4" /> Upload</button></form></div>
        {notice && <p role="status" className="mb-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p>}
        <section className="overflow-hidden rounded-xl border bg-card"><div className="grid grid-cols-[1fr_auto] border-b px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span>Name</span><span>Actions</span></div>
          {folders.map((folder) => <div key={folder.id} className="grid grid-cols-[1fr_auto] items-center border-b px-5 py-3 last:border-0"><button onClick={() => openFolder(folder)} className="flex min-w-0 items-center gap-3 text-left hover:text-primary"><Folder className="size-5 shrink-0 fill-primary/20 text-primary" /><span className="truncate font-medium">{folder.name}</span></button><span className="flex"><button aria-label={`Rename ${folder.name}`} onClick={() => renameFolder(folder)} className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button><button aria-label={`Delete ${folder.name}`} onClick={() => deleteFolder(folder)} className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></span></div>)}
          {files.map((file) => <div key={file.id} className="grid grid-cols-[1fr_auto] items-center border-b px-5 py-3 last:border-0"><a href={`/api/files/${file.id}/download`} className="flex min-w-0 items-center gap-3 hover:text-primary"><FileIcon className="size-5 shrink-0 text-muted-foreground" /><span className="min-w-0"><span className="block truncate font-medium">{file.name}</span><span className="text-xs text-muted-foreground">{fileSize(file.size)} · {new Date(file.createdAt).toLocaleDateString("en-US")}</span></span></a><span className="flex"><button aria-label={`Share ${file.name}`} onClick={() => openShareDialog(file)} className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Share2 className="size-4" /></button><button aria-label={`Delete ${file.name}`} onClick={() => deleteFile(file)} className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></span></div>)}
          {!folders.length && !files.length && <p className="px-5 py-14 text-center text-sm text-muted-foreground">This location is empty. Create a folder or upload your first file.</p>}
        </section>
      </div>
      {shareFile && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
          <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-lg">
            <h2 id="share-dialog-title" className="text-lg font-semibold">Share “{shareFile.name}”</h2>
            <p className="mt-1 text-sm text-muted-foreground">Anyone with the link can download this file until it expires. No account is required.</p>
            {shareUrl ? (
              <div className="mt-4 space-y-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Temporary link
                  <span className="flex gap-2">
                    <input readOnly value={shareUrl} className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
                    <button type="button" onClick={copyShareUrl} className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted">
                      <Copy className="size-4" /> Copy
                    </button>
                  </span>
                </label>
                {shareExpiresAt && <p className="text-xs text-muted-foreground">Expires {new Date(shareExpiresAt).toLocaleString("en-US")}</p>}
                <button type="button" onClick={closeShareDialog} className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground">Done</button>
              </div>
            ) : (
              <form onSubmit={createShareLink} className="mt-4 space-y-3">
                <label className="grid gap-1.5 text-sm font-medium">
                  Link expires after
                  <select value={shareDuration} onChange={(event) => setShareDuration(event.target.value as ShareDuration)} className="h-10 rounded-md border bg-background px-3 text-sm">
                    {shareDurations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={closeShareDialog} className="h-10 flex-1 rounded-md border text-sm hover:bg-muted">Cancel</button>
                  <button disabled={busy} className="h-10 flex-1 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">Create link</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
