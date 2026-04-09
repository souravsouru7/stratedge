function normalizeApiBaseUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "https://api.stratedge.live";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }

  return `http://${raw.replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
export const API_URL = `${API_BASE_URL}/api`;
