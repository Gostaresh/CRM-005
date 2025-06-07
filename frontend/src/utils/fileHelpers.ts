// src/utils/fileHelpers.ts
// -----------------------------------------------------------------------------
//  Common helpers for file uploads (size check & base64 conversion).
// -----------------------------------------------------------------------------

/** Maximum upload size for note attachments (≈ 330 KB). */
export const MAX_FILE_SIZE = 330 * 1024

/**
 * Convert a File into a base64 string (no data URL prefix).
 * Returns the base64 payload or throws an Error if the file is too large
 * or if the read fails.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      return reject(
        new Error(`حداکثر اندازه فایل ${(MAX_FILE_SIZE / 1024).toFixed(0)} کیلوبایت است`),
      )
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('خواندن فایل با خطا مواجه شد'))
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',').pop() || ''
      resolve(base64)
    }
    reader.readAsDataURL(file)
  })
}
