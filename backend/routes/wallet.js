const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const wallet = global.db.get(`
            SELECT w.balance, u.username, u.created_at
            FROM wallets w
            JOIN users u ON w.user_id = u.id
            WHERE u.address = ?
        `, [address]);

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        const stats = global.db.get('SELECT total_tokens FROM game_stats WHERE id = 1');

        res.json({
            success: true,
            data: {
                address,
                balance: wallet.balance,
                username: wallet.username,
                createdAt: wallet.created_at,
                totalSupply: 10000000,
                gameSupply: 5000000,
                tokensDiscovered: stats.total_tokens,
                tokensRemaining: 5000000 - stats.total_tokens
            }
        });

    } catch (error) {
        console.error('Balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

router.get('/history/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const transactions = global.db.all(`
            SELECT
                tx_hash,
                from_address,
                to_address,
                amount,
                type,
                block_number,
                timestamp,
                metadata
            FROM transactions
            WHERE from_address = ? OR to_address = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [address, address, parseInt(limit), parseInt(offset)]);

        const total = global.db.get(`
            SELECT COUNT(*) as count FROM transactions
            WHERE from_address = ? OR to_address = ?
        `, [address, address]);

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    total: total.count,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + transactions.length < total.count
                }
            }
        });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

router.get('/tokens/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const tokens = global.db.all(`
            SELECT
                id,
                token_number,
                x,
                z,
                bioma,
                discovered_at
            FROM tokens
            WHERE owner_id = ? OR discovered_by = ?
            ORDER BY discovered_at DESC
        `, [user.id, user.id]);

        res.json({
            success: true,
            data: {
                address,
                tokens,
                totalTokens: tokens.length
            }
        });

    } catch (error) {
        console.error('Tokens error:', error);
        res.status(500).json({ error: 'Failed to get tokens' });
    }
});

router.post('/export/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const user = global.db.get('SELECT username FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        res.json({
            success: true,
            data: {
                address,
                username: user.username,
                message: 'This is your public address. Share it to receive tokens.'
            }
        });

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export wallet info' });
    }
});

module.exports = router;
