const express = require('express');

const router = express.Router();

const CONFIG = {
    DIFFICULTY_ADJUSTMENT_INTERVAL: 100,
    DIFFICULTY_BOMB_INTERVAL_MONTHS: 6,
    MAX_DIFFICULTY_MULTIPLIER: 10.0,
    BASE_DIFFICULTY: 1.0
};

router.get('/status', async (req, res) => {
    try {
        const stats = global.db.get('SELECT total_tokens, total_explored FROM game_stats WHERE id = 1');
        const difficultyBomb = global.db.get('SELECT difficulty_level, last_adjustment, game_start_date FROM difficulty_bomb WHERE id = 1');

        const gameStartDate = new Date(difficultyBomb.game_start_date);
        const now = new Date();
        const monthsSinceStart = (now - gameStartDate) / (1000 * 60 * 60 * 24 * 30);

        const era = Math.floor(monthsSinceStart / CONFIG.DIFFICULTY_BOMB_INTERVAL_MONTHS);
        const difficultyMultiplier = Math.min(
            CONFIG.MAX_DIFFICULTY_MULTIPLIER,
            CONFIG.BASE_DIFFICULTY * Math.pow(1.5, era)
        );

        const miningChance = 0.0002 / difficultyMultiplier;

        res.json({
            success: true,
            data: {
                currentDifficulty: difficultyBomb?.difficulty_level || 1.0,
                difficultyMultiplier: difficultyMultiplier.toFixed(2),
                era: era,
                monthsSinceStart: monthsSinceStart.toFixed(1),
                nextEraIn: Math.max(0, (era + 1) * CONFIG.DIFFICULTY_BOMB_INTERVAL_MONTHS - monthsSinceStart).toFixed(1),
                maxDifficultyMultiplier: CONFIG.MAX_DIFFICULTY_MULTIPLIER,
                estimatedMiningChance: miningChance.toFixed(6),
                difficultyBombNote: 'Every 6 months, mining difficulty increases by 50%. This simulates Ethereum\'s difficulty bomb concept.',
                adjustmentInterval: CONFIG.DIFFICULTY_ADJUSTMENT_INTERVAL
            }
        });

    } catch (error) {
        console.error('Difficulty status error:', error);
        res.status(500).json({ error: 'Failed to get difficulty status' });
    }
});

function getDifficultyMultiplier() {
    const difficultyBomb = global.db.get('SELECT difficulty_level, game_start_date FROM difficulty_bomb WHERE id = 1');

    if (!difficultyBomb) {
        return 1.0;
    }

    const gameStartDate = new Date(difficultyBomb.game_start_date);
    const now = new Date();
    const monthsSinceStart = (now - gameStartDate) / (1000 * 60 * 60 * 24 * 30);

    const era = Math.floor(monthsSinceStart / CONFIG.DIFFICULTY_BOMB_INTERVAL_MONTHS);
    return Math.min(CONFIG.MAX_DIFFICULTY_MULTIPLIER, CONFIG.BASE_DIFFICULTY * Math.pow(1.5, era));
}

function applyDifficultyBomb() {
    const multiplier = getDifficultyMultiplier();
    global.db.run(`
        UPDATE difficulty_bomb SET difficulty_level = ?, last_adjustment = CURRENT_TIMESTAMP
        WHERE id = 1
    `, [multiplier]);
    return multiplier;
}

module.exports = router;
module.exports.getDifficultyMultiplier = getDifficultyMultiplier;
module.exports.applyDifficultyBomb = applyDifficultyBomb;
module.exports.CONFIG = CONFIG;