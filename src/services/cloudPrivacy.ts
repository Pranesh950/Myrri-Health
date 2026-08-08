/**
 * Best-effort removal of common direct identifiers before health or nutrition
 * context leaves the device. This is not a guarantee of anonymity.
 */
export function scrubForCloud(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gi, "[email removed]")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]")
    .replace(/\b(?:\+?\d[\d .()\-]{7,}\d)\b/g, "[phone removed]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[network address removed]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "[identifier removed]")
    .replace(/\b(?:ssn|social security(?: number)?)\s*[:#-]?\s*[\d-]+\b/gi, "[government id removed]")
    .replace(/\b(?:my full name is|my name is|full name)\s*[:\-]?\s*[^,.!?\n]+/gi, "[name removed]")
    .replace(/\b(?:my address is|home address|street address)\s*[:\-]?\s*[^.!?\n]+/gi, "[address removed]");
}
