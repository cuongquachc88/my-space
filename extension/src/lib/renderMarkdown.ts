export function renderMarkdown(md: string): string {
  let html = md

  // Code blocks (must come before inline code)
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${escapeHtml(code.trim()).replace(/\n/g, '\x00')}</code></pre>`)

  // Strip scripts and on* attributes (XSS protection)
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  html = html.replace(/\son\w+(?:="[^"]*"|='[^']*'|=[^\s>]*)?/gi, '')

  // Block elements — process line-by-line
  const lines = html.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false
  let inBq = false

  function closeList() {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  function closeBlockquote() {
    if (inBq) { out.push('</blockquote>'); inBq = false }
  }

  // Collect table rows (pipe-delimited with separator row)
  let tableBuffer: string[] = []

  function flushTable() {
    if (tableBuffer.length < 2) {
      // Not enough rows for a table — emit as paragraphs
      for (const row of tableBuffer) {
        out.push(`<p>${inlineMarkdown(row)}</p>`)
      }
      tableBuffer = []
      return
    }

    const headerCells = splitTableRow(tableBuffer[0])
    // tableBuffer[1] is the separator row (| --- | --- |)
    const bodyRows = tableBuffer.slice(2)

    let table = '<table><thead><tr>'
    for (const cell of headerCells) {
      table += `<th>${inlineMarkdown(cell)}</th>`
    }
    table += '</tr></thead><tbody>'
    for (const row of bodyRows) {
      const cells = splitTableRow(row)
      table += '<tr>'
      for (const cell of cells) {
        table += `<td>${inlineMarkdown(cell)}</td>`
      }
      table += '</tr>'
    }
    table += '</tbody></table>'
    out.push(table)
    tableBuffer = []
  }

  for (const raw of lines) {
    const line = raw

    // Table row detection: contains | and is not inside a code block
    if (line.includes('|') && !line.startsWith('<pre>')) {
      const trimmed = line.trim()
      // Separator row check: | --- | --- |
      if (/^\|?\s*[-:]+\s*\|/.test(trimmed) && tableBuffer.length === 1) {
        tableBuffer.push(line)
        continue
      }
      // Regular table row: starts with | or has | in content
      if (/^\|/.test(trimmed) || (tableBuffer.length > 0 && trimmed.includes('|'))) {
        tableBuffer.push(line)
        continue
      }
    }
    // Flush any pending table when we hit a non-table line
    if (tableBuffer.length > 0) {
      closeList()
      closeBlockquote()
      flushTable()
    }

    // Headings
    if (/^### /.test(line)) { closeList(); closeBlockquote(); out.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`); continue }
    if (/^## /.test(line))  { closeList(); closeBlockquote(); out.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`); continue }
    if (/^# /.test(line))   { closeList(); closeBlockquote(); out.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`); continue }

    // HR
    if (/^---+$/.test(line.trim())) { closeList(); closeBlockquote(); out.push('<hr />'); continue }

    // Blockquote
    if (/^> /.test(line)) {
      closeList()
      if (!inBq) { out.push('<blockquote>'); inBq = true }
      out.push(`<p>${inlineMarkdown(line.slice(2))}</p>`)
      continue
    }
    // Close blockquote on non-blockquote line
    if (inBq && !/^> /.test(line)) {
      closeBlockquote()
    }

    // Task list item: - [ ] or - [x]
    if (/^- \[ \] /.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true }
      out.push(`<li class="task-item">${inlineMarkdown(line.slice(5))}</li>`)
      continue
    }
    if (/^- \[x\] /i.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true }
      out.push(`<li class="task-item done">${inlineMarkdown(line.slice(5))}</li>`)
      continue
    }

    // Unordered list (with optional nesting via indentation)
    if (/^\s*- /.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul>'); inUl = true }
      const content = line.trim().slice(2)
      if (indent >= 2) {
        out.push(`<li class="nested">${inlineMarkdown(content)}</li>`)
      } else {
        out.push(`<li>${inlineMarkdown(content)}</li>`)
      }
      continue
    }

    // Ordered list (with optional nesting via indentation)
    if (/^\s*\d+\. /.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol>'); inOl = true }
      const content = line.trim().replace(/^\d+\. /, '')
      if (indent >= 2) {
        out.push(`<li class="nested">${inlineMarkdown(content)}</li>`)
      } else {
        out.push(`<li>${inlineMarkdown(content)}</li>`)
      }
      continue
    }

    // Pre-rendered block (from code block replacement above)
    if (line.startsWith('<pre>') || line.startsWith('<hr') || line.startsWith('<table>')) {
      closeList(); closeBlockquote(); out.push(line); continue
    }

    // Blank line closes lists, renders as empty
    if (line.trim() === '') {
      closeList(); closeBlockquote(); out.push(''); continue
    }

    // Paragraph
    closeList()
    closeBlockquote()
    out.push(`<p>${inlineMarkdown(line)}</p>`)
  }

  // Flush any remaining table
  if (tableBuffer.length > 0) {
    flushTable()
  }

  if (inBq) out.push('</blockquote>')
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')

  return out.join('\n').replace(/\x00/g, '\n')
}

function splitTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map(c => c.trim())
}

function inlineMarkdown(text: string): string {
  text = text.replace(/<[^>]+>/g, '')
  return text
    .replace(/`([^`]+)`/g,          '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,    '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,        '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = /^https?:\/\//i.test(href) ? href : '#'
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`
    })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
