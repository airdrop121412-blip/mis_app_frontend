// ═══════════════════════════════════════════════════════════════
// docToHtml — client-side conversion of .doc / .docx uploads so the
// user can design the EPICAD from a Word document.
//
// .docx is a ZIP of XML: we read word/document.xml and transcribe the
// <w:t> text (plus tables/markup) into HTML.
// .doc (legacy binary OLE) has no standard XML, so we extract the readable
// Unicode text and wrap it in simple paragraphs. For an exact visual match,
// prefer .docx or a hand-authored HTML template.
//
// Returns a best-effort HTML string plus a warning list.
// ═══════════════════════════════════════════════════════════════

export interface DocConvertResult {
  html: string;
  warnings: string[];
}

// Inline-image register filled while parsing document.xml (reserved).
const BODY = 'w\\:body';
const PARAGRAPH = 'w\\:p';
const TABLE = 'w\\:tbl';
const ROW = 'w\\:tr';
const CELL = 'w\\:tc';
const TEXT = 'w\\:t';

// ── .docx extraction (zip → document.xml → HTML) ──────────────
async function convertDocx(file: File, warnings: string[]): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const documentXml = await extractDocxDocumentXml(bytes);
  if (!documentXml) {
    warnings.push('Could not read the .docx document.xml. Using plain text instead.');
    return escapeHtml(await file.text());
  }
  return parseBodyHtml(documentXml, warnings);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function extractDocxDocumentXml(bytes: Uint8Array): Promise<string | null> {
  const decoder = new TextDecoder();
  const b = (idx: number): number => (bytes[idx] ?? 0);
  // Scan local file headers (PK\x03\x04) for the entry named
  // 'word/document.xml'; inflate only that entry's deflate-raw stream.
  let i = 0;
  while (i + 30 <= bytes.length) {
    if (b(i) !== 0x50 || b(i + 1) !== 0x4b ||
        b(i + 2) !== 0x03 || b(i + 3) !== 0x04) {
      i += 1;
      continue;
    }
    const compMethod = b(i + 8) | (b(i + 9) << 8);      // 0 store, 8 deflate
    const nameLen = b(i + 26) | (b(i + 27) << 8);
    const extraLen = b(i + 28) | (b(i + 29) << 8);
    const dataStart = i + 30 + nameLen + extraLen;
    const name = decoder.decode(bytes.subarray(i + 30, i + 30 + nameLen));
    if (name === 'word/document.xml') {
      const raw = bytes.subarray(dataStart);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (compMethod === 0) {
          return decoder.decode(raw);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ds = new (window as any).DecompressionStream('deflate-raw');
        const stream = new Blob([raw.buffer as ArrayBuffer]).stream().pipeThrough(ds);
        const buffer = await new Response(stream).arrayBuffer();
        return decoder.decode(new Uint8Array(buffer));
      } catch {
        return null;
      }
    }
    // Advance past this entry using the compressed size.
    if (compMethod === 8) {
      // compressed size at offset 18
      const compSize = b(i + 18) | (b(i + 19) << 8) |
                       (b(i + 20) << 16) | (b(i + 21) << 24);
      i = dataStart + compSize;
    } else {
      i = dataStart;
    }
  }
  return null;
}

// ── document.xml → HTML ───────────────────────────────────────
function parseBodyHtml(xml: string, warnings: string[]): string {
  const body = first(xml, BODY);
  if (!body) {
    warnings.push('document.xml had no <w:body>.');
    return '';
  }

  const html: string[] = [];

  // Iterate top-level paragraphs and tables.
  const fragment = body.substring(0);
  let pos = 0;
  const tableOpen = `<${TABLE}`;
  const paraOpen = `<${PARAGRAPH}`;
  while (pos < fragment.length) {
    const tableIdx = fragment.indexOf(tableOpen, pos);
    const paraIdx = fragment.indexOf(paraOpen, pos);
    if (tableIdx === -1 && paraIdx === -1) break;
    // pick the nearer one (easier: check table first)
    if (tableIdx !== -1 && tableIdx < paraIdx) {
      const end = findTagEnd(fragment, tableIdx, TABLE);
      if (end > tableIdx) {
        html.push(parseTable(fragment.slice(tableIdx, end)));
        pos = end;
        continue;
      }
    }
    if (paraIdx === -1) break;
    const end = findTagEnd(fragment, paraIdx, PARAGRAPH);
    if (end > paraIdx) {
      const text = extractParaText(fragment.slice(paraIdx, end));
      if (text.trim()) {
        html.push(`<p>${text}</p>`);
      }
      pos = end;
    } else {
      break;
    }
  }

  if (html.length === 0) {
    const allText = collectAllText(body);
    warnings.push('No paragraphs/tables found. Using raw text.');
    return allText.split('\n').filter(Boolean).map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  }

  // Document has placeholders like EP ID, NAME — tell the user these are
  // not auto-bound; they can be matched in the designer's HTML editor.
  return html.join('\n');
}

