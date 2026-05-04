const express = require('express');

const router = express.Router();

const CONFIG = {
    NOTIFICATION_THRESHOLD: 50
};

router.get('/status', async (req, res) => {
    try {
        const stats = global.db.get('SELECT total_tokens FROM game_stats WHERE id = 1');
        const halvingCount = Math.floor(stats.total_tokens / 500);
        const tokensInCurrentHalving = stats.total_tokens % 500;
        const tokensUntilHalving = 500 - tokensInCurrentHalving;

        const lastNotification = global.db.get(`
            SELECT * FROM halving_notifications
            WHERE halving_number = ? + 1
            ORDER BY notified_at DESC LIMIT 1
        `, [halvingCount]);

        const isNearHalving = tokensUntilHalving <= CONFIG.NOTIFICATION_THRESHOLD;
        const isHalvingImminent = tokensUntilHalving <= 10;

        let notificationMessage = null;
        if (isHalvingImminent) {
            notificationMessage = `⚠️ HALVING #${halvingCount + 1} IMMINENT! Just ${tokensUntilHalving} tokens away!`;
        } else if (isNearHalving) {
            notificationMessage = `🔔 Halving #${halvingCount + 1} approaching in ${tokensUntilHalving} tokens. Prepare for reduced rewards!`;
        }

        res.json({
            success: true,
            data: {
                currentHalving: halvingCount + 1,
                tokensInCurrentHalving: tokensInCurrentHalving,
                tokensUntilHalving: tokensUntilHalving,
                currentRewardPerToken: Math.max(0.0001, 1 / Math.pow(2, halvingCount)).toFixed(4),
                nextRewardPerToken: Math.max(0.0001, 1 / Math.pow(2, halvingCount + 1)).toFixed(4),
                isNearHalving: isNearHalving,
                isHalvingImminent: isHalvingImminent,
                notificationMessage: notificationMessage,
                threshold: CONFIG.NOTIFICATION_THRESHOLD,
                lastNotification: lastNotification,
                halvingSchedule: `Every 500 tokens discovered, rewards halve (like Bitcoin's halving every 210,000 blocks).`
            }
        });

    } catch (error) {
        console.error('Halving notification status error:', error);
        res.status(500).json({ error: 'Failed to get halving notification status' });
    }
});

router.post('/check', async (req, res) => {
    try {
        const stats = global.db.get('SELECT total_tokens FROM game_stats WHERE id = 1');
        const halvingCount = Math.floor(stats.total_tokens / 500);
        const tokensInCurrentHalving = stats.total_tokens % 500;
        const tokensUntilHalving = 500 - tokensInCurrentHalving;

        if (tokensUntilHalving <= CONFIG.NOTIFICATION_THRESHOLD) {
            global.db.run(`
                INSERT INTO halving_notifications (halving_number, threshold)
                VALUES (?, ?)
            `, [halvingCount + 1, tokensUntilHalving]);
        }

        res.json({
            success: true,
            data: {
                notified: tokensUntilHalving <= CONFIG.NOTIFICATION_THRESHOLD,
                halvingNumber: halvingCount + 1,
                tokensUntilHalving: tokensUntilHalving,
                threshold: CONFIG.NOTIFICATION_THRESHOLD
            }
        });

    } catch (error) {
        console.error('Halving check error:', error);
        res.status(500).json({ error: 'Failed to check halving notification' });
    }
});

module.exports = router;
module.exports.CONFIG = CONFIG;