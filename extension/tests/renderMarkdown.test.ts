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

  it('renders blockquotes', () => {
    const html = renderMarkdown('> This is a quote')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('This is a quote')
    expect(html).toContain('</blockquote>')
  })

  it('renders multi-line blockquotes', () => {
    const html = renderMarkdown('> First line\n> Second line')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('First line')
    expect(html).toContain('Second line')
    expect(html).toContain('</blockquote>')
  })

  it('renders tables with header and body', () => {
    const md = '| Name | Value |\n| --- | --- |\n| A | 1 |\n| B | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<th>Name</th>')
    expect(html).toContain('<th>Value</th>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<td>A</td>')
    expect(html).toContain('<td>1</td>')
    expect(html).toContain('<td>B</td>')
    expect(html).toContain('<td>2</td>')
    expect(html).toContain('</table>')
  })

  it('renders task list unchecked item', () => {
    const html = renderMarkdown('- [ ] Todo item')
    expect(html).toContain('task-list')
    expect(html).toContain('task-item')
    expect(html).toContain('Todo item')
  })

  it('renders task list checked item with done class', () => {
    const html = renderMarkdown('- [x] Done item')
    expect(html).toContain('task-item done')
    expect(html).toContain('Done item')
  })

  it('renders nested unordered list items with nested class', () => {
    const html = renderMarkdown('- Parent\n  - Child')
    expect(html).toContain('<ul>')
    expect(html).toContain('nested')
    expect(html).toContain('Child')
  })

  it('renders nested ordered list items with nested class', () => {
    const html = renderMarkdown('1. Parent\n  1. Child')
    expect(html).toContain('<ol>')
    expect(html).toContain('nested')
    expect(html).toContain('Child')
  })

  it('closes blockquote before following paragraph', () => {
    const html = renderMarkdown('> Quote line\nNormal text')
    expect(html).toContain('</blockquote>')
    expect(html).toContain('<p>Normal text</p>')
  })
})
