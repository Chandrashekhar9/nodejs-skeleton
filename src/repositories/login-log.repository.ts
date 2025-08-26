import { pool } from '../config/database';
import { LoginLogDTO, LoginStatus } from '../types/login-log.types';
import { QueryResult } from 'pg';

export class LoginLogRepository {
    /**
     * Create a new login log entry
     */
    async create(logData: LoginLogDTO): Promise<number> {
        const query = `
            INSERT INTO login_logs (user_id, email, ip_address, user_agent, status, login_at, token_jti, token_hash)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;

        const values = [
            logData.user_id || null,
            logData.email,
            logData.ip_address,
            logData.user_agent,
            logData.status,
            logData.login_at || new Date(),
            logData.token_jti || null,
            logData.token_hash || null
        ];

        const result = await pool.query(query, values);
        return result.rows[0].id;
    }

    /**
     * Get recent failed login attempts for an email
     */
    async getRecentFailedAttempts(email: string, minutes: number = 15): Promise<number> {
        const query = `
            SELECT COUNT(*) 
            FROM login_logs 
            WHERE email = $1 
            AND status = $2 
            AND login_at > NOW() - INTERVAL '${minutes} minutes'
        `;

        const result: QueryResult = await pool.query(query, [email, LoginStatus.FAILED]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Get login history for a user
     */
    async getUserLoginHistory(userId: number, limit: number = 10): Promise<LoginLogDTO[]> {
        const query = `
            SELECT * 
            FROM login_logs 
            WHERE user_id = $1 
            ORDER BY login_at DESC 
            LIMIT $2
        `;

        const result: QueryResult = await pool.query(query, [userId, limit]);
        return result.rows;
    }

    /**
     * Get suspicious login attempts (multiple failed attempts)
     */
    async recordLogout(loginId: number): Promise<void> {
        const query = `
            UPDATE login_logs 
            SET status = $1, logout_at = NOW() 
            WHERE id = $2
        `;
        
        await pool.query(query, [LoginStatus.LOGGED_OUT, loginId]);
    }

    async getActiveSession(userId: number): Promise<number | null> {
        const query = `
            SELECT id
            FROM login_logs
            WHERE user_id = $1
            AND status = $2
            AND logout_at IS NULL
            ORDER BY login_at DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [userId, LoginStatus.SUCCESS]);
        return result.rows.length ? result.rows[0].id : null;
    }

    async getSuspiciousAttempts(threshold: number = 5, minutes: number = 15): Promise<any[]> {
        const query = `
            SELECT email, ip_address, COUNT(*) as attempts
            FROM login_logs
            WHERE status = $1
            AND login_at > NOW() - INTERVAL '${minutes} minutes'
            GROUP BY email, ip_address
            HAVING COUNT(*) >= $2
        `;

        const result: QueryResult = await pool.query(query, [LoginStatus.FAILED, threshold]);
        return result.rows;
    }

    /**
     * Find login log by token JTI
     */
    async findByTokenJti(tokenJti: string): Promise<any> {
        const query = `
            SELECT * FROM login_logs 
            WHERE token_jti = $1
            ORDER BY login_at DESC
            LIMIT 1
        `;

        const result: QueryResult = await pool.query(query, [tokenJti]);
        return result.rows.length ? result.rows[0] : null;
    }

    /**
     * Update login log with logout information by token JTI
     */
    async recordLogoutByTokenJti(tokenJti: string): Promise<void> {
        const query = `
            UPDATE login_logs 
            SET logout_at = CURRENT_TIMESTAMP, status = $1
            WHERE token_jti = $2 AND logout_at IS NULL
        `;

        await pool.query(query, [LoginStatus.LOGGED_OUT, tokenJti]);
    }
}
