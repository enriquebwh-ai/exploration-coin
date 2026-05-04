const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const CONFIG = {
    TRANSACTION_FEE_PERCENT: 0.01,
    MIN_TRANSFER_AMOUNT: 1,
    GAME_WALLET_ADDRESS: 'GAME_WALLET_ADDRESS'
};

router.post('/transfer', async (req, res) => {
    try {
        const { fromAddress, toAddress, amount } = req.body;

        if (!fromAddress || !toAddress || !amount) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        if (amount < CONFIG.MIN_TRANSFER_AMOUNT) {
            return res.status(400).json({
                error: `Minimum transfer amount is ${CONFIG.MIN_TRANSFER_AMOUNT} tokens`
            });
        }

        if (fromAddress === toAddress) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        const fromUser = global.db.get('SELECT id FROM users WHERE address = ?', [fromAddress]);
        const toUser = global.db.get('SELECT id FROM users WHERE address = ?', [toAddress]);

        if (!fromUser) {
            return res.status(404).json({ error: 'Sender not found' });
        }
        if (!toUser) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        const feePercent = CONFIG.TRANSACTION_FEE_PERCENT * 100;
        const feeAmount = amount * CONFIG.TRANSACTION_FEE_PERCENT;
        const netAmount = amount - feeAmount;

        const fromWallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [fromUser.id]);
        if (!fromWallet || fromWallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        global.db.run(`
            UPDATE wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [amount, fromUser.id]);

        global.db.run(`
            UPDATE wallets SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [netAmount, toUser.id]);

        global.db.run(`
            UPDATE game_wallet SET balance = balance + ?, total_fees_collected = total_fees_collected + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [feeAmount, feeAmount]);

        const txHash = 'tx-' + uuidv4();
        const maxBlockResult = global.db.get('SELECT MAX(block_number) as max_block FROM transactions');
        const nextBlockNumber = (maxBlockResult?.max_block || 0) + 1;

        global.db.run(`
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, block_number, metadata)
            VALUES (?, ?, ?, ?, 'transfer', ?, ?)
        `, [
            txHash,
            fromAddress,
            toAddress,
            netAmount,
            nextBlockNumber,
            JSON.stringify({
                grossAmount: amount,
                feeAmount: feeAmount,
                feePercent: feePercent,
                netAmount: netAmount
            })
        ]);

        const feeTxHash = 'fee-' + uuidv4();
        global.db.run(`
            INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, block_number, metadata)
            VALUES (?, ?, ?, ?, 'fee', ?, ?)
        `, [
            feeTxHash,
            fromAddress,
            CONFIG.GAME_WALLET_ADDRESS,
            feeAmount,
            nextBlockNumber,
            JSON.stringify({ relatedTransfer: txHash, feePercent: feePercent })
        ]);

        const fromWalletUpdated = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [fromUser.id]);
        const toWalletUpdated = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [toUser.id]);

        res.json({
            success: true,
            data: {
                txHash,
                fromAddress,
                toAddress,
                grossAmount: amount,
                feeAmount: feeAmount,
                feePercent: feePercent,
                netAmount: netAmount,
                newBalance: fromWalletUpdated.balance,
                recipientNewBalance: toWalletUpdated.balance,
                message: `Transferred ${netAmount} tokens to ${toAddress}. ${feeAmount} tokens (${feePercent}%) sent to game wallet.`
            }
        });

    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: 'Transfer failed' });
    }
});

router.get('/fee-info', async (req, res) => {
    const feePercent = CONFIG.TRANSACTION_FEE_PERCENT * 100;
    const gameWallet = global.db.get('SELECT balance, total_fees_collected FROM game_wallet WHERE id = 1');

    res.json({
        success: true,
        data: {
            feePercent: feePercent,
            minTransferAmount: CONFIG.MIN_TRANSFER_AMOUNT,
            gameWalletBalance: gameWallet?.balance || 0,
            totalFeesCollected: gameWallet?.total_fees_collected || 0,
            gameWalletAddress: CONFIG.GAME_WALLET_ADDRESS
        }
    });
});

router.get('/game-wallet/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (address !== CONFIG.GAME_WALLET_ADDRESS) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const gameWallet = global.db.get('SELECT * FROM game_wallet WHERE id = 1');

        const recentFees = global.db.all(`
            SELECT tx_hash, from_address, amount, timestamp, metadata
            FROM transactions
            WHERE type = 'fee' AND to_address = ?
            ORDER BY timestamp DESC LIMIT 20
        `, [CONFIG.GAME_WALLET_ADDRESS]);

        res.json({
            success: true,
            data: {
                address: CONFIG.GAME_WALLET_ADDRESS,
                balance: gameWallet?.balance || 0,
                totalFeesCollected: gameWallet?.total_fees_collected || 0,
                protocolRewardPool: gameWallet?.protocol_reward_pool || 0,
                recentTransactions: recentFees
            }
        });

    } catch (error) {
        console.error('Game wallet error:', error);
        res.status(500).json({ error: 'Failed to get game wallet info' });
    }
});

module.exports = router;