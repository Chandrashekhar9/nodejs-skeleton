#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const migrationName = args[0];
const tableName = args[1] || 'your_table';

if (!migrationName) {
    console.log('❌ Please specify migration name');
    console.log('   Usage: npm run migrate:create <migration_name> [table_name]');
    console.log('   Examples:');
    console.log('     npm run migrate:create add_user_avatar users');
    console.log('     npm run migrate:create create_posts posts');
    process.exit(1);
}

// Generate timestamp
const now = new Date();
const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', 'T');

const filename = `${timestamp}_${migrationName}.ts`;
const migrationPath = path.join('src', 'migrations', filename);

// Generate class name
const className = migrationName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Migration';

let migrationContent;

if (migrationName.startsWith('create_')) {
    // Create table migration
    const actualTableName = tableName !== 'your_table' ? tableName : migrationName.replace('create_', '');
    migrationContent = `import { pool } from '../config/database';

export class ${className} {
    async up(): Promise<void> {
        const query = \`
            CREATE TABLE IF NOT EXISTS ${actualTableName} (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        \`;
        
        await pool.query(query);
    }

    async down(): Promise<void> {
        const query = \`DROP TABLE IF EXISTS ${actualTableName}\`;
        await pool.query(query);
    }
}
`;
} else if (migrationName.includes('add_') && migrationName.includes('_to_')) {
    // Add column migration
    const columnName = migrationName.split('_').find((part, index, arr) => 
        index > 0 && arr[index - 1] === 'add'
    ) || 'new_column';
    
    migrationContent = `import { pool } from '../config/database';

export class ${className} {
    async up(): Promise<void> {
        const query = \`
            ALTER TABLE ${tableName} 
            ADD COLUMN IF NOT EXISTS ${columnName} VARCHAR(255)
        \`;
        
        await pool.query(query);
    }

    async down(): Promise<void> {
        const query = \`
            ALTER TABLE ${tableName} 
            DROP COLUMN IF EXISTS ${columnName}
        \`;
        
        await pool.query(query);
    }
}
`;
} else {
    // Generic migration
    migrationContent = `import { pool } from '../config/database';

export class ${className} {
    async up(): Promise<void> {
        // Add your migration logic here
        const queries = [
            // Example queries:
            // \`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS new_field VARCHAR(255)\`,
            // \`CREATE INDEX IF NOT EXISTS idx_${tableName}_new_field ON ${tableName}(new_field)\`
        ];
        
        for (const query of queries) {
            await pool.query(query);
        }
    }

    async down(): Promise<void> {
        // Add your rollback logic here
        const queries = [
            // Example rollback queries:
            // \`DROP INDEX IF EXISTS idx_${tableName}_new_field\`,
            // \`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS new_field\`
        ];
        
        for (const query of queries) {
            await pool.query(query);
        }
    }
}
`;
}

// Create migrations directory if it doesn't exist
const migrationsDir = path.join('src', 'migrations');
if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
}

// Write migration file
fs.writeFileSync(migrationPath, migrationContent);

console.log(`✅ Migration created: ${migrationPath}`);
console.log(`📝 Class name: ${className}`);
console.log('');
console.log('🏃 Next steps:');
console.log('1. Edit the migration file to customize your schema changes');
console.log('2. Run: npm run migrate');
console.log('');
