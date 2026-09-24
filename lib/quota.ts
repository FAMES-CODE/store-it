export class StorageQuotaExceededError extends Error {
  constructor() {
    super("Storage quota exceeded. Delete files or upgrade your plan to upload more.")
    this.name = "StorageQuotaExceededError"
  }
}
