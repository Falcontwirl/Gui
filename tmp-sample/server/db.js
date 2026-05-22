const sqlite3 = require('sqlite3');
let db;

async function initDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) return reject(err);
      db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)', () => {
        db.run('CREATE TABLE todos (id INTEGER PRIMARY KEY, user_id INTEGER, title TEXT, completed BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))', () => {
          resolve();
        });
      });
    });
  });
}

function getDb() { return db; }
module.exports = { initDb, getDb };
