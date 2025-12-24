# D2R Loot Logger

Real-time loot tracking webapp for Diablo II Resurrected, designed to work with Koolo bot.

## Features

- 🔥 Real-time loot feed with auto-refresh
- 🏷️ Category filters (Unique, Set, Rare, Magic, Rune)
- 📊 Stats dashboard (total items, uniques, sets, runes)
- 🖼️ D2IO integration for item images and properties
- 🌙 Modern dark theme UI

## Setup

### 1. Create Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your **connection string** (looks like `postgresql://user:pass@host/db`)
4. Run the schema in **SQL Editor**:
   ```sql
   -- Paste contents of schema.sql here
   ```

### 2. Deploy to Vercel

```bash
cd loot-logger-webapp
npm install
vercel
```

### 3. Add Environment Variables in Vercel

Go to Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string |
| `WEBHOOK_SECRET` | `koolo-webhook-xK9mP2nL7qR4sT1w` |

### 4. Configure Koolo Webhook

Add to your `koolo.yaml`:

```yaml
webhook:
  enabled: true
  url: "https://your-app.vercel.app/api/loot"
  secret: "koolo-webhook-xK9mP2nL7qR4sT1w"
```

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## API Endpoints

### POST /api/loot
Receive loot events from Koolo webhook.

**Request:**
```json
{
  "timestamp": "2025-12-25T03:00:00+08:00",
  "character": "BadangTheBarb",
  "itemName": "Shako",
  "itemId": "harlequin-crest",
  "quality": "unique",
  "location": "Worldstone Keep Level 3",
  "droppedBy": "Baal",
  "stats": ["Defense: 141", "+2 All Skills"]
}
```

### GET /api/loot
Retrieve loot logs.

**Query params:**
- `limit` - Number of entries (default: 50, max: 100)
- `category` - Filter by quality (unique, set, rare, magic, rune)
- `character` - Filter by character name

## Tech Stack

- Next.js 14
- Neon PostgreSQL (serverless)
- TypeScript
- D2IO API for item data
