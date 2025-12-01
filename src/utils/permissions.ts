import { User } from '../types';

export const SUPER_ADMIN_ID = '76561197991580442';

export const isSuperAdmin = (uid: string | undefined): boolean => {
    if (!uid) return false;
    // Handle potential 'steam:' prefix
    const cleanUid = uid.replace('steam:', '');
    return cleanUid === SUPER_ADMIN_ID;
};

export const isAdmin = (user: User | null): boolean => {
    if (!user) return false;
    if (isSuperAdmin(user.uid)) return true;
    return user.role === 'admin' || user.role === 'super-admin';
};
