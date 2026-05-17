# ⚡ ShopBot v2 — Vercel Setup

## What's new in v2
- 🔎 **Live web search** — proxy uses Claude's web_search tool to find REAL amazon.com/dp/ and walmart.com/ip/ URLs
- 🕓 **Search history** — last 20 searches saved to localStorage, click any to repeat
- 🔐 **Password gate** — app is locked behind a password; API is protected server-side

---

## Files
```
shopbot-v2/
├── index.html      — full app UI
├── api/proxy.js    — serverless function (Claude + web search + auth)
├── vercel.json     — 30s timeout config
└── README.md       — this file
```

---

## Deploy Steps

1. Go to **vercel.com** → New Project → "Deploy without a Git repository"
2. Drag the `shopbot-v2` folder into the upload area
3. Click **Deploy** — wait ~30 seconds
4. Go to: **Project → Settings → Environment Variables**
5. Add these three variables:

   | Name                | Value                          |
   |---------------------|--------------------------------|
   | `ANTHROPIC_API_KEY` | your key from console.anthropic.com |
   | `APP_PASS`          | any password you want (e.g. `mypass123`) |

6. Go to: **Deployments → click the three dots → Redeploy**
7. Open your `.vercel.app` URL — enter your password — done ✅

---

## How It Works

### Password Gate
- The app shows a password screen on first visit
- Password is verified against `APP_PASS` env var via the proxy
- On success, stored in `sessionStorage` (clears when tab closes)
- 🔒 Lock button in header ends the session

### Web Search
- The proxy calls Claude with the `web_search_20250305` tool enabled
- Claude searches "amazon.com [product]" and "walmart.com [product]"
- Extracts real `/dp/` and `/ip/` URLs from search results
- Falls back to search URLs if no direct product links found

### Search History
- Every successful search is saved to `localStorage`
- Shows on the search screen — click any entry to repeat it
- Delete individual entries or clear all
- Persists across sessions (until browser data is cleared)

---

## Updating the App
1. Come back to Claude, describe what you want changed
2. Get the updated file(s)
3. Vercel dashboard → your project → Settings → scroll to upload, or drag new files → Redeploy
