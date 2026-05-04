const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "http://localhost:*"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many authentication attempts, please try again later' }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please slow down' }
});

const exploreLimiter = rateLimit({
    windowMs: 1000,
    max: 5,
    message: { error: 'Exploration rate limit exceeded' }
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);
app.use('/api/game/explore', exploreLimiter);

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
        const lastInsertRowid = row ? row[0] : 0;
        return { lastInsertRowid };
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

function prepare(sql) {
    return {
        run: (...params) => run(sql, params),
        get: (...params) => get(sql, params),
        all: (...params) => all(sql, params)
    };
}

global.db = { run, get, all, prepare, saveDatabase };

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

app.use(express.static(path.join(__dirname, '..', 'game')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'game', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
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

    global.db = { run, get, all, prepare, saveDatabase };
    saveDatabase();
    console.log('✅ Database initialized');
}

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 EXPLORATION COIN SERVER                             ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   API endpoints: http://localhost:${PORT}/api              ║
║   Game client: http://localhost:${PORT}                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = app;
