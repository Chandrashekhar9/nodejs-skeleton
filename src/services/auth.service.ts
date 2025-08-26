import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { LoginLogRepository } from '../repositories/login-log.repository';
import { TokenBlacklistRepository } from '../repositories/token-blacklist.repository';
import { UserCreateDTO, UserLoginDTO } from '../types/user.types';
import { LoginStatus } from '../types/login-log.types';
import { JWT_SECRET } from '../config/env';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';

export class AuthService {
    private userRepository: UserRepository;
    private loginLogRepository: LoginLogRepository;
    private tokenBlacklistRepository: TokenBlacklistRepository;
    private readonly SALT_ROUNDS = 10;
    private readonly MAX_LOGIN_ATTEMPTS = 5;
    private readonly ATTEMPT_WINDOW_MINUTES = 15;

    constructor() {
        this.userRepository = new UserRepository();
        this.loginLogRepository = new LoginLogRepository();
        this.tokenBlacklistRepository = new TokenBlacklistRepository();
    }

    async register(userData: UserCreateDTO, ipAddress: string, userAgent: string): Promise<{ token: string; user: User }> {
        try {
            const validation = User.validate(userData);
            if (!validation.isValid) {
                throw new AppError(400, validation.errors.join(', '));
            }

            const existingUser = await this.userRepository.findByEmail(userData.email);
            if (existingUser) {
                await this.logFailedAttempt(userData.email, ipAddress, userAgent, 0);
                throw new AppError(409, 'Email already registered');
            }

            const hashedPassword = await bcrypt.hash(userData.password, this.SALT_ROUNDS);
            const user = await this.userRepository.create({
                ...userData,
                password: hashedPassword
            });

            // Generate token with JTI for new user
            const jti = uuidv4();
            const token = this.generateTokenWithJti(user.id, user.email, user.role, jti);
            
            // Create login session with token information
            const loginId = await this.createLoginSessionWithToken(
                user.id, 
                user.email, 
                ipAddress, 
                userAgent, 
                jti
            );

            return { token, user };
        } catch (error) {
            if (!(error instanceof AppError)) {
                await this.logFailedAttempt(userData.email, ipAddress, userAgent, 0);
            }
            throw this.handleError(error);
        }
    }

    async login(credentials: UserLoginDTO, ipAddress: string, userAgent: string): Promise<{ token: string; user: User }> {
        try {
            await this.checkLoginAttempts(credentials.email);
            const user = await this.validateCredentials(credentials);
            
            // Close any existing sessions
            await this.closeExistingSessions(user.id);
            
            // Generate token first to get JTI
            const jti = uuidv4();
            const token = this.generateTokenWithJti(user.id, user.email, user.role, jti);
            
            // Create login session with token information
            const loginId = await this.createLoginSessionWithToken(
                user.id, 
                user.email, 
                ipAddress, 
                userAgent, 
                jti
            );

            return { token, user };
        } catch (error) {
            if (error instanceof AppError && error.statusCode !== 429) {
                await this.logFailedAttempt(credentials.email, ipAddress, userAgent, 0);
            }
            throw this.handleError(error);
        }
    }

    async logout(userId: number, tokenJti?: string): Promise<void> {
        // Close existing sessions
        await this.closeExistingSessions(userId);
        
        // Blacklist the current token if JTI is provided
        if (tokenJti) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours
            await this.tokenBlacklistRepository.blacklistToken(tokenJti, userId, expiresAt, 'logout');
            
            // Update login log with logout information
            await this.loginLogRepository.recordLogoutByTokenJti(tokenJti);
        }
    }

    private async validateCredentials(credentials: UserLoginDTO): Promise<User> {
        const user = await this.userRepository.findByEmail(credentials.email);
        if (!user) {
            throw new AppError(401, 'Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
            throw new AppError(401, 'Invalid email or password');
        }

        return user;
    }

    private async checkLoginAttempts(email: string): Promise<void> {
        const attempts = await this.loginLogRepository.getRecentFailedAttempts(email, this.ATTEMPT_WINDOW_MINUTES);
        if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
            throw new AppError(429, `Too many failed attempts. Try again after ${this.ATTEMPT_WINDOW_MINUTES} minutes.`);
        }
    }

    private async createLoginSession(userId: number, email: string, ipAddress: string, userAgent: string): Promise<number> {
        return this.loginLogRepository.create({
            user_id: userId,
            email,
            ip_address: ipAddress,
            user_agent: userAgent,
            status: LoginStatus.SUCCESS,
            login_at: new Date()
        });
    }

    private async createLoginSessionWithToken(
        userId: number, 
        email: string, 
        ipAddress: string, 
        userAgent: string, 
        tokenJti: string
    ): Promise<number> {
        return this.loginLogRepository.create({
            user_id: userId,
            email,
            ip_address: ipAddress,
            user_agent: userAgent,
            status: LoginStatus.SUCCESS,
            login_at: new Date(),
            token_jti: tokenJti
        });
    }

    private async logFailedAttempt(email: string, ipAddress: string, userAgent: string, userId: number): Promise<void> {
        await this.loginLogRepository.create({
            user_id: userId,
            email,
            ip_address: ipAddress,
            user_agent: userAgent,
            status: LoginStatus.FAILED,
            login_at: new Date()
        });
    }

    private async closeExistingSessions(userId: number): Promise<void> {
        const activeSessionId = await this.loginLogRepository.getActiveSession(userId);
        if (activeSessionId) {
            await this.loginLogRepository.recordLogout(activeSessionId);
        }
    }

    private generateToken(userId: number, email: string, role: string, loginId: number): string {
        const jti = uuidv4(); // Generate unique token ID
        return jwt.sign(
            { userId, email, role, loginId, jti },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    private generateTokenWithJti(userId: number, email: string, role: string, jti: string): string {
        return jwt.sign(
            { userId, email, role, jti },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    private handleError(error: unknown): AppError {
        if (error instanceof AppError) {
            return error;
        }
        return new AppError(
            500,
            `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}