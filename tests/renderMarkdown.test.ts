import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../src/lib/renderMarkdown'

describe('renderMarkdown', () => {
  it('renders h1', () => {
    expect(renderMarkdown('# Hello')).toContain('<h1>Hello</h1>')
  })

  it('renders h2', () => {
    expect(renderMarkdown('## Sub')).toContain('<h2>Sub</h2>')
  })

  it('renders h3', () => {
    expect(renderMarkdown('### Deep')).toContain('<h3>Deep</h3>')
  })

  it('renders bold', () => {
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('renders italic', () => {
    expect(renderMarkdown('*italic*')).toContain('<em>italic</em>')
  })

  it('renders inline code', () => {
    expect(renderMarkdown('`code`')).toContain('<code>code</code>')
  })

  it('renders code block', () => {
    const html = renderMarkdown('```\nconst x = 1\n```')
    expect(html).toContain('<pre><code>')
    expect(html).toContain('const x = 1')
    expect(html).toContain('</code></pre>')
  })

  it('renders unordered list', () => {
    const html = renderMarkdown('- Apple\n- Banana')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Apple</li>')
    expect(html).toContain('<li>Banana</li>')
    expect(html).toContain('</ul>')
  })

  it('renders ordered list', () => {
    const html = renderMarkdown('1. First\n2. Second')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>First</li>')
    expect(html).toContain('<li>Second</li>')
    expect(html).toContain('</ol>')
  })

  it('renders links with http href', () => {
    const html = renderMarkdown('[Click](https://example.com)')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('>Click</a>')
  })

  it('strips javascript: links', () => {
    const html = renderMarkdown('[Bad](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('#"')
  })

  it('renders hr', () => {
    expect(renderMarkdown('---')).toContain('<hr />')
  })

  it('strips script tags', () => {
    const html = renderMarkdown('<script>alert(1)</script>text')
    expect(html).not.toContain('<script>')
    expect(html).toContain('text')
  })

  it('strips on* attributes', () => {
    const html = renderMarkdown('<div onclick="evil()">hi</div>')
    expect(html).not.toContain('onclick')
  })

  it('wraps plain paragraphs in p tags', () => {
    const html = renderMarkdown('Hello world')
    expect(html).toContain('<p>Hello world</p>')
  })

  it('renders multi-line code block without spurious p tags', () => {
    const html = renderMarkdown('```\nline1\nline2\n```')
    expect(html).toContain('<pre><code>')
    expect(html).toContain('line1')
    expect(html).toContain('line2')
    expect(html).not.toContain('<p>line2</p>')
  })

  it('strips unquoted on* attributes', () => {
    const html = renderMarkdown('<div onclick=evil()>hi</div>')
    expect(html).not.toContain('onclick')
  })

  it('replaces data: links with #', () => {
    const html = renderMarkdown('[x](data:text/html,<h1>hi</h1>)')
    expect(html).not.toContain('data:')
    expect(html).toContain('href="#"')
  })

  it('escapes html in code blocks', () => {
    const html = renderMarkdown('```\n<script>alert(1)</script>\n```')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('strips raw img tags from inline content', () => {
    const html = renderMarkdown('Hello <img src=x onerror=alert(1)> world')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('onerror')
  })
})
