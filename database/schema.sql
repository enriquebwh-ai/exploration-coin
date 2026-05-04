-- Exploration Coin Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    address TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    session_token TEXT
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id),
    balance REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (blockchain-like history)
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    from_address TEXT,
    to_address TEXT NOT NULL,
    amount REAL DEFAULT 0,
    type TEXT CHECK(type IN ('exploration_reward', 'transfer', 'genesis', 'airdrop', 'staking_lock', 'staking_unlock', 'protocol_reward', 'fee', 'cold_deposit', 'cold_withdrawal')),
    block_number INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT
);

-- Exploration attempts log
CREATE TABLE IF NOT EXISTS exploration_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    x INTEGER NOT NULL,
    z INTEGER NOT NULL,
    bioma TEXT NOT NULL,
    chance REAL NOT NULL,
    roll REAL NOT NULL,
    success BOOLEAN NOT NULL,
    token_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tokens discovered
CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_number INTEGER UNIQUE NOT NULL,
    owner_id INTEGER REFERENCES users(id),
    discovered_by INTEGER REFERENCES users(id),
    x INTEGER NOT NULL,
    z INTEGER NOT NULL,
    bioma TEXT NOT NULL,
    reward_amount REAL DEFAULT 1,
    discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Map state (tiles explored)
CREATE TABLE IF NOT EXISTS map_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    z INTEGER NOT NULL,
    bioma TEXT NOT NULL,
    explored_by INTEGER REFERENCES users(id),
    explored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(x, z)
);

-- Game statistics
CREATE TABLE IF NOT EXISTS game_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_explored INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    last_token_number INTEGER DEFAULT 0,
    game_start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Staking table
CREATE TABLE IF NOT EXISTS staking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    amount REAL NOT NULL,
    status TEXT DEFAULT 'active',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    unlock_time DATETIME NOT NULL,
    end_time DATETIME
);

-- Genesis transaction and stats
INSERT OR IGNORE INTO game_stats (id, total_explored, total_tokens, last_token_number)
VALUES (1, 0, 0, 0);

-- Cold wallets (offline storage)
CREATE TABLE IF NOT EXISTS cold_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Game wallet (receives fees and protocol rewards)
CREATE TABLE IF NOT EXISTS game_wallet (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    address TEXT NOT NULL,
    balance REAL DEFAULT 0,
    total_fees_collected REAL DEFAULT 0,
    protocol_reward_pool REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Protocol staking rewards pool
CREATE TABLE IF NOT EXISTS protocol_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    total_pool REAL DEFAULT 0,
    total_stakers REAL DEFAULT 0,
    reward_per_token REAL DEFAULT 0,
    distributed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Difficulty bomb tracking
CREATE TABLE IF NOT EXISTS difficulty_bomb (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    game_start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    difficulty_level REAL DEFAULT 1.0,
    last_adjustment DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Halving notifications
CREATE TABLE IF NOT EXISTS halving_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    halving_number INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    notified_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exploration_user ON exploration_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exploration_coords ON exploration_attempts(x, z);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_tokens_owner ON tokens(owner_id);
CREATE INDEX IF NOT EXISTS idx_map_explored ON map_state(explored_by);
CREATE INDEX IF NOT EXISTS idx_staking_user ON staking(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_status ON staking(status);
CREATE INDEX IF NOT EXISTS idx_cold_wallet_user ON cold_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_protocol_rewards_distributed ON protocol_rewards(distributed);

-- Initial game wallet record
INSERT OR IGNORE INTO game_wallet (id, address, balance, total_fees_collected, protocol_reward_pool)
VALUES (1, 'GAME_WALLET_ADDRESS', 0, 0, 0);

-- Initial difficulty bomb record
INSERT OR IGNORE INTO difficulty_bomb (id, difficulty_level)
VALUES (1, 1.0);
