# D2R Loot Logger

Real-time loot tracking webapp for Diablo II Resurrected, designed to work with Koolo bot.

## Features

- 🔥 Real-time loot feed with auto-refresh
- 🏷️ Category filters (Unique, Set, Rare, Magic, Rune)
- 📊 Stats dashboard (total items, uniques, sets, runes)
- 🖼️ D2IO integration for item images and properties
- 🌙 Modern dark theme UI

## Setup

### 1. Deploy to Vercel

```bash
cd loot-logger-webapp
npm install
vercel
```

### 2. Configure Vercel KV

1. Go to your Vercel dashboard
2. Click on "Storage" → "Create Database" → "KV"
3. Link the database to your project
4. The environment variables will be automatically added

### 3. Configure Koolo Webhook

Add to your `Settings.json`:

```yaml
webhook:
  enabled: true
  url: "https://your-app.vercel.app/api/loot"
  secret: "your-optional-secret-key"
```

### 4. Set Webhook Secret (Optional)

Add `WEBHOOK_SECRET` to your Vercel environment variables if you want to secure your webhook.

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
- Vercel KV (Redis)
- TypeScript
- D2IO API for item data
