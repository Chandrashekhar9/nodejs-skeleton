export interface LoginLogDTO {
    id?: number;
    user_id: number;
    email: string;
    ip_address: string;
    user_agent: string;
    status: LoginStatus;
    login_at: Date;
    logout_at?: Date;
    token_jti?: string;
}

export enum LoginStatus {
    SUCCESS = 'success',
    FAILED = 'failed',
    BLOCKED = 'blocked',
    LOGGED_OUT = 'logged_out'
}

export interface LoginAttempt {
    email: string;
    ip_address: string;
    timestamp: Date;
}
