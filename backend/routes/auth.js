const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'exploration-coin-secret-key-2026';

router.post('/register',
    async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || username.length < 3 || username.length > 20) {
                return res.status(400).json({ error: 'Username must be 3-20 characters' });
            }

            if (!password || password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters' });
            }

            const sanitizedUsername = username.trim();
            const existingUser = global.db.get('SELECT id FROM users WHERE username = ? OR address = ?', [sanitizedUsername, sanitizedUsername]);
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const wallet = ethers.Wallet.createRandom();
            const address = wallet.address;
            const mnemonic = wallet.mnemonic.phrase;

            const passwordHash = await bcrypt.hash(password, 12);

            global.db.run(`
                INSERT INTO users (username, address, password_hash)
                VALUES (?, ?, ?)
            `, [sanitizedUsername, address, passwordHash]);

            const newUser = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
            const userId = newUser ? newUser.id : 0;

            global.db.run(`
                INSERT INTO wallets (user_id, balance) VALUES (?, 0)
            `, [userId]);

            const genesisTx = {
                tx_hash: 'genesis-' + uuidv4(),
                from_address: null,
                to_address: address,
                amount: 0,
                type: 'genesis',
                block_number: 0,
                metadata: JSON.stringify({ message: 'Welcome to Exploration Coin' })
            };
            global.db.run(`
                INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, block_number, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                genesisTx.tx_hash,
                genesisTx.from_address,
                genesisTx.to_address,
                genesisTx.amount,
                genesisTx.type,
                genesisTx.block_number,
                genesisTx.metadata
            ]);

            const sessionToken = jwt.sign(
                { userId: userId, address },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            global.db.run('UPDATE users SET session_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [sessionToken, userId]);

            res.status(201).json({
                success: true,
                message: 'Wallet created successfully',
                data: {
                    userId: userId,
                    username: sanitizedUsername,
                    address,
                    mnemonic,
                    sessionToken,
                    warning: 'Save your mnemonic phrase securely - it is the only way to recover your wallet. Never share it with anyone.'
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
);

router.post('/login',
    async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }

            const user = global.db.get('SELECT * FROM users WHERE username = ?', [username]);
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const sessionToken = jwt.sign(
                { userId: user.id, address: user.address },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            global.db.run('UPDATE users SET session_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [sessionToken, user.id]);

            const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);

            res.json({
                success: true,
                data: {
                    userId: user.id,
                    username: user.username,
                    address: user.address,
                    balance: wallet ? wallet.balance : 0,
                    sessionToken
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
);

router.post('/verify-session',
    async (req, res) => {
        try {
            const { sessionToken } = req.body;

            if (!sessionToken) {
                return res.status(401).json({ valid: false });
            }

            const decoded = jwt.verify(sessionToken, JWT_SECRET);
            const user = global.db.get('SELECT id, username, address FROM users WHERE id = ? AND session_token = ?',
                [decoded.userId, sessionToken]);

            if (!user) {
                return res.status(401).json({ valid: false });
            }

            const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);

            res.json({
                valid: true,
                data: {
                    userId: user.id,
                    username: user.username,
                    address: user.address,
                    balance: wallet ? wallet.balance : 0
                }
            });

        } catch (error) {
            res.status(401).json({ valid: false, error: 'Invalid session' });
        }
    }
);

router.post('/logout',
    async (req, res) => {
        try {
            const { sessionToken } = req.body;
            if (sessionToken) {
                global.db.run('UPDATE users SET session_token = NULL WHERE session_token = ?', [sessionToken]);
            }
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Logout failed' });
        }
    }
);

module.exports = router;
