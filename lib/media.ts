const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".oga": "audio/ogg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".ogv": "video/ogg",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".css": "text/css",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".md": "text/markdown",
  ".txt": "text/plain",
  ".xml": "application/xml",
}

export function browserMimeType(name: string, mimeType: string) {
  const extension = name.includes(".")
    ? `.${name.split(".").pop()?.toLowerCase()}`
    : ""
  return mimeType === "application/octet-stream"
    ? (MIME_TYPES[extension] ?? mimeType)
    : mimeType
}

export function previewKind(name: string, mimeType: string) {
  const browserMime = browserMimeType(name, mimeType)
  if (browserMime.startsWith("image/")) return "image"
  if (browserMime.startsWith("audio/")) return "audio"
  if (browserMime.startsWith("video/")) return "video"
  return "document"
}
