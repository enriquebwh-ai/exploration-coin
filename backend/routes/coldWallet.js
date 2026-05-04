const express = require('express');

const router = express.Router();

const MIN_COLD_WALLET_AMOUNT = 100;

router.post('/deposit', async (req, res) => {
    try {
        const { address, amount } = req.body;

        if (!address || !amount) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        if (amount < MIN_COLD_WALLET_AMOUNT) {
            return res.status(400).json({
                error: `Minimum cold wallet deposit is ${MIN_COLD_WALLET_AMOUNT} tokens`
            });
        }

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const activeStaking = global.db.get(`
            SELECT * FROM staking WHERE user_id = ? AND status = 'active'
        `, [user.id]);

        if (activeStaking) {
            return res.status(400).json({
                error: 'Cannot deposit to cold wallet while having active staking'
            });
        }

        const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        global.db.run(`
            UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [amount, user.id]);

        global.db.run(`
            INSERT INTO cold_wallets (user_id, balance) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?
        `, [user.id, amount, amount]);

        const txHash = 'cold-deposit-' + Date.now();
        global.db.run(`
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, metadata)
            VALUES (?, ?, 'COLD_WALLET', ?, 'cold_deposit', ?)
        `, [txHash, address, amount, JSON.stringify({ action: 'deposit', amount })]);

        const newBalance = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        const coldBalance = global.db.get('SELECT balance FROM cold_wallets WHERE user_id = ?', [user.id]);

        res.json({
            success: true,
            data: {
                txHash,
                amount,
                newWalletBalance: newBalance.balance,
                newColdBalance: coldBalance.balance,
                message: `${amount} tokens moved to cold wallet. These cannot be staked but are secure from hacks.`
            }
        });

    } catch (error) {
        console.error('Cold wallet deposit error:', error);
        res.status(500).json({ error: 'Cold wallet deposit failed' });
    }
});

router.post('/withdraw', async (req, res) => {
    try {
        const { address, amount } = req.body;

        if (!address || !amount) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const coldWallet = global.db.get('SELECT balance FROM cold_wallets WHERE user_id = ?', [user.id]);
        if (!coldWallet || coldWallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient cold wallet balance' });
        }

        global.db.run(`
            UPDATE cold_wallets SET balance = balance - ?
            WHERE user_id = ?
        `, [amount, user.id]);

        global.db.run(`
            UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [amount, user.id]);

        const txHash = 'cold-withdraw-' + Date.now();
        global.db.run(`
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, metadata)
            VALUES (?, 'COLD_WALLET', ?, ?, 'cold_withdrawal', ?)
        `, [txHash, address, amount, JSON.stringify({ action: 'withdraw', amount })]);

        const newBalance = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        const coldBalance = global.db.get('SELECT balance FROM cold_wallets WHERE user_id = ?', [user.id]);

        res.json({
            success: true,
            data: {
                txHash,
                amount,
                newWalletBalance: newBalance.balance,
                newColdBalance: coldBalance.balance,
                message: `${amount} tokens withdrawn from cold wallet to main wallet.`
            }
        });

    } catch (error) {
        console.error('Cold wallet withdraw error:', error);
        res.status(500).json({ error: 'Cold wallet withdraw failed' });
    }
});

router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;

        const user = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const coldWallet = global.db.get('SELECT balance, created_at FROM cold_wallets WHERE user_id = ?', [user.id]);
        const mainWallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);

        res.json({
            success: true,
            data: {
                address,
                coldWalletBalance: coldWallet?.balance || 0,
                coldWalletCreated: coldWallet?.created_at || null,
                mainWalletBalance: mainWallet?.balance || 0,
                totalBalance: (coldWallet?.balance || 0) + (mainWallet?.balance || 0),
                coldWalletNote: 'Tokens in cold wallet cannot be staked but are protected from online theft.'
            }
        });

    } catch (error) {
        console.error('Cold wallet balance error:', error);
        res.status(500).json({ error: 'Failed to get cold wallet balance' });
    }
});

module.exports = router;