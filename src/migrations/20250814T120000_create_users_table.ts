import { pool } from '../config/database';

export class CreateUsersTableMigration {
    async up(): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        `;

        await pool.query(query);
    }

    async down(): Promise<void> {
        const queries = [
            `DROP INDEX IF EXISTS idx_users_role`,
            `DROP INDEX IF EXISTS idx_users_email`,
            `DROP TABLE IF EXISTS users CASCADE`
        ];

        for (const query of queries) {
            await pool.query(query);
        }
    }
}
