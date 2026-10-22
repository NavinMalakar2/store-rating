import { KeyRound, LayoutDashboard, LucideIcon, Star, Store, Users } from 'lucide-react';
import { Role } from '@/types';

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/stores', label: 'Stores', icon: Store },
    { to: '/account/password', label: 'Password', icon: KeyRound },
  ],
  USER: [
    { to: '/stores', label: 'Stores', icon: Store },
    { to: '/account/password', label: 'Password', icon: KeyRound },
  ],
  STORE_OWNER: [
    { to: '/owner', label: 'My Store', icon: Star },
    { to: '/account/password', label: 'Password', icon: KeyRound },
  ],
};
