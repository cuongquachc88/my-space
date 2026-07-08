export function renderMarkdown(md: string): string {
  let html = md

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${escapeHtml(code.trim()).replace(/\n/g, '\x00')}</code></pre>`)

  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  html = html.replace(/\son\w+(?:="[^"]*"|='[^']*'|=[^\s>]*)?/gi, '')

  const lines = html.split('\n')
  const out: string[] = []
  let inUl = false, inOl = false, inBq = false
  let tableBuffer: string[] = []

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }
  const closeBq = () => { if (inBq) { out.push('</blockquote>'); inBq = false } }

  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer.forEach(r => out.push(`<p>${inlineMarkdown(r)}</p>`)); tableBuffer = []; return }
    const headers = splitRow(tableBuffer[0])
    let t = '<table><thead><tr>' + headers.map(h => `<th>${inlineMarkdown(h)}</th>`).join('') + '</tr></thead><tbody>'
    for (const row of tableBuffer.slice(2)) {
      t += '<tr>' + splitRow(row).map(c => `<td>${inlineMarkdown(c)}</td>`).join('') + '</tr>'
    }
    out.push(t + '</tbody></table>')
    tableBuffer = []
  }

  for (const raw of lines) {
    if (raw.includes('|') && !raw.startsWith('<pre>')) {
      const tr = raw.trim()
      if (/^\|?\s*[-:]+\s*\|/.test(tr) && tableBuffer.length === 1) { tableBuffer.push(raw); continue }
      if (/^\|/.test(tr) || (tableBuffer.length > 0 && tr.includes('|'))) { tableBuffer.push(raw); continue }
    }
    if (tableBuffer.length > 0) { closeList(); closeBq(); flushTable() }

    if (/^### /.test(raw)) { closeList(); closeBq(); out.push(`<h3>${inlineMarkdown(raw.slice(4))}</h3>`); continue }
    if (/^## /.test(raw))  { closeList(); closeBq(); out.push(`<h2>${inlineMarkdown(raw.slice(3))}</h2>`); continue }
    if (/^# /.test(raw))   { closeList(); closeBq(); out.push(`<h1>${inlineMarkdown(raw.slice(2))}</h1>`); continue }
    if (/^---+$/.test(raw.trim())) { closeList(); closeBq(); out.push('<hr />'); continue }

    if (/^> /.test(raw)) {
      closeList()
      if (!inBq) { out.push('<blockquote>'); inBq = true }
      out.push(`<p>${inlineMarkdown(raw.slice(2))}</p>`); continue
    }
    if (inBq) closeBq()

    if (/^- \[ \] /.test(raw)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true }
      out.push(`<li class="task-item">${inlineMarkdown(raw.slice(5))}</li>`); continue
    }
    if (/^- \[x\] /i.test(raw)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="task-list">'); inUl = true }
      out.push(`<li class="task-item done">${inlineMarkdown(raw.slice(5))}</li>`); continue
    }

    if (/^\s*- /.test(raw)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${inlineMarkdown(raw.trim().slice(2))}</li>`); continue
    }
    if (/^\s*\d+\. /.test(raw)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol>'); inOl = true }
      out.push(`<li>${inlineMarkdown(raw.trim().replace(/^\d+\. /, ''))}</li>`); continue
    }

    if (raw.startsWith('<pre>') || raw.startsWith('<hr') || raw.startsWith('<table>')) {
      closeList(); closeBq(); out.push(raw); continue
    }
    if (raw.trim() === '') { closeList(); closeBq(); out.push(''); continue }

    closeList(); closeBq()
    out.push(`<p>${inlineMarkdown(raw)}</p>`)
  }

  if (tableBuffer.length > 0) flushTable()
  if (inBq) out.push('</blockquote>')
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')

  return out.join('\n').replace(/\x00/g, '\n')
}

function splitRow(row: string): string[] {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = /^https?:\/\//i.test(href) ? href : '#'
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`
    })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
