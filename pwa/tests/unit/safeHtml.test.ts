// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { safeHtml } from '../../src/lib/safeHtml'

describe('safeHtml', () => {
  it('passes safe inline content through', () => {
    const result = safeHtml('<strong>bold</strong>')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('strips <script> tags', () => {
    const result = safeHtml('<p>Hello</p><script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert(1)')
  })

  it('strips javascript: href', () => {
    const result = safeHtml('<a href="javascript:alert(1)">click</a>')
    expect(result).not.toContain('javascript:')
  })

  it('strips onerror attribute', () => {
    const result = safeHtml('<img src="x" onerror="alert(1)">')
    expect(result).not.toContain('onerror')
  })

  it('strips onclick attribute', () => {
    const result = safeHtml('<a onclick="steal()">link</a>')
    expect(result).not.toContain('onclick')
  })

  it('strips onmouseover attribute', () => {
    const result = safeHtml('<span onmouseover="track()">hover</span>')
    expect(result).not.toContain('onmouseover')
  })

  it('forces all links to have target=_blank and rel=noopener noreferrer', () => {
    const result = safeHtml('<a href="https://example.com">link</a>')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('allows permitted block elements', () => {
    const html = '<h2>Sub</h2><ul><li>Item</li></ul>'
    const result = safeHtml(html)
    expect(result).toContain('<h2>Sub</h2>')
    expect(result).toContain('<li>Item</li>')
  })

  it('strips disallowed tags like <iframe>', () => {
    const result = safeHtml('<iframe src="https://evil.com"></iframe>')
    expect(result).not.toContain('<iframe')
  })

  it('strips javascript: URI from img src', () => {
    const result = safeHtml('<img src="javascript:alert(1)">')
    expect(result).not.toContain('javascript:')
  })

  it('allows code elements', () => {
    const result = safeHtml('<code>const x = 1</code>')
    expect(result).toContain('const x = 1')
  })
})
