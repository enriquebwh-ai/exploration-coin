const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let db = null;

const dbPath = path.join(__dirname, '..', '..', 'database', 'exploration_coin.db');

async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.run(schema);

    saveDatabase();
    console.log('✅ Database initialized');
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

function getDb() {
    return db;
}

function run(sql, params = []) {
    try {
        db.run(sql, params);
        saveDatabase();
        return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0 };
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

module.exports = {
    initDatabase,
    getDb,
    run,
    get,
    all,
    prepare,
    saveDatabase
};
