const express = require('express');
const { v4: uuidv4 } = require('uuid');
const difficultyModule = require('./difficulty');

const router = express.Router();

const CONFIG = {
    MAP_SIZE: 600,
    MAX_SUPPLY: 10000000,
    GAME_SUPPLY: 5000000,
    BASE_CHANCE: 0.0002,
    HALVING_INTERVAL: 500,
    MIN_STAKING_AMOUNT: 150,
    STAKING_BOOST: 0.02,
    STAKING_UNLOCK_DAYS: 2,
    PROTOCOL_FEE_PERCENT: 0.005,
    BIOME_MULTIPLIERS: {
        bosque: 0.8,
        desierto: 1.0,
        montana: 1.5,
        zona_oscura: 2.5,
        oceano: 0.5,
        volcan: 3.0
    }
};

function getBiome(x, z) {
    const centerX = CONFIG.MAP_SIZE / 2;
    const centerZ = CONFIG.MAP_SIZE / 2;
    const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
    const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerZ, 2));
    const normalizedDist = distFromCenter / maxDist;

    const noise1 = Math.sin(x * 0.03) * Math.cos(z * 0.03);
    const noise2 = Math.sin(x * 0.01 + z * 0.01) * 0.5;

    if (normalizedDist > 0.88) return 'zona_oscura';
    if (normalizedDist > 0.78) return 'volcan';
    if (normalizedDist > 0.65) return 'montana';
    if (normalizedDist > 0.5) return 'oceano';
    if ((x + z) % 5 === 0) return 'desierto';
    if (noise1 > 0.4) return 'oceano';
    if (noise1 < -0.4) return 'zona_oscura';
    return 'bosque';
}

function calculateChance(x, z, bioma, exploredRatio, playerStaking) {
    const scarcityFactor = Math.pow(1 - exploredRatio, 1.7);

    const distanceFromCenter = Math.sqrt(Math.pow(x - CONFIG.MAP_SIZE/2, 2) + Math.pow(z - CONFIG.MAP_SIZE/2, 2));
    const maxDistance = Math.sqrt(Math.pow(CONFIG.MAP_SIZE/2, 2) * 2);
    const distanceFactor = 1 + (distanceFromCenter / maxDistance) * 1.5;

    const biomeFactor = CONFIG.BIOME_MULTIPLIERS[bioma] || 1.0;

    const difficultyMultiplier = difficultyModule.getDifficultyMultiplier();

    let finalChance = CONFIG.BASE_CHANCE * scarcityFactor * biomeFactor * distanceFactor / difficultyMultiplier;

    if (playerStaking) {
        finalChance = finalChance * (1 + CONFIG.STAKING_BOOST);
    }

    return Math.min(finalChance, 0.12);
}

function getHalvingInfo() {
    const stats = global.db.get('SELECT * FROM game_stats WHERE id = 1');
    const halvingCount = Math.floor(stats.total_tokens / CONFIG.HALVING_INTERVAL);
    const tokensInCurrentHalving = stats.total_tokens % CONFIG.HALVING_INTERVAL;

    const rewardPerToken = Math.max(0.0001, 1 / Math.pow(2, halvingCount));

    return {
        halvingCount,
        tokensInCurrentHalving,
        totalTokensMined: stats.total_tokens,
        rewardPerToken,
        nextHalvingAt: (halvingCount + 1) * CONFIG.HALVING_INTERVAL,
        description: `Halving #${halvingCount + 1}`,
        progress: (tokensInCurrentHalving / CONFIG.HALVING_INTERVAL * 100).toFixed(1)
    };
}

