import { Router } from 'express';
import { AuthRoutes } from './auth.routes';

export class IndexRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Authentication routes - /api/auth/*
        this.router.use('/v1/auth', new AuthRoutes().router);

        // Add new route groups here
        // Example:
        // this.router.use('/users', new UserRoutes().router);
        // this.router.use('/admin', new AdminRoutes().router);
        // this.router.use('/notifications', new NotificationRoutes().router);
        // this.router.use('/analytics', new AnalyticsRoutes().router);
        // this.router.use('/settings', new SettingsRoutes().router);
        // this.router.use('/uploads', new UploadRoutes().router);
        // etc...
    }
}
