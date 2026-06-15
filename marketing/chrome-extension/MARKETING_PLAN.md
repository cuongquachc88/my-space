# My SPACE — Chrome Extension Marketing Plan

> Goal: grow installs from 0 → 500 in 90 days, build a privacy-focused audience, and establish a presence on Product Hunt, Reddit, and the Chrome Web Store.

---

## 1. Assets to Produce

### Screenshots (Chrome Web Store requires 1280×800 or 640×400)

| # | Screen | Key message |
|---|---|---|
| 1 | Notes view — note open with Markdown rendered | "Markdown notes, always at hand" |
| 2 | Secret Vault unlocked — list of secrets | "AES-256 encrypted. Only you hold the key." |
| 3 | Password Generator — 20-char password visible | "Strong passwords in one click" |
| 4 | Subscriptions — spend summary header showing multi-currency total | "Track every recurring cost" |
| 5 | Sync view — terminal console log showing push complete | "Optional encrypted Drive backup" |

**How to capture** — see `screenshots/HOW_TO_CAPTURE.md`

### Demo Video

| Segment | Duration | Content |
|---|---|---|
| Hook | 0:00–0:10 | Chrome side panel opens — "Your private vault, right here" |
| Notes | 0:10–0:25 | Type a note, apply tag, search |
| Vault | 0:25–0:45 | Unlock, add secret, reveal value, lock |
| Generator | 0:45–0:55 | Adjust length slider, copy password |
| Subscriptions | 0:55–1:10 | Add Netflix, see monthly total in VND |
| Sync | 1:10–1:25 | Push to Drive, show terminal console animation |
| Close | 1:25–1:30 | "Free. Private. Yours." + Web Store link |

**Recording instructions** — see `video/RECORDING_GUIDE.md`

---

## 2. Chrome Web Store Listing

See `../chrome-extension.html` for full copy.

**Checklist before submitting:**
- [ ] 5 screenshots (1280×800 PNG)
- [ ] 1 promo tile 440×280 (optional but boosts CTR)
- [ ] Demo video uploaded to YouTube (unlisted ok)
- [ ] Privacy policy URL: `https://cuongquachc88.github.io/my-space/privacy-policy.md`
- [ ] Single-purpose description written (required by Google)
- [ ] Permissions justified in listing description

---

## 3. Launch Channels

### Week 1 — Soft Launch

| Channel | Action | Template |
|---|---|---|
| GitHub | Push repo public, add topics & description | `../generic.html` → GitHub Settings section |
| GitHub Pages | Publish `docs/index.html` to `cuongquachc88.github.io/my-space/` | Already configured |
| Google Search Console | Submit sitemap, verify ownership | Meta tag already added to `docs/index.html` |
| Chrome Web Store | Submit extension for review | Use `../chrome-extension.html` copy |

### Week 2 — Community Launch

| Channel | Subreddit / Community | Post type | Copy template |
|---|---|---|---|
| Reddit | r/chrome | Text post | See `copy/reddit_rchrome.md` |
| Reddit | r/privacy | Text post | See `copy/reddit_rprivacy.md` |
| Reddit | r/selfhosted | Text post | See `copy/reddit_rselfhosted.md` |
| Hacker News | Show HN | Text | See `copy/hn_show.md` |
| DEV.to | Blog post | Article | See `copy/devto_article.md` |

### Week 3 — Product Hunt

| Step | Detail |
|---|---|
| Prepare | Get 5 upvote pledges from friends before launch day |
| Launch day | Tuesday or Wednesday (highest traffic) |
| Tagline | "Your encrypted side panel vault — notes, secrets, passwords & subscriptions. No servers." |
| First comment | Explain the tech stack and privacy model |
| Gallery | Upload all 5 screenshots + video |

### Week 4+ — Ongoing

- Answer questions on Chrome Web Store reviews
- Post update changelogs to Reddit when new versions ship
- Twitter/X thread: "I built a private Chrome vault — here's how AES-GCM encryption works in a browser extension"

---

## 4. SEO Strategy

Target keywords (already added to `docs/index.html` meta tags):

| Keyword | Monthly searches (est.) | Competition |
|---|---|---|
| chrome extension password manager | 8,100 | High |
| offline password manager chrome | 1,300 | Medium |
| encrypted notes chrome extension | 590 | Low |
| chrome side panel vault | 260 | Low |
| subscription tracker chrome | 390 | Low |

**Content plan:**
1. `docs/index.html` — landing page (done)
2. Blog post on DEV.to linking back to Web Store
3. GitHub repo description with keywords (see `../generic.html`)

---

## 5. Metrics to Track

| Metric | Where | Goal (90 days) |
|---|---|---|
| Chrome Web Store installs | Developer Dashboard | 500 |
| Weekly active users | Developer Dashboard | 200 |
| Landing page visits | Google Analytics / Search Console | 1,000/mo |
| GitHub stars | GitHub repo | 50 |
| Product Hunt upvotes | Product Hunt | 100 |
| Rating | Chrome Web Store | ≥ 4.5 ★ |

---

## 6. Folder Contents

```
marketing/chrome-extension/
├── MARKETING_PLAN.md          ← this file
├── screenshots/
│   ├── HOW_TO_CAPTURE.md      ← step-by-step screenshot guide
│   └── (captured PNGs go here)
├── video/
│   ├── RECORDING_GUIDE.md     ← OBS / QuickTime recording script
│   └── (exported MP4 goes here)
├── assets/
│   └── (promo tiles, banners)
└── copy/
    ├── reddit_rchrome.md
    ├── reddit_rprivacy.md
    ├── reddit_rselfhosted.md
    ├── hn_show.md
    └── devto_article.md
```
