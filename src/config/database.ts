import { Pool, PoolConfig } from 'pg';
import { DB_USER, DB_HOST, DB_NAME, DB_PASS, DB_PORT } from './env';

// Database configuration
const dbConfig: PoolConfig = {
    user: DB_USER,
    host: DB_HOST,
    database: DB_NAME,
    password: DB_PASS,
    port: DB_PORT,
};

// Create a new Pool instance with the configuration from env.ts
export const pool = new Pool(dbConfig);

// Test the connection and log when connected
pool.connect()
    .then(() => {
        console.log('✅ Database connected successfully');
    })
    .catch((error: Error) => {
        console.error('❌ Error connecting to the database:');
        console.error(`   ${error.message}`);
        console.error('');
        console.error('🔧 Possible solutions:');
        console.error('   1. Check if PostgreSQL is running');
        console.error('   2. Verify database credentials in .env file');
        console.error('   3. Ensure database exists (run setup script)');
        console.error('   4. Check if database accepts connections');
        console.error('');
        console.error('📚 Run setup script: npm run setup:windows or npm run setup:unix');
        process.exit(1); // Exit if we can't connect to the database
    });

// Handle pool errors
pool.on('error', (error: Error) => {
    console.error('Unexpected database error:', error.message);
    process.exit(1); // Exit on unexpected errors
});
