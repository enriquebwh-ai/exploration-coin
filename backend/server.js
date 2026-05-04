const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use(rateLimit({ windowMs: 60000, max: 100 }));
app.use('/api/game/explore', rateLimit({ windowMs: 1000, max: 5 }));

let db = null;
const dbPath = path.join(__dirname, '..', 'database', 'exploration_coin.db');

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

function run(sql, params = []) {
    try {
        db.run(sql, params);
        saveDatabase();
        const stmt = db.prepare("SELECT last_insert_rowid() as id");
        stmt.step();
        const row = stmt.get();
        stmt.free();
        return { lastInsertRowid: row ? row[0] : 0 };
    } catch (error) {
        console.error('DB Error:', error);
        throw error;
    }
}

function get(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    } catch (error) {
        console.error('DB Error:', error);
        throw error;
    }
}

function all(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (error) {
        console.error('DB Error:', error);
        throw error;
    }
}

global.db = { run, get, all, saveDatabase };

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/game');
const statsRoutes = require('./routes/stats');
const stakingRoutes = require('./routes/staking');
const transfersRoutes = require('./routes/transfers');
const coldWalletRoutes = require('./routes/coldWallet');
const difficultyRoutes = require('./routes/difficulty');
const protocolRewardsRoutes = require('./routes/protocolRewards');
const halvingNotificationsRoutes = require('./routes/halvingNotifications');

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/cold-wallet', coldWalletRoutes);
app.use('/api/difficulty', difficultyRoutes);
app.use('/api/protocol-rewards', protocolRewardsRoutes);
app.use('/api/halving', halvingNotificationsRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = global.db.get('SELECT * FROM users WHERE LOWER(username) = ?', [username.toLowerCase()]);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }

        const bcrypt = require('bcryptjs');
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.json({ success: false, error: 'Invalid password' });
        }

        const wallet = global.db.get('SELECT balance FROM wallets WHERE user_id = ?', [user.id]);
        const jwt = require('jsonwebtoken');
        const sessionToken = jwt.sign(
            { id: user.id, username: user.username, address: user.address },
            process.env.JWT_SECRET || 'exploration-coin-secret-key-2026',
            { expiresIn: '30d' }
        );

        global.db.run('UPDATE users SET session_token = ? WHERE id = ?', [sessionToken, user.id]);

        res.json({
            success: true,
            data: {
                username: user.username,
                address: user.address,
                balance: wallet?.balance || 0,
                sessionToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, error: error.message });
    }
});

app.post('/test-account', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { ethers } = require('ethers');
        const jwt = require('jsonwebtoken');

        const testUsername = 'demo';
        const testPassword = 'demo123';

        const existing = global.db.get('SELECT id FROM users WHERE username = ?', [testUsername]);
        if (existing) {
            return res.json({
                success: true,
                data: {
                    username: testUsername,
                    password: testPassword,
                    address: global.db.get('SELECT address FROM users WHERE username = ?', [testUsername])?.address
                }
            });
        }

        const wallet = ethers.Wallet.createRandom();
        const address = wallet.address;
        const mnemonic = wallet.mnemonic.phrase;
        const passwordHash = await bcrypt.hash(testPassword, 12);

        global.db.run('INSERT INTO users (username, address, password_hash) VALUES (?, ?, ?)', [testUsername, address, passwordHash]);
        const newUser = global.db.get('SELECT id FROM users WHERE address = ?', [address]);
        global.db.run('INSERT INTO wallets (user_id, balance) VALUES (?, 100)', [newUser.id]);

        const sessionToken = jwt.sign({ id: newUser.id, address }, process.env.JWT_SECRET || 'exploration-coin-secret-key-2026', { expiresIn: '30d' });
        global.db.run('UPDATE users SET session_token = ? WHERE id = ?', [sessionToken, newUser.id]);

        res.json({
            success: true,
            data: { username: testUsername, password: testPassword, address, mnemonic, sessionToken }
        });

    } catch (error) {
        console.error('Test account error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use(express.static(path.join(__dirname, '..', 'game')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'game', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.run(schema);

    global.db = { run, get, all, saveDatabase };
    saveDatabase();
    console.log('Database initialized');
}

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Game: http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = app;