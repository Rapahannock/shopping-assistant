# ⚡ ShopBot — Vercel Setup

## Files in this folder
- `index.html`   — the full app (search UI + results)
- `api/proxy.js` — serverless function (keeps your API key server-side)
- `vercel.json`  — 30s timeout config

---

## Deploy Steps

1. Go to **vercel.com** → New Project → "Deploy without a Git repository"
2. Drag the entire `shopping-assistant` folder into the upload area
3. Click **Deploy** — wait ~30 seconds
4. Go to: **Project → Settings → Environment Variables**
5. Add: `ANTHROPIC_API_KEY` = your key (from console.anthropic.com)
6. Go to: **Deployments → click the three dots → Redeploy**
7. Done — open your `.vercel.app` URL from any device 🎉

---

## Updating the App
1. Come back to Claude, describe what you want changed
2. Get the updated file(s)
3. In Vercel dashboard → your project → drag new files in → Redeploy

---

## How It Works
- User types a messy/vague query (typos fine)
- `/api/proxy` sends it to Claude (server-side, key never exposed)
- Claude interprets the query + returns 4 Amazon & 4 Walmart product links
- Results render instantly with filter toggles + direct links
