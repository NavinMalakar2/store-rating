import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { ROLE_LABELS } from '@/constants';
import { cn } from '@/lib/utils';
import { useAuth } from '../providers/AuthProvider';
import { NAV_BY_ROLE } from './navigation';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV_BY_ROLE[user.role];

  const onLogout = async () => {
    try { await logout(); } catch { toast.error('Could not reach the server, but you have been signed out locally.'); }
    navigate('/login', { replace: true });
  };

  const nav = (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 p-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        >
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-5 font-semibold"><Star className="h-5 w-5 fill-primary text-primary" /> StoreRate</div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-5 font-semibold">
              <span className="flex items-center gap-2"><Star className="h-5 w-5 fill-primary text-primary" /> StoreRate</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[220px] truncate text-sm font-medium" title={user.name}>{user.name}</p>
              <p className="max-w-[220px] truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge tone="primary">{ROLE_LABELS[user.role]}</Badge>
            <Button variant="outline" size="sm" onClick={onLogout}><LogOut className="h-4 w-4" /> Log out</Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          <ErrorBoundary><Outlet /></ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
