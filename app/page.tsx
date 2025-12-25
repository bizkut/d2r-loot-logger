'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Pusher from 'pusher-js';

interface LootEntry {
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

interface D2Item {
    id: string;
    name: string;
    image: string;
    type: string;
    base_item: string;
    properties: {
        magical_properties?: string[];
        defense?: string;
        damage?: string[];
        required_level?: number;
    };
}

const QUALITY_LABELS: Record<string, string> = {
    unique: 'Unique',
    set: 'Set',
    rare: 'Rare',
    magic: 'Magic',
    rune: 'Rune',
    normal: 'Normal',
};

const CATEGORIES = ['all', 'unique', 'set', 'rare', 'magic', 'rune'];

// Items to exclude (potions, scrolls, gold, etc.)
const EXCLUDED_ITEMS = [
    'potion', 'scroll', 'gold', 'key', 'tome', 'arrow', 'bolt', 'javelin',
    'throwingknife', 'throwingaxe', 'balrog', 'strangling', 'antidote',
    'thawing', 'stamina', 'rejuvenation', 'fullrejuvenation'
];

const isExcludedItem = (itemName: string): boolean => {
    const name = itemName.toLowerCase();
    return EXCLUDED_ITEMS.some(excluded => name.includes(excluded));
};

const ITEMS_PER_PAGE = 50;

export default function Home() {
    const [allLogs, setAllLogs] = useState<LootEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [selectedItem, setSelectedItem] = useState<LootEntry | null>(null);
    const [itemDetails, setItemDetails] = useState<D2Item | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const loaderRef = useRef<HTMLDivElement>(null);

    // Group logs by character
    const logsByCharacter = useMemo(() => {
        const grouped: Record<string, LootEntry[]> = {};
        for (const log of allLogs) {
            if (!grouped[log.character]) {
                grouped[log.character] = [];
            }
            grouped[log.character].push(log);
        }
        return grouped;
    }, [allLogs]);

    // Get unique characters
    const characters = useMemo(() => Object.keys(logsByCharacter).sort(), [logsByCharacter]);

    const fetchLogs = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: '500' });
            if (category !== 'all') params.set('category', category);

            const res = await fetch(`/api/loot?${params}`);
            const data = await res.json();

            if (data.logs) {
                // Filter out excluded items
                const filtered = data.logs.filter((log: LootEntry) => !isExcludedItem(log.itemName));
                setAllLogs(filtered);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [category]);

    // Initial fetch on mount
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Pusher real-time subscription
    useEffect(() => {
        const pusher = new Pusher('6a19622ee042414f94fa', {
            cluster: 'ap1'
        });

        const channel = pusher.subscribe('loot-channel');

        channel.bind('new-loot', (newLoot: LootEntry) => {
            // Skip excluded items
            if (isExcludedItem(newLoot.itemName)) return;

            // Add new loot to the top of the list
            setAllLogs(prev => [newLoot, ...prev]);
            setLastUpdate(new Date());
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe('loot-channel');
            pusher.disconnect();
        };
    }, []);

    // Fetch item details from D2IO when an item is selected
    const fetchItemDetails = async (itemId: string, itemName: string) => {
        if (!itemId && !itemName) return;
        try {
            const res = await fetch(`https://d2io.vercel.app/api/items`);
            const items: D2Item[] = await res.json();
            const item = items.find(i => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase() || i.name.toLowerCase() === itemName.toLowerCase());
            setItemDetails(item || null);
        } catch (error) {
            console.error('Failed to fetch item details:', error);
            setItemDetails(null);
        }
    };

    const handleItemClick = (entry: LootEntry) => {
        setSelectedItem(entry);
        fetchItemDetails(entry.itemId || entry.itemName, entry.itemName);
    };

    const closeModal = () => {
        setSelectedItem(null);
        setItemDetails(null);
    };

    // Get image URL - try API image first, then appropriate path based on item type
    const getImageUrl = (itemName: string): string | null => {
        if (itemDetails?.image) {
            return `https://d2io.vercel.app${itemDetails.image}`;
        }

        // Convert item name to slug
        const slug = itemName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // Check if it's a gem, rune, or misc item (these are in /images/misc/)
        const miscItems = ['diamond', 'ruby', 'sapphire', 'topaz', 'emerald', 'amethyst', 'skull', 'rune', 'jewel'];
        const isMiscItem = miscItems.some(misc => slug.includes(misc));

        if (isMiscItem) {
            return `https://d2io.vercel.app/images/misc/${slug}.png`;
        }

        // Default to base item path for weapons/armor
        return `https://d2io.vercel.app/images/base/${slug}.png`;
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    };

    // Stats (from all logs, not just displayed)
    const stats = {
        total: allLogs.length,
        uniques: allLogs.filter((l: LootEntry) => l.quality === 'unique').length,
        sets: allLogs.filter((l: LootEntry) => l.quality === 'set').length,
        runes: allLogs.filter((l: LootEntry) => l.quality === 'rune').length,
    };

    return (
        <main>
            <header className="header">
                <h1>🔥 D2R Loot Logger</h1>
                <p>Real-time item drops from your Koolo bot</p>
            </header>

            <div className="container-wide">
                {/* Stats Bar */}
                <div className="stats-bar">
                    <div className="stat-box">
                        <div className="stat-number">{stats.total}</div>
                        <div className="stat-label">Total Items</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-number" style={{ color: '#c9a227' }}>{stats.uniques}</div>
                        <div className="stat-label">Uniques</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-number" style={{ color: '#00ff00' }}>{stats.sets}</div>
                        <div className="stat-label">Sets</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-number" style={{ color: '#ff8800' }}>{stats.runes}</div>
                        <div className="stat-label">Runes</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`filter-btn ${category === cat ? 'active' : ''}`}
                            onClick={() => setCategory(cat)}
                        >
                            {cat === 'all' ? 'All Items' : QUALITY_LABELS[cat] || cat}
                        </button>
                    ))}
                </div>

                {/* Character-based Loot Columns */}
                {loading ? (
                    <div className="loading">Loading loot data...</div>
                ) : characters.length === 0 ? (
                    <div className="empty-state">
                        <h2>No loot yet!</h2>
                        <p>Configure your Koolo webhook to start seeing drops here.</p>
                    </div>
                ) : (
                    <div className="character-columns">
                        {characters.map((char) => (
                            <div key={char} className="character-column">
                                <div className="character-header">
                                    <span className="character-name">{char}</span>
                                    <span className="character-count">{logsByCharacter[char].length} items</span>
                                </div>
                                <div className="loot-list">
                                    {logsByCharacter[char].slice(0, ITEMS_PER_PAGE).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={`loot-row ${entry.quality}`}
                                            onClick={() => handleItemClick(entry)}
                                        >
                                            <div className={`quality-indicator ${entry.quality}`}></div>
                                            <div className="loot-row-content">
                                                <div className="loot-row-main">
                                                    <span className={`item-name ${entry.quality}`}>{entry.itemName}</span>
                                                    <span className={`item-quality-badge ${entry.quality}`}>
                                                        {QUALITY_LABELS[entry.quality] || entry.quality}
                                                    </span>
                                                </div>
                                                <div className="loot-row-meta">
                                                    <span className="meta-loc">{entry.location}</span>
                                                    <span className="meta-sep">•</span>
                                                    <span className="meta-time">{formatTime(entry.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {logsByCharacter[char].length > ITEMS_PER_PAGE && (
                                        <div className="load-more">
                                            <span>+{logsByCharacter[char].length - ITEMS_PER_PAGE} more items</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Refresh Indicator */}
            <div className="refresh-indicator">
                Last updated: {lastUpdate.toLocaleTimeString()} • {characters.length} characters • {allLogs.length} total items
            </div>

            {/* Item Detail Modal */}
            {selectedItem && (
                <div className="item-modal" onClick={closeModal}>
                    <div className={`item-modal-content ${selectedItem.quality}`} onClick={(e) => e.stopPropagation()}>
                        <div className="item-modal-header">
                            <h2 className={`item-name ${selectedItem.quality}`}>{selectedItem.itemName}</h2>
                            <button className="close-btn" onClick={closeModal}>×</button>
                        </div>

                        <div className="item-image">
                            <img
                                src={getImageUrl(selectedItem.itemName) || ''}
                                alt={selectedItem.itemName}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>

                        <div className="loot-meta" style={{ marginBottom: '20px' }}>
                            <div className="meta-item">
                                <span className="meta-label">Character</span>
                                <span className="meta-value">{selectedItem.character}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Location</span>
                                <span className="meta-value">{selectedItem.location}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Dropped By</span>
                                <span className="meta-value">{selectedItem.droppedBy || 'Unknown'}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Date</span>
                                <span className="meta-value">{formatDate(selectedItem.timestamp)}</span>
                            </div>
                        </div>

                        {itemDetails && itemDetails.properties?.magical_properties && (
                            <div className="item-properties">
                                <h3 style={{ marginBottom: '10px', color: '#c9a227' }}>Item Properties</h3>
                                {itemDetails.properties.magical_properties.map((prop, i) => (
                                    <div key={i} className="property">{prop}</div>
                                ))}
                            </div>
                        )}

                        {selectedItem.stats && selectedItem.stats.length > 0 && (
                            <div className="loot-stats">
                                <h3 style={{ marginBottom: '10px', color: '#c9a227' }}>Rolled Stats</h3>
                                {selectedItem.stats.map((stat, i) => (
                                    <div key={i} className="stat-line">{stat}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
