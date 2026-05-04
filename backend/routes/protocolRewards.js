const express = require('express');

const router = express.Router();

const CONFIG = {
    PROTOCOL_FEE_PERCENT: 0.005,
    REWARD_DISTRIBUTION_DAYS: 30
};

router.get('/pool-status', async (req, res) => {
    try {
        const gameWallet = global.db.get('SELECT protocol_reward_pool, total_fees_collected FROM game_wallet WHERE id = 1');

        const activeStakes = global.db.all(`
            SELECT SUM(amount) as total_staked, COUNT(*) as staker_count
            FROM staking WHERE status = 'active'
        `);

        const lastDistribution = global.db.get(`
            SELECT * FROM protocol_rewards ORDER BY period_end DESC LIMIT 1
        `);

        const totalProtocolFees = gameWallet?.total_fees_collected || 0;
        const protocolFeePortion = totalProtocolFees * 0.5;
        const estimatedRewardPerToken = activeStakes[0]?.total_staked > 0
            ? protocolFeePortion / activeStakes[0].total_staked
            : 0;

        res.json({
            success: true,
            data: {
                currentPool: gameWallet?.protocol_reward_pool || 0,
                totalFeesCollected: totalProtocolFees,
                estimatedPoolPortion: protocolFeePortion,
                activeStakers: activeStakes[0]?.staker_count || 0,
                totalStaked: activeStakes[0]?.total_staked || 0,
                estimatedRewardPerToken: estimatedRewardPerToken.toFixed(6),
                lastDistribution: lastDistribution || null,
                rewardDistributionDays: CONFIG.REWARD_DISTRIBUTION_DAYS,
                protocolFeePercent: CONFIG.PROTOCOL_FEE_PERCENT * 100
            }
        });

    } catch (error) {
        console.error('Protocol reward pool status error:', error);
        res.status(500).json({ error: 'Failed to get protocol reward pool status' });
    }
});

router.get('/my-rewards/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const activeStaking = global.db.get(`
            SELECT amount FROM staking WHERE user_id = ? AND status = 'active'
        `, [user.id]);

        const myDistributions = global.db.all(`
            SELECT pr.*,
                (pr.reward_per_token * COALESCE(
                    (SELECT SUM(s.amount) FROM staking s
                     WHERE s.user_id = ? AND s.status = 'active'), 0
                )) as my_estimated_share
            FROM protocol_rewards pr
            WHERE pr.distributed = 1
            ORDER BY pr.period_end DESC
            LIMIT 12
        `, [user.id]);

        const pendingRewards = global.db.get(`
            SELECT SUM(reward_per_token * ?) as pending
            FROM protocol_rewards
            WHERE distributed = 0
        `, [activeStaking?.amount || 0]);

        res.json({
            success: true,
            data: {
                myActiveStake: activeStaking?.amount || 0,
                myPendingRewards: pendingRewards?.pending || 0,
                myDistributions: myDistributions
            }
        });

    } catch (error) {
        console.error('My rewards error:', error);
        res.status(500).json({ error: 'Failed to get my rewards' });
    }
});

router.post('/distribute', async (req, res) => {
    try {
        const gameWallet = global.db.get('SELECT protocol_reward_pool FROM game_wallet WHERE id = 1');

        if (!gameWallet || gameWallet.protocol_reward_pool < 100) {
            return res.status(400).json({
                error: 'Pool too small for distribution. Need at least 100 tokens.',
                currentPool: gameWallet?.protocol_reward_pool || 0
            });
        }

        const activeStakes = global.db.all(`
            SELECT user_id, amount FROM staking WHERE status = 'active'
        `);

        if (activeStakes.length === 0) {
            return res.status(400).json({ error: 'No active stakers to receive rewards' });
        }

        const totalStaked = activeStakes.reduce((sum, s) => sum + s.amount, 0);
        const rewardPerToken = gameWallet.protocol_reward_pool / totalStaked;

        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - CONFIG.REWARD_DISTRIBUTION_DAYS);

        const periodId = global.db.run(`
            INSERT INTO protocol_rewards (period_start, period_end, total_pool, total_stakers, reward_per_token, distributed)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [startDate.toISOString(), now.toISOString(), gameWallet.protocol_reward_pool, totalStaked, rewardPerToken]);

        for (const stake of activeStakes) {
            const userReward = stake.amount * rewardPerToken;
            global.db.run(`
                UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [userReward, stake.user_id]);

            const txHash = 'protocol-reward-' + Date.now() + '-' + stake.user_id;
            global.db.run(`
                INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, metadata)
                VALUES (?, 'PROTOCOL_REWARDS', ?, ?, 'protocol_reward', ?)
            `, [txHash, global.db.get('SELECT address FROM users WHERE id = ?', [stake.user_id])?.address, userReward, JSON.stringify({ rewardPerToken, stakeAmount: stake.amount })]);
        }

        global.db.run(`
            UPDATE game_wallet SET protocol_reward_pool = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `);

        res.json({
            success: true,
            data: {
                distributedAmount: gameWallet.protocol_reward_pool,
                rewardPerToken: rewardPerToken.toFixed(6),
                activeStakers: activeStakes.length,
                totalStaked: totalStaked,
                periodStart: startDate.toISOString(),
                periodEnd: now.toISOString(),
                message: `Distributed ${gameWallet.protocol_reward_pool} tokens to ${activeStakes.length} stakers.`
            }
        });

    } catch (error) {
        console.error('Protocol reward distribution error:', error);
        res.status(500).json({ error: 'Failed to distribute protocol rewards' });
    }
});

function addProtocolFee(amount) {
    const fee = amount * CONFIG.PROTOCOL_FEE_PERCENT;
    global.db.run(`
        UPDATE game_wallet SET protocol_reward_pool = protocol_reward_pool + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    `, [fee]);
    return fee;
}

module.exports = router;
module.exports.addProtocolFee = addProtocolFee;
module.exports.CONFIG = CONFIG;