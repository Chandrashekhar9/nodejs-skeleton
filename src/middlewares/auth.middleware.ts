import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env';
import { UserRole } from '../types/user.types';
import { UserRepository } from '../repositories/user.repository';
import { TokenBlacklistRepository } from '../repositories/token-blacklist.repository';

interface JWTPayload {
    userId: number;
    email: string;
    role: UserRole;
    loginId: number;
    jti?: string;
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export class AuthMiddleware {
    private userRepository: UserRepository;
    private tokenBlacklistRepository: TokenBlacklistRepository;

    constructor() {
        this.userRepository = new UserRepository();
        this.tokenBlacklistRepository = new TokenBlacklistRepository();
    }

    /**
     * Verify JWT token from Authorization header
     */
    verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                res.status(401).json({
                    success: false,
                    message: 'No token provided'
                });
                return;
            }

            const token = authHeader.split(' ')[1]; // Bearer <token>

            const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
            
            // Check if token is blacklisted (only if JTI exists)
            if (decoded.jti) {
                const isBlacklisted = await this.tokenBlacklistRepository.isTokenBlacklisted(decoded.jti);
                if (isBlacklisted) {
                    res.status(401).json({
                        success: false,
                        message: 'Unauthorized token!'
                    });
                    return;
                }
            }

            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized token!'
            });
        }
    };

    /**
     * Check if user has required role
     */
    hasRole = (roles: UserRole[]) => {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                if (!req.user) {
                    res.status(401).json({
                        success: false,
                        message: 'User not authenticated'
                    });
                    return;
                }

                if (!roles.includes(req.user.role)) {
                    res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                    return;
                }

                next();
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Error checking user role'
                });
            }
        };
    };
}