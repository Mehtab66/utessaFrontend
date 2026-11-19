/*
 * Reads the first sheet of a .csv or .xlsx file into rows of text cells (row 0 = headers).
 * .xlsx is unzipped in the browser (DecompressionStream) — no extra library needed.
 */

export async function readSpreadsheet(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsv(await file.text())
  // .xlsx, macro-enabled .xlsm and the template versions share the same workbook format.
  if (/\.(xlsx|xlsm|xltx|xltm)$/.test(name)) return parseXlsx(await file.arrayBuffer())
  // Older binary Excel (.xls), binary workbooks (.xlsb) and OpenDocument (.ods) are read with
  // SheetJS, loaded only when such a file is picked so it doesn't slow down the rest of the app.
  if (/\.(xls|xlsb|ods)$/.test(name)) return parseWithSheetJs(await file.arrayBuffer())
  throw new Error('Choose a CSV or Excel file (.csv, .xlsx, .xls).')
}

export function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  // Excel in some regions saves CSV with semicolons — pick whichever separator the header row uses more.
  const firstLine = src.slice(0, src.search(/\r?\n|$/))
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ','
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

/* ─── .xlsx ─────────────────────────────────────────────────────────────── */

async function unzip(buffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  let eocd = -1
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('This file isn’t a valid .xlsx workbook.')
  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries = {}
  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break
    const method = view.getUint16(p + 10, true)
    const size = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const local = view.getUint32(p + 42, true)
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    entries[name] = { method, size, local }
    p += 46 + nameLen + extraLen + commentLen
  }
  return async (name) => {
    const e = entries[name]
    if (!e) return null
    const start = e.local + 30 + view.getUint16(e.local + 26, true) + view.getUint16(e.local + 28, true)
    const data = bytes.subarray(start, start + e.size)
    if (e.method === 0) return decoder.decode(data)
    if (e.method !== 8) throw new Error('This workbook uses a compression the browser can’t read. Save it as CSV and try again.')
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Response(stream).text()
  }
}

const xml = (text) => new DOMParser().parseFromString(text, 'application/xml')
const tags = (node, name) => Array.from(node.getElementsByTagNameNS('*', name))
const colIndex = (ref) => {
  let n = 0
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

async function parseXlsx(buffer) {
  const read = await unzip(buffer)

  // First sheet in workbook order → its file via the workbook relationships.
  let sheetPath = 'xl/worksheets/sheet1.xml'
  const wb = await read('xl/workbook.xml')
  const rels = await read('xl/_rels/workbook.xml.rels')
  if (wb && rels) {
    const first = tags(xml(wb), 'sheet')[0]
    const rid = first && (first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'))
    const rel = tags(xml(rels), 'Relationship').find((r) => r.getAttribute('Id') === rid)
    if (rel) {
      const target = rel.getAttribute('Target')
      sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    }
  }

  const sharedXml = await read('xl/sharedStrings.xml')
  const shared = sharedXml ? tags(xml(sharedXml), 'si').map((si) => tags(si, 't').map((t) => t.textContent).join('')) : []

  const sheetXml = await read(sheetPath)
  if (!sheetXml) throw new Error('Couldn’t find a worksheet in this workbook.')
  const rows = []
  for (const r of tags(xml(sheetXml), 'row')) {
    const out = []
    let next = 0
    for (const c of tags(r, 'c')) {
      const ref = c.getAttribute('r')
      const idx = ref ? colIndex(ref) : next
      next = idx + 1
      const type = c.getAttribute('t')
      const v = tags(c, 'v')[0]?.textContent ?? ''
      let value
      if (type === 's') value = shared[Number(v)] ?? ''
      else if (type === 'inlineStr') value = tags(c, 't').map((t) => t.textContent).join('')
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE'
      else value = v
      out[idx] = value
    }
    rows.push(Array.from(out, (v) => (v == null ? '' : String(v))))
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

async function parseWithSheetJs(buffer) {
  const XLSX = await import('xlsx')
  let wb
  try {
    wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false, dense: true })
  } catch {
    throw new Error('Couldn’t open this workbook. If it is password-protected, remove the password or save it as .xlsx / CSV and try again.')
  }
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('Couldn’t find a worksheet in this workbook.')
  // raw: false → cells come back as Excel displays them (dates as text, phone numbers without 1.2E+9).
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: false })
  return rows.map((r) => Array.from(r, (v) => (v == null ? '' : String(v)))).filter((r) => r.some((v) => v.trim() !== ''))
}

/* ─── value helpers ─────────────────────────────────────────────────────── */

/** "1990-05-03", "5/3/1990", "05-03-90" or an Excel date number (e.g. 32997) → "1990-05-03". */
export function toIsoDate(v) {
  if (!v) return null
  const s = String(v).trim()
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const serial = Number(s)
    if (serial > 0 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000)
      return d.toISOString().slice(0, 10)
    }
  }
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? (Number(m[3]) > 30 ? `19${m[3]}` : `20${m[3]}`) : m[3]
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** Builds a CSV file from rows and starts the download. */
export function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
