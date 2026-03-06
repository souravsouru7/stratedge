// ─────────────────────────────────────────────────────────
//  CENTRAL API CONFIGURATION
//  To switch between production and localhost, just change
//  the NEXT_PUBLIC_API_URL in your .env.local file:
//
//  Production:  NEXT_PUBLIC_API_URL=https://api.stratedge.live
//  Local dev:   NEXT_PUBLIC_API_URL=http://localhost:5000
//
//  Or simply change the fallback URL below if not using .env
// ─────────────────────────────────────────────────────────

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.stratedge.live";

export const API_URL = `${API_BASE_URL}/api`;
