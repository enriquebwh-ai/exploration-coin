const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'database', 'exploration_coin.db');

async function init() {
    console.log('🔧 Initializing Exploration Coin Database...');
    console.log(`📁 Database path: ${dbPath}`);

    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    let db;
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.run(schema);

    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log('✅ Database initialized successfully!');

    const result = db.exec("SELECT * FROM game_stats WHERE id = 1");
    if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        console.log(`📊 Game Stats: ${row[1]} tiles explored, ${row[2]} tokens discovered`);
    }

    db.close();
}

init().catch(console.error);
