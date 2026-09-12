export type Workspace = {
    id: number;
    name: string;
    slug: string;
    phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
};

export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    role?: 'superadmin' | 'admin' | 'cashier' | string;
    workspace_id?: number | null;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    role?: string | null;
    workspace?: Workspace | null;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
