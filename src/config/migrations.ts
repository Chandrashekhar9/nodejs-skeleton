import { pool } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

interface MigrationFile {
    filename: string;
    timestamp: string;
    name: string;
}

export class DatabaseMigrations {
    private migrationsPath = path.resolve(process.cwd(), 'src', 'migrations');

    /**
     * Run all database migrations
     */
    async runMigrations(): Promise<void> {
        try {
            // Check if migrations table exists, create if not
            const tableExists = await this.migrationTableExists();
            if (!tableExists) {
                await this.createMigrationsTable();
            }
            
            // Get all migration files and execute them
            const migrationFiles = await this.getMigrationFiles();
            
            let migrationsExecuted = 0;
            let currentBatch: number | null = null;
            
            for (const migration of migrationFiles) {
                const wasExecuted = await this.executeMigration(migration);
                if (wasExecuted) {
                    // Get batch number for this execution if we haven't already
                    if (currentBatch === null) {
                        currentBatch = await this.getNextBatchNumber();
                    }
                    
                    // Mark with the current batch
                    await this.markMigrationExecuted(migration.name, currentBatch);
                    migrationsExecuted++;
                }
            }
            
            if (migrationsExecuted === 0) {
                console.log(`${colors.blue}Nothing to migrate${colors.reset}`);
            } else {
                console.log(`${colors.green}✅ Migrations completed${colors.reset}`);
            }
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        } finally {
            // Close database connection when running migrations standalone
            if (process.argv.includes('-e')) {
                await pool.end();
            }
        }
    }

    /**
     * Create migrations tracking table
     */
    private async createMigrationsTable(): Promise<void> {
        // First create the basic table if it doesn't exist
        const query = `
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.query(query);
        
        // Check if batch column exists, add it if not
        const batchColumnExists = await this.checkColumnExists('migrations', 'batch');
        if (!batchColumnExists) {
            const addBatchColumn = `
                ALTER TABLE migrations 
                ADD COLUMN batch INTEGER DEFAULT 1
            `;
            await pool.query(addBatchColumn);
            
            // Update existing migrations to be in batch 1
            const updateExistingBatch = `
                UPDATE migrations 
                SET batch = 1 
                WHERE batch IS NULL
            `;
            await pool.query(updateExistingBatch);
        }
        
        console.log(`${colors.green}Migration table created/updated successfully${colors.reset}`);
    }

    /**
     * Check if a column exists in a table
     */
    private async checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
        const query = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
        `;
        const result = await pool.query(query, [tableName, columnName]);
        return result.rows.length > 0;
    }

