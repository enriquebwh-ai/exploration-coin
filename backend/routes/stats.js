const express = require('express');

const router = express.Router();

const CONFIG = {
    MAP_SIZE: 600
};

router.get('/global', async (req, res) => {
    try {
        const stats = global.db.get('SELECT * FROM game_stats WHERE id = 1');
        const totalUsers = global.db.get('SELECT COUNT(*) as count FROM users');
        const totalTransactions = global.db.get('SELECT COUNT(*) as count FROM transactions');

        res.json({
            success: true,
            data: {
                totalExplored: stats.total_explored,
                totalTokens: stats.total_tokens,
                mapExploredPercent: ((stats.total_explored / (CONFIG.MAP_SIZE * CONFIG.MAP_SIZE)) * 100).toFixed(2),
                tokensRemaining: 5000000 - stats.total_tokens,
                totalUsers: totalUsers.count,
                totalTransactions: totalTransactions.count,
                gameStartDate: stats.game_start_date,
                lastUpdate: stats.updated_at
            }
        });

    } catch (error) {
        console.error('Global stats error:', error);
        res.status(500).json({ error: 'Failed to get global stats' });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const leaderboard = global.db.all(`
            SELECT
                u.username,
                u.address,
                w.balance as tokens,
                COUNT(DISTINCT ms.x || ',' || ms.z) as tiles_explored,
                u.created_at
            FROM users u
            JOIN wallets w ON u.id = w.user_id
            LEFT JOIN map_state ms ON u.id = ms.explored_by
            GROUP BY u.id
            ORDER BY w.balance DESC, tiles_explored DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({
            success: true,
            data: {
                leaderboard,
                totalPlayers: leaderboard.length
            }
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

router.get('/biomes', async (req, res) => {
    try {
        const biomeStats = global.db.all(`
            SELECT
                bioma,
                COUNT(*) as tiles_explored,
                SUM(CASE WHEN EXISTS (SELECT 1 FROM tokens t WHERE t.x = map_state.x AND t.z = map_state.z) THEN 1 ELSE 0 END) as tokens_found
            FROM map_state
            GROUP BY bioma
        `);

const biomeInfo = {
            bosque: { name: 'Bosque', color: '#1a5c34', rarity: 'Common', multiplier: 0.8 },
            desierto: { name: 'Desierto', color: '#DAA520', rarity: 'Uncommon', multiplier: 1.0 },
            montana: { name: 'Montaña', color: '#708090', rarity: 'Rare', multiplier: 1.5 },
            zona_oscura: { name: 'Zona Oscura', color: '#4B0082', rarity: 'Legendary', multiplier: 2.5 },
            oceano: { name: 'Océano', color: '#006994', rarity: 'Common', multiplier: 0.5 },
            volcan: { name: 'Volcán', color: '#8B0000', rarity: 'Legendary', multiplier: 3.0 }
        };

        const enrichedStats = biomeStats.map(stat => ({
            ...stat,
            ...biomeInfo[stat.bioma]
        }));

        res.json({
            success: true,
            data: {
                biomes: enrichedStats
            }
        });

    } catch (error) {
        console.error('Biomes stats error:', error);
        res.status(500).json({ error: 'Failed to get biome stats' });
    }
});

module.exports = router;
