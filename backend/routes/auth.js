const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'exploration-coin-secret-key-2026';
const TOKEN_EXPIRY = '30d';

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ success: false, error: 'Username must be 3-20 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const cleanUsername = username.trim().toLowerCase();

        const existing = global.db.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }

        const wallet = ethers.Wallet.createRandom();
        const address = wallet.address;
        const mnemonic = wallet.mnemonic.phrase;
        const passwordHash = await bcrypt.hash(password, 12);

        global.db.run(
            'INSERT INTO users (username, address, password_hash, session_token) VALUES (?, ?, ?, ?)',
            [cleanUsername, address, passwordHash, '']
        );

        const newUser = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        global.db.run('INSERT INTO wallets (user_id, balance) VALUES (?, 0)', [newUser.id]);

        global.db.run(
            'INSERT INTO transactions (tx_hash, from_address, to_address, amount, type, block_number, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['genesis-' + uuidv4(), null, address, 0, 'genesis', 0, JSON.stringify({ message: 'Welcome to Exploration Coin' })]
        );

        const sessionToken = jwt.sign(
            { id: newUser.id, username: cleanUsername, address },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        global.db.run('UPDATE users SET session_token = ? WHERE id = ?', [sessionToken, newUser.id]);

        res.status(201).json({
            success: true,
            data: {
                username: cleanUsername,
                address: address,
                mnemonic: mnemonic,
                sessionToken: sessionToken
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password required' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const user = global.db.get('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        const sessionToken = jwt.sign(
            { id: user.id, username: user.username, address: user.address },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        global.db.run('UPDATE users SET session_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?', [sessionToken, user.id]);

        res.json({
            success: true,
            data: {
                username: user.username,
                address: user.address,
                balance: wallet ? wallet.balance : 0,
                sessionToken: sessionToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ success: false, valid: false });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = global.db.get('SELECT id, username, address FROM users WHERE id = ? AND session_token = ?', [decoded.id, token]);

            if (!user) {
                return res.json({ success: false, valid: false });
            }

            const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);

            res.json({
                success: true,
                valid: true,
                data: {
                    username: user.username,
                    address: user.address,
                    balance: wallet ? wallet.balance : 0
                }
            });
        } catch (jwtError) {
            res.json({ success: false, valid: false, error: 'Token expired' });
        }

    } catch (error) {
        console.error('Verify error:', error);
        res.json({ success: false, valid: false });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            global.db.run('UPDATE users SET session_token = NULL WHERE session_token = ?', [token]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Logout failed' });
    }
});

router.get('/test', async (req, res) => {
    try {
        const users = global.db.all('SELECT id, username, address, created_at FROM users LIMIT 10');
        res.json({ success: true, data: { users, count: users.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;