export enum UserRole {
    ADMIN = 'admin',
    USER = 'user'
}

export interface UserCreateDTO {
    name: string;
    email: string;
    mobile: string;
    password: string;
    role?: UserRole;
}

export interface UserLoginDTO {
    email: string;
    password: string;
}

// For internal use - represents how user data is stored in the database
export interface UserDTO extends UserCreateDTO {
    id: number;
    role: UserRole;
    created_at: Date;
}

// Custom error messages for validation
export const UserValidationMessages = {
    EMAIL_DOMAIN: 'Email must be from the vectre.in domain',
    EMAIL_FORMAT: 'Invalid email format',
    PASSWORD_LENGTH: 'Password must be at least 8 characters long',
    MOBILE_FORMAT: 'Mobile number must be a valid 10-digit number'
} as const;