router.post('/explore',
    async (req, res) => {
        try {
            const { address, x, z } = req.body;

            if (!address || x === undefined || z === undefined) {
                return res.status(400).json({ error: 'Missing parameters' });
            }

            if (x < 0 || x >= CONFIG.MAP_SIZE || z < 0 || z >= CONFIG.MAP_SIZE) {
                return res.status(400).json({ error: 'Invalid coordinates' });
            }

            const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const existingTile = global.db.get('SELECT id FROM map_state WHERE x = ? AND z = ?', [x, z]);
            if (existingTile) {
                return res.status(400).json({
                    error: 'Tile already explored',
                    data: { alreadyExplored: true, x, z }
                });
            }

            const stats = global.db.get('SELECT * FROM game_stats WHERE id = 1');
            const exploredRatio = stats.total_explored / (CONFIG.MAP_SIZE * CONFIG.MAP_SIZE);

            const bioma = getBiome(x, z);

            const activeStaking = global.db.get(`
                SELECT * FROM staking
                WHERE user_id = ? AND status = 'active' AND unlock_time <= datetime('now')
            `, [user.id]);

            const playerStaking = activeStaking ? true : false;
            const chance = calculateChance(x, z, bioma, exploredRatio, playerStaking);
            const roll = Math.random();

            let tokenDiscovered = false;
            let tokenId = null;
            let tokenNumber = null;
            let rewardAmount = 0;

            if (roll < chance) {
                const halvingInfo = getHalvingInfo();
                tokenNumber = stats.last_token_number + 1;

                if (tokenNumber <= CONFIG.GAME_SUPPLY) {
                    tokenDiscovered = true;
                    rewardAmount = halvingInfo.rewardPerToken;

                    const tokenResult = global.db.run(`
                        INSERT INTO tokens (token_number, owner_id, discovered_by, x, z, bioma, reward_amount)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [tokenNumber, user.id, user.id, x, z, bioma, rewardAmount]);
                    tokenId = tokenResult.lastInsertRowid;

                    global.db.run(`
                        UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ?
                    `, [rewardAmount, user.id]);

                    global.db.run(`
                        UPDATE game_stats
                        SET total_tokens = total_tokens + 1, last_token_number = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = 1
                    `, [tokenNumber]);

                    const txHash = 'tx-' + uuidv4();
                    global.db.run(`
                        INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, block_number, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        txHash,
                        null,
                        address,
                        rewardAmount,
                        'exploration_reward',
                        stats.total_tokens + 1,
                        JSON.stringify({ tokenNumber, x, z, bioma, halving: halvingInfo.halvingCount + 1, reward: rewardAmount })
                    ]);

                    const protocolFee = rewardAmount * CONFIG.PROTOCOL_FEE_PERCENT;
                    if (protocolFee > 0) {
                        global.db.run(`
                            UPDATE game_wallet SET protocol_reward_pool = protocol_reward_pool + ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = 1
                        `, [protocolFee]);
                    }
                }
            }

            global.db.run(`
                INSERT INTO exploration_attempts (user_id, x, z, bioma, chance, roll, success, token_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [user.id, x, z, bioma, chance, roll, tokenDiscovered ? 1 : 0, tokenId]);

            global.db.run(`
                INSERT INTO map_state (x, z, bioma, explored_by)
                VALUES (?, ?, ?, ?)
            `, [x, z, bioma, user.id]);

            global.db.run(`
                UPDATE game_stats SET total_explored = total_explored + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `);

            const newStats = global.db.get('SELECT * FROM game_stats WHERE id = 1');
            const walletBalance = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
            const halvingInfo = getHalvingInfo();

            res.json({
                success: true,
                data: {
                    x, z, bioma,
                    tokenDiscovered,
                    tokenId,
                    tokenNumber,
                    rewardAmount: tokenDiscovered ? rewardAmount : 0,
                    chance,
                    stats: {
                        totalExplored: newStats.total_explored,
                        totalTokens: newStats.total_tokens,
                        mapExploredPercent: ((newStats.total_explored / (CONFIG.MAP_SIZE * CONFIG.MAP_SIZE)) * 100).toFixed(2),
                        tokensRemaining: CONFIG.GAME_SUPPLY - newStats.total_tokens,
                        playerBalance: walletBalance ? walletBalance.balance : 0
                    },
                    halving: halvingInfo,
                    playerStaking
                }
            });

        } catch (error) {
            console.error('Explore error:', error);
            res.status(500).json({ error: 'Exploration failed' });
        }
    }
);

router.get('/map-state/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const exploredTiles = global.db.all(`
            SELECT x, z, bioma, explored_at FROM map_state
            WHERE explored_by = ? ORDER BY explored_at DESC LIMIT 1000
        `, [user.id]);

        const stats = global.db.get('SELECT * FROM game_stats WHERE id = 1');
        const halvingInfo = getHalvingInfo();

        res.json({
            success: true,
            data: {
                mapSize: CONFIG.MAP_SIZE,
                exploredTiles: exploredTiles.length,
                exploredPercent: ((stats.total_explored / (CONFIG.MAP_SIZE * CONFIG.MAP_SIZE)) * 100).toFixed(2),
                tiles: exploredTiles,
                halving: halvingInfo,
                globalStats: {
                    totalExplored: stats.total_explored,
                    totalTokens: stats.total_tokens,
                    tokensRemaining: CONFIG.GAME_SUPPLY - stats.total_tokens
                }
            }
        });
    } catch (error) {
        console.error('Map state error:', error);
        res.status(500).json({ error: 'Failed to get map state' });
    }
});

router.get('/config', async (req, res) => {
    const halvingInfo = getHalvingInfo();
    res.json({
        success: true,
        data: {
            mapSize: CONFIG.MAP_SIZE,
            maxSupply: CONFIG.MAX_SUPPLY,
            gameSupply: CONFIG.GAME_SUPPLY,
            baseChance: CONFIG.BASE_CHANCE,
            biomeMultipliers: CONFIG.BIOME_MULTIPLIERS,
            halving: halvingInfo
        }
    });
});

module.exports = router;
