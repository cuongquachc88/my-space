import DOMPurify from 'dompurify'

// Force all links to open externally with noopener after sanitisation
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export function safeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['h1','h2','h3','p','ul','ol','li','blockquote','pre','code','table',
                   'thead','tbody','tr','th','td','hr','br','strong','em','a','img'],
    ALLOWED_ATTR: ['href','target','rel','src','alt','class'],
    ALLOW_DATA_ATTR: false,
    // Block javascript: and data: URLs in href/src
    FORBID_ATTR: ['onerror','onload','onclick','onmouseover'],
    FORCE_BODY: true,
  })
}
