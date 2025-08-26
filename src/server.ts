import { App } from './app';
import { DatabaseMigrations } from './config/migrations';

async function bootstrap() {
    try {
        // Initialize database schema through migrations only
        const migrations = new DatabaseMigrations();
        await migrations.runMigrations();

        // Start the application
        const app = new App();
        app.start();
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

bootstrap();
