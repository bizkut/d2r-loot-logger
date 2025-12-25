import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

export interface LootEntry {
    id: string;
    timestamp: string;
    character: string;
    characterClass: string;
    characterLevel: number;
    difficulty: string;
    item_name: string;
    item_id: string;
    quality: string;
    location: string;
    dropped_by: string;
    stats: string[];
}

// Initialize Neon client
function getDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
    }
    return neon(connectionString);
}

// Initialize Pusher client
function getPusher() {
    return new Pusher({
        appId: process.env.PUSHER_APP_ID || '',
        key: process.env.PUSHER_KEY || '',
        secret: process.env.PUSHER_SECRET || '',
        cluster: process.env.PUSHER_CLUSTER || 'ap1',
        useTLS: true
    });
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
        const sql = getDb();

        // Check for duplicate entry (same timestamp, item_name, character)
        const existing = await sql`
            SELECT id FROM loot_logs 
            WHERE timestamp = ${body.timestamp || ''} 
            AND item_name = ${body.itemName || 'Unknown Item'}
            AND character = ${body.character || 'Unknown'}
            LIMIT 1
        `;

        if (existing.length > 0) {
            // Duplicate detected, skip insertion
            return NextResponse.json({ success: true, duplicate: true }, { status: 200 });
        }

        // Insert into database
        const result = await sql`
      INSERT INTO loot_logs (
        timestamp, character, character_class, character_level, difficulty, item_name, item_id, quality, location, dropped_by, stats
      ) VALUES (
        ${body.timestamp || new Date().toISOString()},
        ${body.character || 'Unknown'},
        ${body.characterClass || ''},
        ${body.characterLevel || 0},
        ${body.difficulty || ''},
        ${body.itemName || 'Unknown Item'},
        ${body.itemId || ''},
        ${body.quality || 'normal'},
        ${body.location || 'Unknown'},
        ${body.droppedBy || ''},
        ${JSON.stringify(body.stats || [])}
      )
      RETURNING id
    `;

        // Prepare loot data for real-time push
        const lootData = {
            id: result[0]?.id?.toString() || Date.now().toString(),
            timestamp: body.timestamp || new Date().toISOString(),
            character: body.character || 'Unknown',
            characterClass: body.characterClass || '',
            characterLevel: body.characterLevel || 0,
            difficulty: body.difficulty || '',
            itemName: body.itemName || 'Unknown Item',
            itemId: body.itemId || '',
            quality: body.quality || 'normal',
            location: body.location || 'Unknown',
            droppedBy: body.droppedBy || '',
            stats: body.stats || [],
        };

        // Push to Pusher for real-time updates - only for valuable items
        // This helps minimize Pusher message costs
        const valuableQualities = ['unique', 'set', 'rare', 'magic', 'rune'];
        const itemQuality = (body.quality || 'normal').toLowerCase();

        if (valuableQualities.includes(itemQuality)) {
            try {
                const pusher = getPusher();
                await pusher.trigger('loot-channel', 'new-loot', lootData);
            } catch (pusherError) {
                console.error('Pusher error (non-fatal):', pusherError);
                // Don't fail the request if Pusher fails
            }
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error('Error processing loot webhook:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET: Retrieve recent loot entries
export async function GET(request: NextRequest) {
    try {
        const sql = getDb();
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const category = searchParams.get('category');
        const character = searchParams.get('character');

        let query;

        if (category && character) {
            query = sql`
        SELECT * FROM loot_logs 
        WHERE quality = ${category} AND character = ${character}
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      `;
        } else if (category) {
            query = sql`
        SELECT * FROM loot_logs 
        WHERE quality = ${category}
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      `;
        } else if (character) {
            query = sql`
        SELECT * FROM loot_logs 
        WHERE character = ${character}
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      `;
        } else {
            query = sql`
        SELECT * FROM loot_logs 
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      `;
        }

        const rows = await query;

        // Get total counts from the database (not affected by limit or filters)
        const countResult = await sql`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE quality = 'unique') as uniques,
                COUNT(*) FILTER (WHERE quality = 'set') as sets,
                COUNT(*) FILTER (WHERE quality = 'rune') as runes
            FROM loot_logs
        `;

        const counts = countResult[0] || { total: 0, uniques: 0, sets: 0, runes: 0 };

        // Transform to match frontend expected format
        const logs = rows.map((row: any) => ({
            id: row.id.toString(),
            timestamp: row.timestamp,
            character: row.character,
            characterClass: row.character_class || '',
            characterLevel: row.character_level || 0,
            difficulty: row.difficulty || '',
            itemName: row.item_name,
            itemId: row.item_id,
            quality: row.quality,
            location: row.location,
            droppedBy: row.dropped_by,
            stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats,
        }));

        return NextResponse.json({
            logs,
            totals: {
                total: Number(counts.total),
                uniques: Number(counts.uniques),
                sets: Number(counts.sets),
                runes: Number(counts.runes),
            }
        });
    } catch (error) {
        console.error('Error fetching loot logs:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
