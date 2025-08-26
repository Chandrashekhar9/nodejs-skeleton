import { pool } from '../config/database';

export class CreateLoginLogsTableMigration {
    async up(): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS login_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                email VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT,
                status VARCHAR(50) NOT NULL,
                login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                logout_at TIMESTAMP WITH TIME ZONE,
                token_jti VARCHAR(255)
            );
            
            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_login_logs_status ON login_logs(status);
            CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON login_logs(login_at);
        `;

        await pool.query(query);
    }

    async down(): Promise<void> {
        const queries = [
            `DROP INDEX IF EXISTS idx_login_logs_login_at`,
            `DROP INDEX IF EXISTS idx_login_logs_status`,
            `DROP INDEX IF EXISTS idx_login_logs_user_id`,
            `DROP TABLE IF EXISTS login_logs CASCADE`
        ];

        for (const query of queries) {
            await pool.query(query);
        }
    }
}
