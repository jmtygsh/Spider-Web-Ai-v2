// Purpose:
// Attachment metadata extracted from a Gmail MIME tree.
// Used across the app for TypeScript type checking.
// Data shape: see fields on the type definition below.
export type MailBodyAttachment = {
  id: string;
  name: string;
  sizeLabel: string;
  mimeType?: string;
};

// Purpose:
// Parsed mail body: plain text, optional HTML, and attachment list.
// Used across the app for TypeScript type checking.
// Data shape: see fields on the type definition below.
export type MailBodyContent = {
  plainText: string;
  html?: string;
  attachments: MailBodyAttachment[];
};

type GmailHeader = { name?: string; value?: string };

type GmailPart = {
  mimeType?: string;
  filename?: string;
  partId?: string;
  headers?: GmailHeader[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

type GmailPayload = {
  mimeType?: string;
  filename?: string;
  partId?: string;
  headers?: GmailHeader[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

type GmailMessageLike = {
  body?: unknown;
  snippet?: string;
  payload?: GmailPayload;
  raw?: string;
};

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  const match = headers?.find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  );
  return match?.value?.trim() ?? "";
}

function decodeQuotedPrintable(value: string): string {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

function decodePartContent(data: string, encoding: string): string {
  const encodingLower = encoding.toLowerCase();
  if (encodingLower.includes("quoted-printable")) {
    return decodeQuotedPrintable(data);
  }
  if (encodingLower.includes("base64")) {
    try {
      return decodeBase64Url(data.replace(/\s/g, ""));
    } catch {
      return data;
    }
  }
  return data;
}

function decodePartData(part: GmailPart | GmailPayload): string {
  const data = part.body?.data;
  if (!data?.trim()) return "";

  const encoding = getHeader(part.headers, "Content-Transfer-Encoding");
  let decoded: string;

  try {
    decoded = decodeBase64Url(data);
  } catch {
    decoded = data;
  }

  return decodePartContent(decoded, encoding);
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAttachmentPart(part: GmailPart | GmailPayload): boolean {
  const mimeType = part.mimeType?.toLowerCase() ?? "";
  if (part.filename) return true;
  if (part.body?.attachmentId) return true;
  if (mimeType.startsWith("multipart/")) return false;
  if (mimeType.startsWith("text/")) return false;
  return Boolean(part.body?.data || part.body?.attachmentId);
}

function walkMimeParts(
  node: GmailPart | GmailPayload | undefined,
  plain: string[],
  html: string[],
  attachments: MailBodyAttachment[],
) {
  if (!node) return;

  const mimeType = node.mimeType?.toLowerCase() ?? "";

  if (mimeType.startsWith("multipart/")) {
    for (const part of node.parts ?? []) {
      walkMimeParts(part, plain, html, attachments);
    }
    return;
  }

  if (isAttachmentPart(node)) {
    attachments.push({
      id: node.body?.attachmentId ?? node.partId ?? node.filename ?? "attachment",
      name: node.filename || "Attachment",
      sizeLabel: formatFileSize(node.body?.size),
      mimeType: node.mimeType,
    });
    return;
  }

  const decoded = decodePartData(node);
  if (!decoded.trim()) return;

  if (mimeType.includes("text/plain")) {
    plain.push(decoded);
    return;
  }

  if (mimeType.includes("text/html")) {
    html.push(decoded);
    return;
  }

  if (mimeType.startsWith("text/")) {
    plain.push(decoded);
  }
}

function parseMimeHeaders(headerBlock: string): Map<string, string> {
  const headers = new Map<string, string>();
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, " ");
  const lines = unfolded.split(/\r?\n/);

  for (const line of lines) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const name = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    headers.set(name, value);
  }

  return headers;
}

function extractBoundary(contentType: string): string | undefined {
  const match = /boundary="?([^";\s]+)"?/i.exec(contentType);
  return match?.[1];
}

function splitMimeParts(body: string, boundary: string): string[] {
  const delimiter = `--${boundary}`;
  return body
    .split(delimiter)
    .map((part) => part.trim())
    .filter((part) => part && part !== "--");
}

