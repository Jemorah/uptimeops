import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, Zap, Shield, Users, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, role, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Emergency', path: '/emergency' },
    { label: 'Status', path: '/status' },
  ];

  // Build portal links in priority order (HQ first for admin)
  const portalLinks: { label: string; path: string; icon: typeof Shield }[] = [];
  if (isAuthenticated && role === 'admin') {
    portalLinks.push({ label: 'HQ Control', path: '/hq', icon: Shield });
    portalLinks.push({ label: 'Engineer Portal', path: '/engineer', icon: Users });
    portalLinks.push({ label: 'Customer Portal', path: '/customer', icon: LayoutDashboard });
  } else if (isAuthenticated && role === 'coordinator') {
    portalLinks.push({ label: 'HQ Control', path: '/hq', icon: Shield });
    portalLinks.push({ label: 'Customer Portal', path: '/customer', icon: LayoutDashboard });
  } else if (isAuthenticated && role === 'engineer') {
    portalLinks.push({ label: 'Engineer Portal', path: '/engineer', icon: Users });
  } else if (isAuthenticated && role === 'customer') {
    portalLinks.push({ label: 'Customer Portal', path: '/customer', icon: LayoutDashboard });
  }

  return (
    <div className="min-h-screen bg-void">
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-void/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-lime" />
              <span className="text-lg font-bold tracking-tight">UPTIME<span className="text-lime">OPS</span></span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'text-lime'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  {portalLinks.length > 0 && (
                    <div className="relative group">
                      <button className="text-sm font-medium text-white/60 hover:text-white transition-colors flex items-center gap-1">
                        <LayoutDashboard className="w-4 h-4" />
                        Portals
                      </button>
                      <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <div className="bg-surface border border-white/10 rounded-md py-1 min-w-[180px]">
                          {portalLinks.map((link) => (
                            <Link
                              key={link.path}
                              to={link.path}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <link.icon className="w-4 h-4" />
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => signOut()}
                    className="text-sm font-medium text-white/60 hover:text-magenta transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/login" className="btn-lime text-sm rounded-sm">
                  Sign In
                </Link>
              )}
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-white"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-void/95 backdrop-blur-md border-b border-white/5">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block text-sm font-medium ${
                    location.pathname === link.path ? 'text-lime' : 'text-white/60'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {portalLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-2 text-sm text-white/60"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <button onClick={() => signOut()} className="text-sm text-magenta">Sign Out</button>
              ) : (
                <Link to="/login" className="btn-lime text-sm rounded-sm inline-block">Sign In</Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <main>{children}</main>
    </div>
  );
}
