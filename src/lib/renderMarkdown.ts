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

  function closeList() {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  for (const raw of lines) {
    const line = raw

    // Headings
    if (/^### /.test(line)) { closeList(); out.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`); continue }
    if (/^## /.test(line))  { closeList(); out.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`); continue }
    if (/^# /.test(line))   { closeList(); out.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`); continue }

    // HR
    if (/^---+$/.test(line.trim())) { closeList(); out.push('<hr />'); continue }

    // Unordered list
    if (/^- /.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul>'); inUl = true }
      out.push(`<li>${inlineMarkdown(line.slice(2))}</li>`)
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol>'); inOl = true }
      out.push(`<li>${inlineMarkdown(line.replace(/^\d+\. /, ''))}</li>`)
      continue
    }

    // Pre-rendered block (from code block replacement above)
    if (line.startsWith('<pre>') || line.startsWith('<hr')) {
      closeList(); out.push(line); continue
    }

    // Blank line closes lists, renders as empty
    if (line.trim() === '') {
      closeList(); out.push(''); continue
    }

    // Paragraph
    closeList()
    out.push(`<p>${inlineMarkdown(line)}</p>`)
  }

  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')

  return out.join('\n').replace(/\x00/g, '\n')
}

function inlineMarkdown(text: string): string {
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
