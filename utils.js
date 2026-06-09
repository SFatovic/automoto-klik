const jsonCache = new Map();

async function fetchJson(path) {
  if (jsonCache.has(path)) {
    return jsonCache.get(path);
  }

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Greška pri učitavanju: ${path} (status ${response.status})`);
  }

  const data = await response.json();
  jsonCache.set(path, data);

  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function refreshLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
