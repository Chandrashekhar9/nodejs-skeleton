import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middlewares/auth.middleware';

export class AuthRoutes {
    public router: Router;
    private authController: AuthController;
    private authMiddleware: AuthMiddleware;

    constructor() {
        this.router = Router();
        this.authController = new AuthController();
        this.authMiddleware = new AuthMiddleware();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Authentication routes
        this.router.post('/register', this.authController.register);
        this.router.post('/login', this.authController.login);
        this.router.post('/logout', this.authMiddleware.verifyToken, this.authController.logout);

        // Protected route example
        this.router.get(
            '/me',
            this.authMiddleware.verifyToken,
            (req, res) => {
                res.json({
                    success: true,
                    data: req.user
                });
            }
        );
    }
}
