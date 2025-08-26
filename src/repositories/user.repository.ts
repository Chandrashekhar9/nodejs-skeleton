import { pool } from '../config/database';
import { User } from '../models/user.model';
import { UserCreateDTO, UserRole } from '../types/user.types';
import { QueryResult } from 'pg';

export class UserRepository {
    /**
     * Create a new user
     * @param userData User creation data
     * @returns Created user
     */
    async create(userData: UserCreateDTO): Promise<User> {
        const query = `
            INSERT INTO users (name, email, mobile, password, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, mobile, password, role, created_at
        `;

        const values = [
            userData.name,
            userData.email,
            userData.mobile,
            userData.password,
            userData.role || UserRole.USER
        ];

        try {
            const result: QueryResult = await pool.query(query, values);
            return User.fromDB(result.rows[0]);
        } catch (error) {
            if ((error as any).code === '23505' && (error as any).constraint === 'users_email_key') {
                throw new Error('Email already exists');
            }
            throw error;
        }
    }

    /**
     * Find user by email
     * @param email User email
     * @returns User if found, null otherwise
     */
    async findByEmail(email: string): Promise<User | null> {
        const query = `
            SELECT id, name, email, mobile, password, role, created_at
            FROM users
            WHERE email = $1
        `;

        const result: QueryResult = await pool.query(query, [email]);
        return result.rows.length ? User.fromDB(result.rows[0]) : null;
    }

    /**
     * Find user by ID
     * @param id User ID
     * @returns User if found, null otherwise
     */
    async findById(id: number): Promise<User | null> {
        const query = `
            SELECT id, name, email, mobile, password, role, created_at
            FROM users
            WHERE id = $1
        `;

        const result: QueryResult = await pool.query(query, [id]);
        return result.rows.length ? User.fromDB(result.rows[0]) : null;
    }

    /**
     * Get all users
     * @param limit Maximum number of users to return
     * @param offset Number of users to skip
     * @returns Array of users
     */
    async findAll(limit: number = 10, offset: number = 0): Promise<{ users: User[], total: number }> {
        const countQuery = 'SELECT COUNT(*) FROM users';
        const query = `
            SELECT id, name, email, mobile, password, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const [countResult, usersResult] = await Promise.all([
            pool.query(countQuery),
            pool.query(query, [limit, offset])
        ]);

        return {
            users: usersResult.rows.map(row => User.fromDB(row)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Update user role
     * @param id User ID
     * @param newRole New role to assign
     * @returns Updated user
     */
    async updateRole(id: number, newRole: UserRole): Promise<User> {
        const query = `
            UPDATE users
            SET role = $1
            WHERE id = $2
            RETURNING id, name, email, mobile, password, role, created_at
        `;

        const result: QueryResult = await pool.query(query, [newRole, id]);
        
        if (!result.rows.length) {
            throw new Error('User not found');
        }

        return User.fromDB(result.rows[0]);
    }
}
