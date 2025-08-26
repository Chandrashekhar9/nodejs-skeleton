import { UserRole, UserCreateDTO, UserDTO, UserValidationMessages } from '../types/user.types';

export class User {
    public id: number;
    public name: string;
    public email: string;
    public mobile: string;
    public password: string;
    public role: UserRole;
    public createdAt: Date;

    constructor(data: UserDTO) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.mobile = data.mobile;
        this.password = data.password;
        this.role = data.role;
        this.createdAt = data.created_at;
    }

    static validateEmail(email: string): boolean {
        const emailRegex = /^[a-zA-Z0-9._-]+@vectre\.in$/;
        return emailRegex.test(email);
    }

    static validateMobile(mobile: string): boolean {
        const mobileRegex = /^[0-9]{10}$/;
        return mobileRegex.test(mobile);
    }

    static validatePassword(password: string): boolean {
        return password.length >= 8;
    }

    static validate(data: UserCreateDTO): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate email
        if (!data.email || !this.validateEmail(data.email)) {
            errors.push(UserValidationMessages.EMAIL_DOMAIN);
        }

        // Validate password
        if (!data.password || !this.validatePassword(data.password)) {
            errors.push(UserValidationMessages.PASSWORD_LENGTH);
        }

        // Validate mobile
        if (!data.mobile || !this.validateMobile(data.mobile)) {
            errors.push(UserValidationMessages.MOBILE_FORMAT);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Convert User instance to a plain object (useful for responses)
    toJSON(): Omit<UserDTO, 'password'> {
        const { password, ...userWithoutPassword } = this;
        return {
            ...userWithoutPassword,
            created_at: this.createdAt
        };
    }

    // Convert database row to User instance
    static fromDB(row: any): User {
        return new User({
            id: row.id,
            name: row.name,
            email: row.email,
            mobile: row.mobile,
            password: row.password,
            role: row.role as UserRole,
            created_at: row.created_at
        });
    }
}
