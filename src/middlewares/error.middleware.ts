import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message,
            isOperational: error.isOperational
        });
        return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            message: error.message,
            isOperational: true
        });
        return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            isOperational: true
        });
        return;
    }

    // Handle JWT expiration
    if (error.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token expired',
            isOperational: true
        });
        return;
    }

    // Log unexpected errors
    console.error('Unexpected error:', error);

    // Send generic error response for unexpected errors
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        isOperational: false
    });
};
