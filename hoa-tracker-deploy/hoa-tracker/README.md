# 🏠 HOA Work Tracker

A reimbursement tracking tool for HOA members and treasurers. Members log work (time, tasks, materials) and the Treasurer reviews, approves, and exports reports.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deploy to Vercel

### Option A: Via GitHub (recommended)

1. Push this repo to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create hoa-work-tracker --public --push
   ```
   *(or create the repo on github.com and push manually)*

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repo
4. Vercel auto-detects Vite — just click **Deploy**
5. Done. Your app is live.

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts. It auto-detects the Vite framework.

## Features

- **Member role**: Create/edit work entries, submit for review, track status
- **Treasurer role**: Review queue, approve/reject with notes, generate reports, configure settings
- **Reports**: Filter by date/member/status, export CSV
- **Persistent**: Data stored in browser localStorage
- **Demo users**: Switch between Treasurer and Member roles to explore

## Tech Stack

- React 18 + Vite
- Zero external UI dependencies
- localStorage for persistence
- Single-page app, no backend required
