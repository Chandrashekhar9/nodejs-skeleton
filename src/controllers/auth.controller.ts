import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { UserCreateDTO, UserLoginDTO } from '../types/user.types';
import { AppError } from '../middlewares/error.middleware';

export class AuthController {
    private authService: AuthService;

    constructor() {
        this.authService = new AuthService();
    }

    /**
     * Register new user
     */
    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const userData: UserCreateDTO = req.body;
            const ipAddress = req.ip || '0.0.0.0';
            const userAgent = req.get('user-agent') || 'Unknown';

            const result = await this.authService.register(userData, ipAddress, userAgent);
            
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    token: result.token,
                    user: result.user.toJSON()
                }
            });
        } catch (error) {
            const statusCode = error instanceof AppError ? error.statusCode : 400;
            res.status(statusCode).json({
                success: false,
                message: error instanceof Error ? error.message : 'Registration failed'
            });
        }
    };

    /**
     * Login user
     */
    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const credentials: UserLoginDTO = req.body;
            const ipAddress = req.ip || '0.0.0.0';
            const userAgent = req.get('user-agent') || 'Unknown';
            
            const result = await this.authService.login(credentials, ipAddress, userAgent);
            
            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    token: result.token,
                    user: result.user.toJSON(),
                    loginTime: new Date()
                }
            });
        } catch (error) {
            const statusCode = error instanceof AppError ? error.statusCode : 401;
            res.status(statusCode).json({
                success: false,
                message: error instanceof Error ? error.message : 'Authentication failed'
            });
        }
    };

    /**
     * Logout user
     */
    logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.userId;
            const tokenJti = req.user?.jti;
            
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
                return;
            }

            await this.authService.logout(userId, tokenJti);
            
            res.status(200).json({
                success: true,
                message: 'Logout successful',
                data: {
                    logoutTime: new Date()
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Logout failed'
            });
        }
    };
}