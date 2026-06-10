export interface ImportedSecret {
  label: string
  value: string
  tags: string[]
}

export function parseImport(filename: string, content: string): ImportedSecret[] {
  if (filename.endsWith('.json')) return parseBitwarden(content)
  return parseCsv(content)
}

function parseCsv(content: string): ImportedSecret[] {
  const rows = splitCsvRows(content)
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim().toLowerCase())

  if (headers.includes('title') && headers.includes('password')) {
    return parse1Password(headers, rows.slice(1))
  }
  return parseGenericCsv(rows.slice(1))
}

function parse1Password(headers: string[], rows: string[][]): ImportedSecret[] {
  const ti = headers.indexOf('title')
  const pi = headers.indexOf('password')
  const ci = headers.indexOf('category')
  return rows.flatMap(cols => {
    const label = (cols[ti] ?? '').trim()
    const value = (cols[pi] ?? '').trim()
    if (!label || !value) return []
    const tags = ci >= 0 && cols[ci] ? [cols[ci].trim().toLowerCase()] : []
    return [{ label, value, tags }]
  })
}

function parseGenericCsv(rows: string[][]): ImportedSecret[] {
  return rows.flatMap(cols => {
    const label = (cols[0] ?? '').trim()
    const value = (cols[1] ?? '').trim()
    if (!label || !value) return []
    const tagCol = (cols[2] ?? '').trim()
    const tags = tagCol ? tagCol.split(',').map(t => t.trim()).filter(Boolean) : []
    return [{ label, value, tags }]
  })
}

function splitCsvRows(content: string): string[][] {
  const rows: string[][] = []
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue
    rows.push(parseCsvLine(line))
  }
  return rows
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      cols.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur)
  return cols
}

interface BitwardenExport {
  folders?: Array<{ id: string; name: string }>
  items?: Array<{
    name: string
    type: number
    login?: { password?: string } | null
    folderId?: string
  }>
}

function parseBitwarden(content: string): ImportedSecret[] {
  let parsed: BitwardenExport
  try { parsed = JSON.parse(content) } catch { return [] }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []

  const folderMap: Record<string, string> = {}
  for (const f of parsed.folders ?? []) {
    folderMap[f.id] = f.name.toLowerCase()
  }

  return (parsed.items ?? []).flatMap(item => {
    if (item.type !== 1) return []
    const value = item.login?.password ?? ''
    if (!value) return []
    const tags = item.folderId && folderMap[item.folderId] ? [folderMap[item.folderId]] : []
    return [{ label: item.name, value, tags }]
  })
}
