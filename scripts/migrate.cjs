#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

/**
 * Database Migration CLI Tool
 * Usage:
 *   npm run migrate                     - Run all pending migrations
 *   npm run migrate:rollback            - Rollback last batch of migrations
 *   npm run migrate:rollback --name=<migration>  - Rollback specific migration
 *   npm run migrate:rollback --step=<number>     - Rollback last N batches
 *   npm run migrate:rollback:all        - Rollback all migrations
 *   npm run migrate:refresh             - Rollback all and re-run migrations
 *   npm run migrate:status              - Show migration status
 *   npm run migrate:create <name>       - Create new migration file
 *   npm run migrate:create <name> --table=<table> - Create new migration for specific table
 */

const command = process.argv[2];
const args = process.argv.slice(3);

// Parse command line arguments
function parseArgs(args) {
    const parsed = { positional: [], flags: {} };
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            parsed.flags[key] = value || true;
        } else {
            parsed.positional.push(arg);
        }
    }
    
    return parsed;
}

const parsedArgs = parseArgs(args);
const migrationName = parsedArgs.positional[0];

const commands = {
    'run': runMigrations,
    'rollback': handleRollback,
    'rollback:all': rollbackAllMigrations,
    'refresh': refreshMigrations,
    'status': showMigrationStatus,
    'create': createMigration,
    'help': showHelp
};

async function main() {
    console.log('🗄️  Database Migration Tool');
    console.log('================================');
    console.log('');

    if (!command || !commands[command]) {
        showHelp();
        return;
    }

    try {
        await commands[command]();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

function runMigrations() {
    console.log('🔄 Running migrations...');
    execSync('npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().runMigrations().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"', {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}

function handleRollback() {
    if (parsedArgs.flags.name) {
        // Rollback specific migration
        console.log(`🔄 Rolling back specific migration: ${parsedArgs.flags.name}`);
        execSync(`npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().rollbackSpecificMigration(\\"${parsedArgs.flags.name}\\").then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    } else if (parsedArgs.flags.step) {
        // Rollback specific number of batches
        const steps = parseInt(parsedArgs.flags.step);
        if (isNaN(steps) || steps < 1) {
            console.log('❌ Step value must be a positive number');
            console.log('   Example: npm run migrate:rollback --step=2');
            return;
        }
        
        console.log(`🔄 Rolling back last ${steps} batch(es)...`);
        execSync(`npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().rollbackSteps(${steps}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    } else {
        // Rollback last batch
        console.log('🔄 Rolling back last batch...');
        execSync('npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().rollbackLastBatch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"', {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    }
}

function rollbackAllMigrations() {
    console.log('🔄 Rolling back all migrations...');
    execSync('npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().rollbackAllMigrations().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"', {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}

function refreshMigrations() {
    console.log('🔄 Refreshing migrations (rollback all + re-run)...');
    execSync('npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().refreshMigrations().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"', {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}

function showMigrationStatus() {
    console.log('📊 Migration Status');
    console.log('-------------------');
    
    execSync('npx tsx -e "import(\\"./src/config/migrations\\").then(m => new m.DatabaseMigrations().showMigrationStatus().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }))"', {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}

function createMigration() {
    if (!migrationName) {
        console.log('❌ Please specify migration name');
        console.log('   Example: npm run migrate:create add_user_settings');
        console.log('   Example: npm run migrate:create create_posts --table=posts');
        return;
    }

    console.log('📝 To add a new migration to your system:');
    console.log('');
    console.log('1. 📂 Open: src/config/migrations.ts');
    console.log('2. ➕ Add a new method:');
    console.log('');
    console.log(`   private async ${migrationName}(): Promise<void> {`);
    console.log(`       const migrationName = '${migrationName}';`);
    console.log('       ');
    console.log('       if (await this.isMigrationExecuted(migrationName)) {');
    console.log(`           console.log(\`⏭️  Migration \${migrationName} already executed\`);`);
    console.log('           return;');
    console.log('       }');
    console.log('');
    console.log(`       console.log(\`� Executing migration: \${migrationName}\`);`);
    console.log('');
    console.log('       const queries = [');
    console.log('           // Add your SQL statements here');
    console.log('           // `ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(255)`,');
    console.log('           // `CREATE INDEX IF NOT EXISTS idx_users_new_field ON users(new_field)`');
    console.log('       ];');
    console.log('');
    console.log('       for (const query of queries) {');
    console.log('           await pool.query(query);');
    console.log('       }');
    console.log('');
    console.log('       await this.markMigrationExecuted(migrationName);');
    console.log(`       console.log(\`✅ Migration \${migrationName} completed\`);`);
    console.log('   }');
    console.log('');
    console.log(`3. � Add the method call to runMigrations():`);
    console.log(`   await this.${migrationName}();`);
    console.log('');
    console.log('4. 🏃 Run: npm run migrate:run');
    console.log('');
}

function generateCreateTableMigration(className, tableName) {
    return `import { pool } from '../config/database';

export class ${className} {
    async up(): Promise<void> {
        const query = \`
            CREATE TABLE IF NOT EXISTS ${tableName} (
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
        const query = \`DROP TABLE IF EXISTS ${tableName}\`;
        await pool.query(query);
    }
}
`;
}

function generateAddColumnMigration(className, tableName, migrationName) {
    const columnName = migrationName.split('_').find((part, index, arr) => 
        index > 0 && arr[index - 1] === 'add'
    ) || 'new_column';
    
    return `import { pool } from '../config/database';

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
}

function generateDropMigration(className, tableName, migrationName) {
    return `import { pool } from '../config/database';

export class ${className} {
    async up(): Promise<void> {
        // Add your drop/remove logic here
        const query = \`
            -- Example: DROP INDEX IF EXISTS idx_${tableName}_column;
            -- Example: ALTER TABLE ${tableName} DROP COLUMN IF EXISTS column_name;
        \`;
        
        await pool.query(query);
    }

    async down(): Promise<void> {
        // Add your rollback logic here
        const query = \`
            -- Example: CREATE INDEX IF NOT EXISTS idx_${tableName}_column ON ${tableName}(column);
            -- Example: ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS column_name VARCHAR(255);
        \`;
        
        await pool.query(query);
    }
}
`;
}

function generateGenericMigration(className, tableName) {
    return `import { pool } from '../config/database';

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

function showHelp() {
    console.log('📚 Available Commands:');
    console.log('');
    console.log('  npm run migrate                         - Run all pending migrations');
    console.log('  npm run migrate:rollback                - Rollback last batch of migrations');
    console.log('  npm run migrate:rollback --name=<name>  - Rollback specific migration');
    console.log('  npm run migrate:rollback --step=<n>     - Rollback last N batches');
    console.log('  npm run migrate:rollback:all            - Rollback all migrations');
    console.log('  npm run migrate:refresh                 - Rollback all and re-run migrations');
    console.log('  npm run migrate:status                  - Show executed migrations');
    console.log('  npm run migrate:create <name>           - Create new migration file');
    console.log('  npm run migrate:create <name> --table=<table> - Create migration for specific table');
    console.log('  npm run migrate:help                    - Show this help');
    console.log('');
    console.log('📝 Examples:');
    console.log('  npm run migrate:create add_user_avatar');
    console.log('  npm run migrate:create create_posts --table=posts');
    console.log('  npm run migrate:rollback --name=create_users_table');
    console.log('  npm run migrate:rollback --step=2');
    console.log('  npm run migrate:rollback:all');
    console.log('  npm run migrate:refresh');
    console.log('');
}

main();
