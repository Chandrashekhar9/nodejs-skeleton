import { pool } from '../config/database';

export class CreateTokenBlacklistTableMigration {
    async up(): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS token_blacklist (
                id SERIAL PRIMARY KEY,
                token_jti VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                reason VARCHAR(100) DEFAULT 'logout'
            );
            
            -- Create indexes for faster lookups
            CREATE INDEX IF NOT EXISTS idx_token_blacklist_jti ON token_blacklist(token_jti);
            CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at);
        `;

        await pool.query(query);
    }

    async down(): Promise<void> {
        const queries = [
            `DROP INDEX IF EXISTS idx_token_blacklist_expires`,
            `DROP INDEX IF EXISTS idx_token_blacklist_jti`,
            `DROP TABLE IF EXISTS token_blacklist CASCADE`
        ];

        for (const query of queries) {
            await pool.query(query);
        }
    }
}