function extractParaText(paraXml: string): string {
  let out = '';
  const re = new RegExp(`<${TEXT}[^>]*>([^<]*)<\\/${TEXT}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(paraXml)) !== null) {
    out += m[1];
  }
  return out;
}

function parseTable(tblXml: string): string {
  const rows = allMatches(tblXml, `<${ROW}>`, `</${ROW}>`);
  const htmlRows: string[] = [];
  for (const row of rows) {
    const cells = allMatches(row, `<${CELL}>`, `</${CELL}>`);
    const htmlCells = cells.map((cell) => `<td>${collectAllText(cell)}</td>`);
    htmlRows.push(`<tr>${htmlCells.join('')}</tr>`);
  }
  return `<table style="border-collapse:collapse;width:100%;border:1px solid #333">` +
    htmlRows.join('') + `</table>`;
}

// Generic: find the matching close tag for an open tag at `openIdx`.
function findTagEnd(fragment: string, openIdx: number, tag: string): number {
  let depth = 0;
  let i = openIdx;
  const open = `<${tag}`;
  const close = `</${tag}>`;
  while (i < fragment.length) {
    const o = fragment.indexOf(open, i);
    const c = fragment.indexOf(close, i);
    if (o === -1 && c === -1) return -1;
    if (c !== -1 && (o === -1 || c < o)) {
      depth -= 1;
      if (depth <= 0) return c + close.length;
      i = c + close.length;
    } else if (o !== -1) {
      depth += 1;
      i = o + open.length;
    }
  }
  return -1;
}

function first(xml: string, tag: string): string | null {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const o = xml.indexOf(open);
  const c = xml.indexOf(close);
  if (o === -1 || c === -1) return null;
  return xml.slice(o, c + close.length);
}

function collectAllText(xml: string): string {
  let out = '';
  const re = new RegExp(`<${TEXT}[^>]*>([^<]*)<\\/${TEXT}>`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out += m[1];
  return out.trim();
}

function allMatches(xml: string, open: string, close: string): string[] {
  const out: string[] = [];
  let pos = 0;
  while (pos < xml.length) {
    const o = xml.indexOf(open, pos);
    if (o === -1) break;
    const c = xml.indexOf(close, o + open.length);
    if (c === -1) break;
    out.push(xml.slice(o, c + close.length));
    pos = c + close.length;
  }
  return out;
}

// ── .doc legacy binary: extract readable Unicode text ─────────
async function convertDoc(file: File, warnings: string[]): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const b = (idx: number): number => (bytes[idx] ?? 0);
  // Look for UTF-16 LE text runs (common in Word binary files).
  let utf16 = '';
  for (let i = 0; i + 1 < bytes.length && utf16.length < 4000; i += 2) {
    const code = (b(i + 1) << 8) | b(i);
    if ((code >= 32 && code < 127) || code === 10 || code === 13 || code === 9) {
      utf16 += String.fromCharCode(code);
    }
  }
  if (utf16.trim()) {
    warnings.push('Converted a .doc binary file. Text-only layout; formatting may be lost. Prefer .docx or HTML.');
    return utf16
      .split(/\r?\n/)
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join('\n');
  }
  warnings.push('Could not read text from this .doc file. Please use .docx or upload an HTML template.');
  return '';
}

// ── Public entry ───────────────────────────────────────────────
export async function docToHtml(file: File): Promise<DocConvertResult> {
  const warnings: string[] = [];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'docx') {
    return { html: await convertDocx(file, warnings), warnings };
  }
  if (ext === 'doc') {
    return { html: await convertDoc(file, warnings), warnings };
  }
  warnings.push('Only .doc / .docx are auto-converted. Please upload an HTML template or an image instead.');
  return { html: '', warnings };
}

// Re-export for the designer (matches html template placeholders).
export function isHtmlFile(name: string): boolean {
  return /\.(html?|txt)$/i.test(name);
}