function parseRawMimePart(
  rawPart: string,
  plain: string[],
  html: string[],
  attachments: MailBodyAttachment[],
) {
  const separator = rawPart.search(/\r?\n\r?\n/);
  if (separator === -1) return;

  const headerBlock = rawPart.slice(0, separator);
  const body = rawPart.slice(separator).replace(/^\r?\n\r?\n/, "");
  const headers = parseMimeHeaders(headerBlock);
  const contentType = headers.get("content-type") ?? "text/plain";
  const mimeType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const encoding = headers.get("content-transfer-encoding") ?? "";
  const filenameMatch = /name="?([^";\n]+)"?/i.exec(contentType);
  const filename = filenameMatch?.[1]?.trim();

  if (mimeType.startsWith("multipart/")) {
    const boundary = extractBoundary(contentType);
    if (!boundary) return;
    for (const nested of splitMimeParts(body, boundary)) {
      parseRawMimePart(nested, plain, html, attachments);
    }
    return;
  }

  const decoded = decodePartContent(body, encoding);

  if (filename && !mimeType.startsWith("text/")) {
    attachments.push({
      id: filename,
      name: filename,
      sizeLabel: formatFileSize(decoded.length),
      mimeType,
    });
    return;
  }

  if (mimeType.includes("text/plain")) {
    plain.push(decoded);
    return;
  }

  if (mimeType.includes("text/html")) {
    html.push(decoded);
  }
}

function walkRawMessage(
  raw: string | undefined,
  plain: string[],
  html: string[],
  attachments: MailBodyAttachment[],
) {
  if (!raw?.trim()) return;

  let decoded = raw;
  try {
    decoded = decodeBase64Url(raw);
  } catch {
    // Already decoded RFC 2822 text.
  }

  const separator = decoded.search(/\r?\n\r?\n/);
  if (separator === -1) return;

  const headerBlock = decoded.slice(0, separator);
  const body = decoded.slice(separator).replace(/^\r?\n\r?\n/, "");
  const headers = parseMimeHeaders(headerBlock);
  const contentType = headers.get("content-type") ?? "text/plain";
  const mimeType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  const encoding = headers.get("content-transfer-encoding") ?? "";

  if (mimeType.startsWith("multipart/")) {
    const boundary = extractBoundary(contentType);
    if (!boundary) return;
    for (const part of splitMimeParts(body, boundary)) {
      parseRawMimePart(part, plain, html, attachments);
    }
    return;
  }

  const decodedBody = decodePartContent(body, encoding);
  if (mimeType.includes("text/html")) html.push(decodedBody);
  else plain.push(decodedBody);
}

// Purpose:
// True when a string looks like HTML markup rather than plain text.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function looksLikeHtml(text: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

// Purpose:
// Strip tags and decode common entities to produce readable plain text from HTML.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ");

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

// Purpose:
// Normalize raw body text — convert HTML to plain text when needed.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function normalizeMailBodyText(raw?: string): string {
  const text = raw?.trim() ?? "";
  if (!text) return "";
  if (looksLikeHtml(text)) return htmlToPlainText(text);
  return text;
}

function pickBestPart(parts: string[]): string | undefined {
  return parts.map((part) => part.trim()).find(Boolean);
}

function dedupeAttachments(items: MailBodyAttachment[]): MailBodyAttachment[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Purpose:
// Extract plain text, HTML, and attachment metadata from Gmail MIME payload or raw RFC 2822.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function extractMailBodyContent(message: GmailMessageLike): MailBodyContent {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];
  const attachments: MailBodyAttachment[] = [];

  walkMimeParts(message.payload, plainParts, htmlParts, attachments);
  walkRawMessage(
    typeof message.raw === "string" ? message.raw : undefined,
    plainParts,
    htmlParts,
    attachments,
  );

  const plainFromParts = pickBestPart(plainParts);
  const htmlFromParts = pickBestPart(htmlParts);

  if (plainFromParts || htmlFromParts) {
    const plainText =
      plainFromParts ?? (htmlFromParts ? htmlToPlainText(htmlFromParts) : "");
    return {
      plainText,
      html: htmlFromParts,
      attachments: dedupeAttachments(attachments),
    };
  }

  if (typeof message.body === "string" && message.body.trim()) {
    const normalized = normalizeMailBodyText(message.body);
    return {
      plainText: normalized,
      html: looksLikeHtml(message.body) ? message.body : undefined,
      attachments: [],
    };
  }

  const snippet = message.snippet?.trim() ?? "";
  return {
    plainText: snippet,
    attachments: [],
  };
}

// Purpose:
// @deprecated Use extractMailBodyContent().plainText.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function extractPlainTextFromGmailMessage(message: GmailMessageLike): string {
  return extractMailBodyContent(message).plainText;
}

// Purpose:
// Split plain body text into paragraph blocks separated by blank lines.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function mailBodyToParagraphs(raw?: string): string[] {
  const text = raw?.trim() ?? "";
  if (!text) return [];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [text];
}

// Purpose:
// Wrap raw HTML in a minimal document with safe styles for iframe preview.
// Runs when UI or server code calls this helper.
// Expected result: value described in the Purpose line above.
export function wrapHtmlEmailDocument(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>
body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;margin:0;padding:0;color:#111;background:#fff;}
img{max-width:100%;height:auto;display:block;}
table{max-width:100% !important;}
a{color:#2563eb;}
</style></head><body>${html}</body></html>`;
}
