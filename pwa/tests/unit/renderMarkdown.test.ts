import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../../src/lib/renderMarkdown'

describe('renderMarkdown - headings', () => {
  it('renders h1', () => { expect(renderMarkdown('# Hello')).toContain('<h1>Hello</h1>') })
  it('renders h2', () => { expect(renderMarkdown('## Sub')).toContain('<h2>Sub</h2>') })
  it('renders h3', () => { expect(renderMarkdown('### Deep')).toContain('<h3>Deep</h3>') })
})

describe('renderMarkdown - inline', () => {
  it('renders bold', () => { expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>') })
  it('renders italic', () => { expect(renderMarkdown('*italic*')).toContain('<em>italic</em>') })
  it('renders inline code', () => { expect(renderMarkdown('`code`')).toContain('<code>code</code>') })
})

describe('renderMarkdown - code blocks', () => {
  it('renders code block', () => {
    const html = renderMarkdown('```\nconst x = 1\n```')
    expect(html).toContain('<pre><code>')
    expect(html).toContain('const x = 1')
  })
})

describe('renderMarkdown - lists', () => {
  it('renders unordered list', () => {
    const html = renderMarkdown('- Apple\n- Banana')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Apple</li>')
    expect(html).toContain('<li>Banana</li>')
  })

  it('renders ordered list', () => {
    const html = renderMarkdown('1. First\n2. Second')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>First</li>')
    expect(html).toContain('<li>Second</li>')
  })
})

describe('renderMarkdown - links', () => {
  it('renders links with https href', () => {
    const html = renderMarkdown('[Click](https://example.com)')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('>Click</a>')
  })

  it('strips javascript: links (renders # instead)', () => {
    const html = renderMarkdown('[Bad](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('href="#"')
  })

  it('strips data: links', () => {
    const html = renderMarkdown('[Data](data:text/html,<h1>XSS</h1>)')
    expect(html).not.toContain('data:')
  })
})

describe('renderMarkdown - security', () => {
  it('strips <script> tags', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script> World')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert(1)')
  })

  it('strips inline event handlers', () => {
    const html = renderMarkdown('<img onerror="alert(1)" src="x">')
    expect(html).not.toContain('onerror')
  })
})

describe('renderMarkdown - tables', () => {
  it('renders markdown table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<td>1</td>')
  })
})

describe('renderMarkdown - misc', () => {
  it('renders horizontal rule', () => {
    expect(renderMarkdown('---')).toContain('<hr')
  })

  it('wraps plain paragraph in <p>', () => {
    expect(renderMarkdown('Hello world')).toContain('<p>Hello world</p>')
  })
})
