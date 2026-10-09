// Just enough of the .xlsx format to export the product sheets and read them back after editing in
// Excel, Google Sheets or Numbers. Writing uses an uncompressed zip; reading also handles deflate.

export type Cell = string | number | null;
export interface Sheet {
  name: string;
  rows: Cell[][];
  /** Column widths in characters. */
  widths?: number[];
}

const enc = new TextEncoder();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, f.data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + f.data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const colName = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Sheet names: max 31 characters, none of []:*?/\ and unique. */
export const safeSheetName = (s: string) => s.replace(/[[\]:*?/\\]/g, '-').slice(0, 31) || 'Sheet';

export function writeXlsx(sheets: Sheet[]): Blob {
  const sheetXml = (sh: Sheet) => {
    const cols = sh.widths?.length ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const rows = sh.rows
      .map((r, ri) => {
        const cells = r
          .map((v, ci) => {
            if (v === null || v === '') return '';
            const ref = `${colName(ci)}${ri + 1}`;
            return typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
          })
          .join('');
        return `<row r="${ri + 1}">${cells}</row>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`;
  };
  const files = [
    {
      name: '[Content_Types].xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) })),
  ];
  const bytes = zip(files.map((f) => ({ name: f.name, data: enc.encode(f.text) })));
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const buf = await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(buf);
}

async function unzip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error('not-xlsx');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('not-xlsx');
    const method = v.getUint16(p + 10, true);
    const csize = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + csize);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, await inflate(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const els = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS('*', tag));
const colIndex = (ref: string) => {
  const letters = ref.replace(/[0-9]/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Read every sheet of an .xlsx file as rows of plain values. */
export async function readXlsx(file: Blob): Promise<Sheet[]> {
  const files = await unzip(await file.arrayBuffer());
  const dec = new TextDecoder();
  const xml = (name: string) => {
    const f = files.get(name);
    return f ? new DOMParser().parseFromString(dec.decode(f), 'application/xml') : null;
  };
  const wb = xml('xl/workbook.xml');
  if (!wb) throw new Error('not-xlsx');
  const rels = new Map<string, string>();
  for (const r of els(xml('xl/_rels/workbook.xml.rels') ?? wb, 'Relationship')) {
    const target = r.getAttribute('Target') ?? '';
    rels.set(r.getAttribute('Id') ?? '', target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const shared = els(xml('xl/sharedStrings.xml') ?? wb, 'si').map((si) => els(si, 't').map((t) => t.textContent ?? '').join(''));
  const out: Sheet[] = [];
  for (const sh of els(wb, 'sheet')) {
    const rid = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? sh.getAttribute('r:id') ?? '';
    const doc = xml(rels.get(rid) ?? '');
    if (!doc) continue;
    const rows: Cell[][] = [];
    for (const row of els(doc, 'row')) {
      const ri = Number(row.getAttribute('r') ?? rows.length + 1) - 1;
      const cells: Cell[] = [];
      els(row, 'c').forEach((c, i) => {
        const ref = c.getAttribute('r');
        const ci = ref ? colIndex(ref) : i;
        const type = c.getAttribute('t');
        const v = els(c, 'v')[0]?.textContent ?? '';
        let val: Cell;
        if (type === 's') val = shared[Number(v)] ?? '';
        else if (type === 'inlineStr') val = els(c, 't').map((t) => t.textContent ?? '').join('');
        else if (type === 'str' || type === 'e') val = v;
        else if (type === 'b') val = v === '1' ? 'TRUE' : 'FALSE';
        else val = v === '' ? null : Number(v);
        cells[ci] = val;
      });
      rows[ri] = Array.from(cells, (x) => x ?? null);
    }
    out.push({ name: sh.getAttribute('name') ?? '', rows: Array.from(rows, (r) => r ?? []) });
  }
  return out;
}
