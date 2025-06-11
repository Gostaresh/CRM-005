// src/utils/env.ts
// -----------------------------------------------------------------------------
// Single source of truth for runtime environment variables.
// -----------------------------------------------------------------------------

export const BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''

// export const BASE_URL = ''
