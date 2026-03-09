import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, MessageSquare, Settings, PlusCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, metadata } = useCurrentUser();

  const navItems = [
    { href: '/', label: 'Market', icon: Store },
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30 group-hover:shadow-violet-700/40 transition-shadow">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-100">
              zooid<span className="text-violet-400">market</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === href
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 hidden sm:flex">
                  <Link to="/listing/new">
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    List Item
                  </Link>
                </Button>
                <Link to={`/profile/${user.pubkey}`} className="shrink-0">
                  <Avatar className="w-8 h-8 ring-2 ring-zinc-700 hover:ring-violet-500 transition-all">
                    <AvatarImage src={metadata?.picture} />
                    <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">
                      {genUserName(user.pubkey).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </>
            ) : (
              <LoginArea className="max-w-48" />
            )}
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs transition-colors',
                location.pathname === href
                  ? 'text-violet-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
          {user && (
            <Link
              to="/listing/new"
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              List
            </Link>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