    /**
     * Check if migrations table exists
     */
    private async migrationTableExists(): Promise<boolean> {
        const checkQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'migrations'
            );
        `;
        
        const checkResult = await pool.query(checkQuery);
        return checkResult.rows[0].exists;
    }

    /**
     * Get all migration files sorted by timestamp
     */
    private async getMigrationFiles(): Promise<MigrationFile[]> {
        if (!fs.existsSync(this.migrationsPath)) {
            fs.mkdirSync(this.migrationsPath, { recursive: true });
            return [];
        }

        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
            .sort();

        return files.map(filename => {
            const match = filename.match(/^(\d{8}T\d{6})_(.+)\.(ts|js)$/);
            if (!match) {
                throw new Error(`Invalid migration filename format: ${filename}`);
            }

            const [, timestamp, name] = match;
            
            return {
                filename,
                timestamp,
                name
            };
        });
    }

    /**
     * Execute a single migration file
     */
    private async executeMigration(migration: MigrationFile): Promise<boolean> {
        if (await this.isMigrationExecuted(migration.name)) {
            return false;
        }

        console.log(`${colors.yellow}Migrating:${colors.reset} ${migration.name}`);

        try {
            // Import the migration file
            const migrationPath = path.join(this.migrationsPath, migration.filename);
            const migrationModule = require(migrationPath);
            
            // Find the migration class (it should be the default export or named export)
            let MigrationClass;
            if (migrationModule.default) {
                MigrationClass = migrationModule.default;
            } else {
                // Find the class that ends with 'Migration'
                const exportNames = Object.keys(migrationModule);
                const migrationClassName = exportNames.find(name => name.endsWith('Migration'));
                if (migrationClassName) {
                    MigrationClass = migrationModule[migrationClassName];
                }
            }
            
            if (!MigrationClass) {
                throw new Error(`No migration class found in ${migration.filename}`);
            }

            // Execute the migration silently
            const migrationInstance = new MigrationClass();
            await migrationInstance.up();

            console.log(`${colors.green}Migrated:${colors.reset} ${migration.name}`);
            return true;
        } catch (error) {
            console.error(`❌ Migration ${migration.name} failed:`, error);
            throw error;
        }
    }

    /**
     * Check if a migration has already been executed
     */
    private async isMigrationExecuted(migrationName: string): Promise<boolean> {
        const query = `SELECT 1 FROM migrations WHERE migration_name = $1`;
        const result = await pool.query(query, [migrationName]);
        return result.rows.length > 0;
    }

    /**
     * Mark a migration as executed
     */
    private async markMigrationExecuted(migrationName: string, batch?: number): Promise<void> {
        if (batch) {
            const query = `INSERT INTO migrations (migration_name, batch) VALUES ($1, $2) ON CONFLICT (migration_name) DO NOTHING`;
            await pool.query(query, [migrationName, batch]);
        } else {
            const query = `INSERT INTO migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING`;
            await pool.query(query, [migrationName]);
        }
    }

    /**
     * Rollback all executed migrations in reverse order
     */
    async rollbackAllMigrations(): Promise<void> {
        console.log('Rolling back all migrations...');
        
        try {
            // Check if migrations table exists
            const tableExists = await this.migrationTableExists();
            
            if (!tableExists) {
                console.log(`${colors.blue}Migration table does not exist. Nothing to rollback.${colors.reset}`);
                return;
            }
            
            // Get all executed migrations in reverse order (newest first)
            const executedMigrations = await this.getExecutedMigrations();
            
            if (executedMigrations.length === 0) {
                console.log(`${colors.blue}No migrations to rollback${colors.reset}`);
                return;
            }
            
            for (const migrationName of executedMigrations) {
                await this.rollbackSingleMigration(migrationName);
            }
            
            console.log(`${colors.green}✅ All migrations rolled back${colors.reset}`);
        } catch (error) {
            console.error('❌ Rollback all failed:', error);
            throw error;
        } finally {
            // Close database connection when running migrations standalone
            if (process.argv.includes('-e')) {
                await pool.end();
            }
        }
    }

    /**
     * Get all executed migrations in reverse order
     */
    private async getExecutedMigrations(): Promise<string[]> {
        const query = `SELECT migration_name FROM migrations ORDER BY executed_at DESC`;
        const result = await pool.query(query);
        return result.rows.map(row => row.migration_name);
    }

    /**
     * Rollback a specific migration (internal method without logging)
     */
    private async rollbackSingleMigration(migrationName: string): Promise<void> {
        console.log(`${colors.cyan}Rolling back:${colors.reset} ${migrationName}`);
        
        const migrationFiles = await this.getMigrationFiles();
        const migration = migrationFiles.find(m => m.name === migrationName);
        
        if (!migration) {
            throw new Error(`Migration ${migrationName} not found`);
        }

        // Import the migration file
        const migrationPath = path.join(this.migrationsPath, migration.filename);
        const migrationModule = require(migrationPath);
        
        // Find the migration class
        let MigrationClass;
        if (migrationModule.default) {
            MigrationClass = migrationModule.default;
        } else {
            const exportNames = Object.keys(migrationModule);
            const migrationClassName = exportNames.find(name => name.endsWith('Migration'));
            if (migrationClassName) {
                MigrationClass = migrationModule[migrationClassName];
            }
        }
        
        if (!MigrationClass) {
            throw new Error(`No migration class found in ${migration.filename}`);
        }

        // Execute rollback silently
        const migrationInstance = new MigrationClass();
        await migrationInstance.down();

        // Remove from tracking
        await this.removeMigrationRecord(migrationName);
        console.log(`${colors.blue}Rolled back:${colors.reset} ${migrationName}`);
    }

    /**
     * Rollback the last batch of migrations
     */
    async rollbackLastBatch(): Promise<void> {
        try {
            // Check if migrations table exists
            const tableExists = await this.migrationTableExists();
            
            if (!tableExists) {
                console.log(`${colors.blue}Migration table does not exist. Nothing to rollback.${colors.reset}`);
                return;
            }
            
            // Get the last batch of migrations
            const lastBatch = await this.getLastBatch();
            
            if (lastBatch.length === 0) {
                console.log(`${colors.blue}No migrations to rollback${colors.reset}`);
                return;
            }
            
            console.log(`${colors.cyan}Rolling back last batch (${lastBatch.length} migrations)...${colors.reset}`);
            
            for (const migrationName of lastBatch) {
                await this.rollbackSingleMigration(migrationName);
            }
            
            console.log(`${colors.green}✅ Last batch rollback completed${colors.reset}`);
        } catch (error) {
            console.error('❌ Last batch rollback failed:', error);
            throw error;
        } finally {
            // Close database connection when running migrations standalone
            if (process.argv.includes('-e')) {
                await pool.end();
            }
        }
    }

    /**
     * Rollback a specific number of batches
     */
    async rollbackSteps(steps: number): Promise<void> {
        try {
            // Check if migrations table exists
            const tableExists = await this.migrationTableExists();
            
            if (!tableExists) {
                console.log(`${colors.blue}Migration table does not exist. Nothing to rollback.${colors.reset}`);
                return;
            }
            
            console.log(`${colors.cyan}Rolling back last ${steps} batch(es)...${colors.reset}`);
            
            for (let i = 0; i < steps; i++) {
                const lastBatch = await this.getLastBatch();
                
                if (lastBatch.length === 0) {
                    console.log(`${colors.blue}No more migrations to rollback (rolled back ${i} batch(es))${colors.reset}`);
                    break;
                }
                
                console.log(`${colors.cyan}Rolling back batch ${i + 1} of ${steps} (${lastBatch.length} migrations)...${colors.reset}`);
                
                for (const migrationName of lastBatch) {
                    await this.rollbackSingleMigration(migrationName);
                }
            }
            
            console.log(`${colors.green}✅ Rollback of ${steps} batch(es) completed${colors.reset}`);
        } catch (error) {
            console.error('❌ Step rollback failed:', error);
            throw error;
        } finally {
            // Close database connection when running migrations standalone
            if (process.argv.includes('-e')) {
                await pool.end();
            }
        }
    }

    /**
     * Rollback a specific migration by name
     */
    async rollbackSpecificMigration(migrationName: string): Promise<void> {
        try {
            // Check if migrations table exists
            const tableExists = await this.migrationTableExists();
            
            if (!tableExists) {
                console.log(`${colors.blue}Migration table does not exist. Nothing to rollback.${colors.reset}`);
                return;
            }
            
            // Check if the migration was executed
            const executedMigrations = await this.getExecutedMigrations();
            if (!executedMigrations.includes(migrationName)) {
                console.log(`${colors.blue}Migration '${migrationName}' was not executed or not found${colors.reset}`);
                return;
            }
            
            await this.rollbackSingleMigration(migrationName);
            console.log(`${colors.green}✅ Migration rollback completed${colors.reset}`);
        } catch (error) {
            console.error('❌ Specific rollback failed:', error);
            throw error;
        } finally {
            // Close database connection when running migrations standalone
            if (process.argv.includes('-e')) {
                await pool.end();
            }
        }
    }

    /**
     * Refresh migrations - rollback all and re-run
     */
    async refreshMigrations(): Promise<void> {
        console.log(`${colors.blue}🔄 Refreshing migrations (rollback all + re-run)...${colors.reset}`);
        
        try {
            // First rollback all migrations
            await this.rollbackAllMigrations();
            
            console.log(`${colors.blue}🔄 Re-running all migrations...${colors.reset}`);
            
            // Then run all migrations again
            await this.runMigrations();
            
            console.log(`${colors.green}✅ Migration refresh completed${colors.reset}`);
        } catch (error) {
            console.error('❌ Migration refresh failed:', error);
            throw error;
        }
    }

    /**
     * Show migration status
     */
    async showMigrationStatus(): Promise<void> {
        try {
            // Check if migrations table exists
            const tableExists = await this.migrationTableExists();
            
            if (!tableExists) {
                console.log(`${colors.blue}Migration table does not exist. Run 'npm run migrate:run' to create it.${colors.reset}`);
                return;
            }
            
            // Get all executed migrations
            const executedMigrations = await this.getExecutedMigrationsWithDetails();
            
            if (executedMigrations.length === 0) {
                console.log(`${colors.blue}No migrations executed yet${colors.reset}`);
            } else {
                this.displayMigrationsTable(executedMigrations);
            }
        } catch (error) {
            console.error('❌ Status check failed:', error);
            throw error;
        } finally {
            // Close database connection when running migrations standalone
            if (process.argv.includes('-e')) {
                await pool.end();
            }
        }
    }

    /**
     * Display migrations in a formatted table
     */
    private displayMigrationsTable(migrations: Array<{migration_name: string, executed_at: string}>): void {
        console.log('');
        console.log(`${colors.green}┌─────────────────────────────────────────────────────────────────────────────────────┐${colors.reset}`);
        console.log(`${colors.green}│                                  Migration History                                  │${colors.reset}`);
        console.log(`${colors.green}├─────────────────────────────────────────────────────────────────────────────────────┤${colors.reset}`);
        console.log(`${colors.green}│ Migration Name                            │ Executed At                             │${colors.reset}`);
        console.log(`${colors.green}├─────────────────────────────────────────────────────────────────────────────────────┤${colors.reset}`);
        
        migrations.forEach(migration => {
            const name = migration.migration_name.padEnd(40);
            const date = new Date(migration.executed_at).toLocaleString().padEnd(32);
            console.log(`${colors.green}│${colors.reset} ${colors.yellow}${name}${colors.reset} ${colors.green} │${colors.reset} ${colors.cyan}${date}${colors.reset} ${colors.green}       │${colors.reset}`);
        });
        
        console.log(`${colors.green}└─────────────────────────────────────────────────────────────────────────────────────┘${colors.reset}`);
        console.log(`\n${colors.blue}Total migrations executed: ${colors.yellow}${migrations.length}${colors.reset}`);
        console.log('');
    }

    /**
     * Get all executed migrations with details
     */
    private async getExecutedMigrationsWithDetails(): Promise<Array<{migration_name: string, executed_at: string}>> {
        const query = `SELECT migration_name, executed_at FROM migrations ORDER BY executed_at DESC`;
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Get the last batch of executed migrations
     */
    private async getLastBatch(): Promise<string[]> {
        const query = `
            SELECT migration_name 
            FROM migrations 
            WHERE batch = (SELECT MAX(batch) FROM migrations)
            ORDER BY executed_at DESC
        `;
        const result = await pool.query(query);
        return result.rows.map(row => row.migration_name);
    }

    /**
     * Get the next batch number
     */
    private async getNextBatchNumber(): Promise<number> {
        const query = `SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM migrations`;
        const result = await pool.query(query);
        return result.rows[0].next_batch;
    }

    /**
     * Remove migration record
     */
    private async removeMigrationRecord(migrationName: string): Promise<void> {
        const query = `DELETE FROM migrations WHERE migration_name = $1`;
        await pool.query(query, [migrationName]);
    }
}
