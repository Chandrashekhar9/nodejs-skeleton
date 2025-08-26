import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { IndexRoutes } from './routes/index.routes';
import { errorHandler } from './middlewares/error.middleware';
import { PORT } from './config/env';

export class App {
    private app: Express;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmet());
        this.app.use(cors());
        
        // Body parsing middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Compression middleware
        this.app.use(compression());
    }

    private setupRoutes(): void {
        // Health check route
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // API routes
        this.app.use('/api', new IndexRoutes().router);
    }

    private setupErrorHandling(): void {
        // Error handling middleware
        this.app.use(errorHandler);
    }

    public start(): void {
        this.app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
}
