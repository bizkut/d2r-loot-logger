import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export interface LootEntry {
    id: string;
    timestamp: string;
    character: string;
    itemName: string;
    itemId: string;
    quality: string;
    location: string;
    droppedBy: string;
    stats: string[];
}

// POST: Receive loot from Koolo webhook
export async function POST(request: NextRequest) {
    try {
        const secretHeader = request.headers.get('x-webhook-secret');
        const expectedSecret = process.env.WEBHOOK_SECRET;

        // Optional: Verify webhook secret
        if (expectedSecret && secretHeader !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Generate unique ID
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const lootEntry: LootEntry = {
            id,
            timestamp: body.timestamp || new Date().toISOString(),
            character: body.character || 'Unknown',
            itemName: body.itemName || 'Unknown Item',
            itemId: body.itemId || '',
            quality: body.quality || 'normal',
            location: body.location || 'Unknown',
            droppedBy: body.droppedBy || '',
            stats: body.stats || [],
        };

        // Store in Vercel KV with 7-day TTL
        const key = `loot:${id}`;
        await kv.set(key, JSON.stringify(lootEntry), { ex: 60 * 60 * 24 * 7 });

        // Add to sorted set for efficient retrieval
        await kv.zadd('loot:timeline', { score: Date.now(), member: key });

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        console.error('Error processing loot webhook:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET: Retrieve recent loot entries
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const category = searchParams.get('category');
        const character = searchParams.get('character');

        // Get recent loot keys from timeline
        const keys = await kv.zrange('loot:timeline', -limit, -1, { rev: true });

        if (!keys || keys.length === 0) {
            return NextResponse.json({ logs: [] });
        }

        // Fetch all loot entries
        const logs: LootEntry[] = [];
        for (const key of keys) {
            const data = await kv.get(key as string);
            if (data) {
                const entry = typeof data === 'string' ? JSON.parse(data) : data;

                // Apply filters
                if (category && entry.quality !== category) continue;
                if (character && entry.character !== character) continue;

                logs.push(entry);
            }
        }

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Error fetching loot logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
