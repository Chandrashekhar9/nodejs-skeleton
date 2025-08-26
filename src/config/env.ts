import dotenv from 'dotenv';
import { config } from 'process';

// Load environment variables from .env file
dotenv.config();

// Server configuration
export const PORT = process.env.PORT || 3000;

// Database configuration
export const DB_USER = process.env.DB_USER;
export const DB_HOST = process.env.DB_HOST;
export const DB_NAME = process.env.DB_NAME;
export const DB_PASS = process.env.DB_PASS;
export const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret';

// Validate required environment variables
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASS', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}
