'use client';

import { useState, useEffect, useCallback } from 'react';

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

export default function Home() {
    const [logs, setLogs] = useState<LootEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [selectedItem, setSelectedItem] = useState<LootEntry | null>(null);
    const [itemDetails, setItemDetails] = useState<D2Item | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchLogs = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (category !== 'all') params.set('category', category);

            const res = await fetch(`/api/loot?${params}`);
            const data = await res.json();

            if (data.logs) {
                setLogs(data.logs);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    }, [category]);

    // Initial fetch and auto-refresh every 5 seconds
    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    // Fetch item details from D2IO when an item is selected
    const fetchItemDetails = async (itemId: string) => {
        if (!itemId) return;
        try {
            const res = await fetch(`https://d2io.vercel.app/api/items`);
            const items: D2Item[] = await res.json();
            const item = items.find(i => i.id === itemId || i.name.toLowerCase() === itemId.toLowerCase());
            setItemDetails(item || null);
        } catch (error) {
            console.error('Failed to fetch item details:', error);
            setItemDetails(null);
        }
    };

    const handleItemClick = (entry: LootEntry) => {
        setSelectedItem(entry);
        fetchItemDetails(entry.itemId || entry.itemName);
    };

    const closeModal = () => {
        setSelectedItem(null);
        setItemDetails(null);
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    };

    // Stats
    const stats = {
        total: logs.length,
        uniques: logs.filter(l => l.quality === 'unique').length,
        sets: logs.filter(l => l.quality === 'set').length,
        runes: logs.filter(l => l.quality === 'rune').length,
    };

    return (
        <main>
            <header className="header">
                <h1>🔥 D2R Loot Logger</h1>
                <p>Real-time item drops from your Koolo bot</p>
            </header>

            <div className="container">
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

                {/* Loot Grid */}
                {loading ? (
                    <div className="loading">Loading loot data...</div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <h2>No loot yet!</h2>
                        <p>Configure your Koolo webhook to start seeing drops here.</p>
                    </div>
                ) : (
                    <div className="loot-grid">
                        {logs.map((entry) => (
                            <div
                                key={entry.id}
                                className={`loot-card ${entry.quality}`}
                                onClick={() => handleItemClick(entry)}
                            >
                                <div className="loot-header">
                                    <span className={`item-name ${entry.quality}`}>{entry.itemName}</span>
                                    <span className={`item-quality ${entry.quality}`}>
                                        {QUALITY_LABELS[entry.quality] || entry.quality}
                                    </span>
                                </div>
                                <div className="loot-meta">
                                    <div className="meta-item">
                                        <span className="meta-label">Character</span>
                                        <span className="meta-value">{entry.character}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Location</span>
                                        <span className="meta-value">{entry.location}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Dropped By</span>
                                        <span className="meta-value">{entry.droppedBy || '-'}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Time</span>
                                        <span className="meta-value">{formatTime(entry.timestamp)}</span>
                                    </div>
                                </div>
                                {entry.stats && entry.stats.length > 0 && (
                                    <div className="loot-stats">
                                        {entry.stats.slice(0, 3).map((stat, i) => (
                                            <div key={i} className="stat-line">{stat}</div>
                                        ))}
                                        {entry.stats.length > 3 && (
                                            <div className="stat-line" style={{ opacity: 0.6 }}>
                                                +{entry.stats.length - 3} more...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Refresh Indicator */}
            <div className="refresh-indicator">
                Last updated: {lastUpdate.toLocaleTimeString()}
            </div>

            {/* Item Detail Modal */}
            {selectedItem && (
                <div className="item-modal" onClick={closeModal}>
                    <div className="item-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="item-modal-header">
                            <h2 className={`item-name ${selectedItem.quality}`}>{selectedItem.itemName}</h2>
                            <button className="close-btn" onClick={closeModal}>×</button>
                        </div>

                        {itemDetails && itemDetails.image && (
                            <div className="item-image">
                                <img
                                    src={`https://d2io.vercel.app${itemDetails.image}`}
                                    alt={selectedItem.itemName}
                                />
                            </div>
                        )}

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
