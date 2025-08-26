import { QueryResult } from 'pg';
import { pool } from '../config/database';

export class TokenBlacklistRepository {
    /**
     * Add a token to the blacklist
     */
    async blacklistToken(tokenJti: string, userId: number, expiresAt: Date, reason: string = 'logout'): Promise<void> {
        const query = `
            INSERT INTO token_blacklist (token_jti, user_id, expires_at, reason)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (token_jti) DO NOTHING
        `;

        await pool.query(query, [tokenJti, userId, expiresAt, reason]);
    }

    /**
     * Check if a token is blacklisted
     */
    async isTokenBlacklisted(tokenJti: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM token_blacklist 
            WHERE token_jti = $1 AND expires_at > NOW()
        `;

        const result: QueryResult = await pool.query(query, [tokenJti]);
        return result.rows.length > 0;
    }

    /**
     * Clean up expired tokens from blacklist
     */
    async cleanupExpiredTokens(): Promise<void> {
        const query = `
            DELETE FROM token_blacklist 
            WHERE expires_at <= NOW()
        `;

        await pool.query(query);
    }

    /**
     * Blacklist all tokens for a user (useful for security incidents)
     */
    async blacklistAllUserTokens(userId: number, reason: string = 'security_incident'): Promise<void> {
        // This would require storing all active tokens, which is complex
        // For now, we'll just log this action
        console.log(`All tokens for user ${userId} should be invalidated due to: ${reason}`);
    }
}
