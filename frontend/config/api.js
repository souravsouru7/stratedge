// ─────────────────────────────────────────────────────────
//  CENTRAL API CONFIGURATION
//  To switch between production and localhost, just change
//  the NEXT_PUBLIC_API_URL in your .env.local file:
//
//  Production:  NEXT_PUBLIC_API_URL=https://api.stratedge.live
//  Local dev:   NEXT_PUBLIC_API_URL=http://localhost:5000
//
//  If NEXT_PUBLIC_API_URL is not set (for example, in production
//  where env vars are misconfigured), we default to the
//  production API URL instead of localhost so live users
//  never accidentally call their own device.
// ─────────────────────────────────────────────────────────

export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.stratedge.live";

export const API_URL = `${API_BASE_URL}/api`;
