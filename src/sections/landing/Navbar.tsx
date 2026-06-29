// ═══════════════════════════════════════════════════════════════
// LANDING NAVBAR — Sticky transparent with blur
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Menu, X } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dashboardPath =
    role === 'admin' || role === 'coordinator' ? '/hq' :
    role === 'engineer' ? '/engineer' :
    role === 'customer' ? '/customer' : '';

  const navLinks = [
    { label: 'Pipeline', href: '#pipeline' },
    { label: 'Security', href: '#security' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Vault', href: '#vault' },
  ];

  const scrollTo = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-void-deep/90 backdrop-blur-md border-b border-surface-border/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-lime" />
          <span className="text-sm font-black tracking-tight text-text-primary">
            UPTIME<span className="text-lime">OPS</span>
          </span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.href)}
              className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider"
            >
              {link.label}
            </button>
          ))}

          {isAuthenticated && dashboardPath ? (
            <button
              onClick={() => navigate(dashboardPath)}
              className="px-4 py-2 bg-lime text-void-deep text-xs font-black uppercase tracking-wider rounded hover:bg-lime-light transition-colors"
            >
              Dashboard
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login?intent=subscribe')}
                className="px-4 py-2 bg-lime text-void-deep text-xs font-black uppercase tracking-wider rounded hover:bg-lime-light transition-colors"
              >
                Get Protected
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-text-muted hover:text-text-primary"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-void-deep/95 backdrop-blur-md border-t border-surface-border/50 px-6 py-4 space-y-3">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.href)}
              className="block w-full text-left text-sm font-semibold text-text-muted hover:text-text-primary py-2"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-surface-border/50 space-y-2">
            <button
              onClick={() => { setMenuOpen(false); navigate('/login'); }}
              className="block w-full text-left text-sm font-semibold text-text-muted hover:text-text-primary py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => { setMenuOpen(false); navigate('/login?intent=subscribe'); }}
              className="w-full py-2.5 bg-lime text-void-deep text-xs font-black uppercase tracking-wider rounded"
            >
              Get Protected
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
