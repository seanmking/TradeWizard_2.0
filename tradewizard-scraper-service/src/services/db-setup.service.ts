import { Database } from 'sqlite3';

export class DbSetupService {
  private db: Database;

  constructor() {
    this.db = new Database(process.env.SQLITE_PATH || 'website_intelligence.sqlite');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.db.serialize(() => {
          // Raw data table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS raw_data (
              website_id TEXT PRIMARY KEY,
              url TEXT NOT NULL,
              timestamp DATETIME NOT NULL,
              data TEXT NOT NULL
            )
          `);

          // Analysis results table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS analysis_results (
              website_id TEXT PRIMARY KEY,
              timestamp DATETIME NOT NULL,
              data TEXT NOT NULL
            )
          `);

          // User verifications table
          this.db.run(`
            CREATE TABLE IF NOT EXISTS user_verifications (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              website_id TEXT NOT NULL,
              timestamp DATETIME NOT NULL,
              data TEXT NOT NULL
            )
          `);
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
} 