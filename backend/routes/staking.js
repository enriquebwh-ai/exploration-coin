const express = require('express');

const router = express.Router();

const CONFIG = {
    MIN_STAKING_AMOUNT: 150,
    STAKING_BOOST: 0.02,
    STAKING_UNLOCK_DAYS: 2
};

router.post('/stake', async (req, res) => {
    try {
        const { address, amount } = req.body;

        if (!address || !amount) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (amount < CONFIG.MIN_STAKING_AMOUNT) {
            return res.status(400).json({
                error: `Minimum staking amount is ${CONFIG.MIN_STAKING_AMOUNT} tokens`
            });
        }

        const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const activeStaking = global.db.get(`
            SELECT * FROM staking WHERE user_id = ? AND status = 'active'
        `, [user.id]);

        if (activeStaking) {
            return res.status(400).json({ error: 'You already have active staking' });
        }

        global.db.run(`
            UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [amount, user.id]);

        const unlockDate = new Date();
        unlockDate.setDate(unlockDate.getDate() + CONFIG.STAKING_UNLOCK_DAYS);
        const unlockTime = unlockDate.toISOString();

        global.db.run(`
            INSERT INTO staking (user_id, amount, status, start_time, unlock_time)
            VALUES (?, ?, 'active', datetime('now'), ?)
        `, [user.id, amount, unlockTime]);

        const txHash = 'stake-' + Date.now();
        global.db.run(`
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, metadata)
            VALUES (?, ?, 'STAKING_CONTRACT', ?, 'staking_lock', ?)
        `, [txHash, address, amount, JSON.stringify({ action: 'lock', amount, unlockTime })]);

        res.json({
            success: true,
            data: {
                amount,
                unlockTime,
                boost: CONFIG.STAKING_BOOST * 100,
                message: `Staking activated. +${CONFIG.STAKING_BOOST * 100}% exploration boost for ${CONFIG.STAKING_UNLOCK_DAYS} days.`
            }
        });

    } catch (error) {
        console.error('Staking error:', error);
        res.status(500).json({ error: 'Staking failed' });
    }
});

router.post('/unstake', async (req, res) => {
    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'Missing address' });
        }

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const activeStaking = global.db.get(`
            SELECT * FROM staking WHERE user_id = ? AND status = 'active'
        `, [user.id]);

        if (!activeStaking) {
            return res.status(400).json({ error: 'No active staking found' });
        }

        const unlockDate = new Date(activeStaking.unlock_time);
        const now = new Date();

        if (now < unlockDate) {
            const daysLeft = Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24));
            return res.status(400).json({
                error: `Staking locked. ${daysLeft} days remaining.`
            });
        }

        global.db.run(`
            UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [activeStaking.amount, user.id]);

        global.db.run(`
            UPDATE staking SET status = 'completed', end_time = datetime('now')
            WHERE id = ?
        `, [activeStaking.id]);

        const txHash = 'unstake-' + Date.now();
        global.db.run(`
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, metadata)
            VALUES (?, 'STAKING_CONTRACT', ?, ?, 'staking_unlock', ?)
        `, [txHash, address, activeStaking.amount, JSON.stringify({ action: 'unlock', amount: activeStaking.amount })]);

        res.json({
            success: true,
            data: {
                amount: activeStaking.amount,
                message: `Successfully unstaked ${activeStaking.amount} tokens.`
            }
        });

    } catch (error) {
        console.error('Unstaking error:', error);
        res.status(500).json({ error: 'Unstaking failed' });
    }
});

router.get('/status/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        const activeStaking = global.db.get(`
            SELECT * FROM staking WHERE user_id = ? AND status = 'active'
        `, [user.id]);

        const stats = global.db.get('SELECT * FROM game_stats WHERE id = 1');
        const halvingCount = Math.floor(stats.total_tokens / 500);
        const currentReward = Math.max(0.0001, 1 / Math.pow(2, halvingCount));

        let response = {
            success: true,
            data: {
                balance: wallet ? wallet.balance : 0,
                hasStaking: !!activeStaking,
                canStake: wallet && wallet.balance >= CONFIG.MIN_STAKING_AMOUNT && !activeStaking,
                minStakingAmount: CONFIG.MIN_STAKING_AMOUNT,
                stakingBoost: CONFIG.STAKING_BOOST * 100,
                stakingUnlockDays: CONFIG.STAKING_UNLOCK_DAYS,
                currentRewardPerToken: currentReward,
                halvingCount
            }
        };

        if (activeStaking) {
            const unlockDate = new Date(activeStaking.unlock_time);
            const now = new Date();
            const isUnlocked = now >= unlockDate;

            response.data.staking = {
                amount: activeStaking.amount,
                startTime: activeStaking.start_time,
                unlockTime: activeStaking.unlock_time,
                isUnlocked,
                daysRemaining: isUnlocked ? 0 : Math.ceil((unlockDate - now) / (1000 * 60 * 60 * 24))
            };
        }

        res.json(response);

    } catch (error) {
        console.error('Staking status error:', error);
        res.status(500).json({ error: 'Failed to get staking status' });
    }
});

module.exports = router;
