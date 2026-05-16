// api/logger.js
// Logger ringan untuk Vercel serverless.
// Tujuan:
// - mencatat request
// - mencatat error
// - mencatat event AI fallback
// - console log tetap bersih

function cleanMeta(meta) {
  try {
    if (!meta) return null;
    const out = {};
    for (const [k, v] of Object.entries(meta)) {
      // batasi ukuran log untuk mencegah output besar
      if (typeof v === 'string') out[k] = v.slice(0, 400);
      else out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

export function logRequest({ ip, path, method, bodySummary } = {}) {
  // Hindari dump body penuh (sensitif)
  const meta = cleanMeta({ ip, path, method, bodySummary });
  console.log('[request]', meta);
}

export function logError({ message, ip, path, method, err } = {}) {
  const meta = cleanMeta({ ip, path, method, message });
  // error object bisa punya stack; tapi di serverless stack cukup untuk debug.
  console.error('[error]', meta, err?.message || err);
}

export function logAIFallback({ reason, matchedIntent } = {}) {
  const meta = cleanMeta({ reason, matchedIntent });
  console.warn('[ai-fallback]', meta);
}

