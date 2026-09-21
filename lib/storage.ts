import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

const uploadDirectory = path.join(process.cwd(), "uploads")

function uploadPath(storageKey: string) {
  return path.join(uploadDirectory, storageKey)
}

export async function saveUpload(storageKey: string, data: ArrayBuffer) {
  await mkdir(uploadDirectory, { recursive: true })
  await writeFile(uploadPath(storageKey), Buffer.from(data))
}

export function readUpload(storageKey: string) {
  return readFile(uploadPath(storageKey))
}

export async function removeUpload(storageKey: string) {
  await rm(uploadPath(storageKey), { force: true })
}
