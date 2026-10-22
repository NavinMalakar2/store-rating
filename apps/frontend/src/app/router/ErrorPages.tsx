import { Link } from 'react-router-dom';
import { ShieldAlert, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HOME_BY_ROLE } from '@/constants';
import { useAuth } from '../providers/AuthProvider';

function Page({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
      {icon}
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{text}</p>
      <Button><Link to={user ? HOME_BY_ROLE[user.role] : '/login'}>{user ? 'Go to my dashboard' : 'Go to login'}</Link></Button>
    </div>
  );
}

export const UnauthorizedPage = () => <Page icon={<ShieldAlert className="h-10 w-10 text-destructive" />} title="Access denied" text="You do not have permission to view this page." />;
export const NotFoundPage = () => <Page icon={<SearchX className="h-10 w-10 text-muted-foreground" />} title="Page not found" text="The page you are looking for does not exist." />;
