import DOMPurify from 'dompurify'

export function safeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['h1','h2','h3','p','ul','ol','li','blockquote','pre','code','table',
                   'thead','tbody','tr','th','td','hr','br','strong','em','a','img'],
    ALLOWED_ATTR: ['href','target','rel','src','alt','class'],
    ALLOW_DATA_ATTR: false,
  })
}
