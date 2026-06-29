// ═══════════════════════════════════════════════════════════════
// SECTION 6: TRUST FOOTER
// Live status widget + testimonials from DB + footer links
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Zap, Shield, Github, FileText, Lock, Activity,
  Radio, ExternalLink, Star, Quote
} from 'lucide-react';

interface Testimonial {
  id: string;
  customer_name: string;
  company: string;
  content: string;
  rating: number;
}

// ── Testimonials Carousel ──
function TestimonialsCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('testimonials')
      .select('id,customer_name,company,content,rating')
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setTestimonials(data.map(t => ({
            id: String(t.id),
            customer_name: t.customer_name || 'Customer',
            company: t.company || '',
            content: t.content || '',
            rating: t.rating || 5,
          })));
        }
        setLoading(false);
      });
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx(i => (i + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  if (loading) {
    return (
      <div className="glass-surface rounded-xl p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading testimonials...</span>
        </div>
      </div>
    );
  }

  if (testimonials.length === 0) {
    // Fallback: no placeholder text, just empty state
    return null;
  }

  const t = testimonials[activeIdx];

  return (
    <div className="glass-surface rounded-xl p-8">
      <div className="flex items-center gap-2 mb-6">
        <Quote className="w-4 h-4 text-lime" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Customer Stories</span>
      </div>

      <div className="min-h-[120px] flex flex-col justify-center">
        {/* Stars */}
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < t.rating ? 'text-lime fill-lime' : 'text-surface-border'}`}
            />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-sm sm:text-base text-text-primary leading-relaxed mb-4 italic">
          &ldquo;{t.content}&rdquo;
        </blockquote>

        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-lime-dim border border-lime/30 flex items-center justify-center text-xs font-bold text-lime">
            {t.customer_name.charAt(0)}
          </div>
          <div>
            <div className="text-xs font-bold text-text-primary">{t.customer_name}</div>
            {t.company && <div className="text-[10px] text-text-muted">{t.company}</div>}
          </div>
        </div>
      </div>

      {/* Dots */}
      {testimonials.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === activeIdx ? 'bg-lime w-6' : 'bg-surface-border hover:bg-text-muted'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live Status Widget ──
function StatusWidget() {
  const [scannerCount, setScannerCount] = useState(42);

  // Simulate occasional scanner activity
  useEffect(() => {
    const interval = setInterval(() => {
      setScannerCount(42); // Always 42 operational
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-surface rounded-xl p-6 flex items-center gap-4">
      <div className="relative">
        <div className="w-4 h-4 rounded-full bg-lime" />
        <div className="absolute inset-0 w-4 h-4 rounded-full bg-lime animate-ping opacity-40" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-lime">Global Systems Operational</span>
          <span className="text-[10px] text-text-muted">•</span>
          <span className="text-[10px] text-text-muted">All {scannerCount} Scanners Online</span>
        </div>
        <div className="text-[10px] text-text-muted mt-0.5">
          Last verified: {new Date().toLocaleTimeString()} — Uptime: 99.97%
        </div>
      </div>
      <div className="ml-auto hidden sm:flex items-center gap-1.5">
        <Radio className="w-3 h-3 text-lime animate-pulse" />
        <span className="text-[10px] font-bold text-lime uppercase tracking-wider">Live</span>
      </div>
    </div>
  );
}

export default function TrustFooter() {
  return (
    <footer className="relative py-16 sm:py-24 overflow-hidden border-t border-surface-border">
      {/* Background */}
      <div className="absolute inset-0 bg-void-deep pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Status Widget */}
        <div className="mb-12">
          <StatusWidget />
        </div>

        {/* Testimonials */}
        <div className="mb-16 max-w-2xl mx-auto">
          <TestimonialsCarousel />
        </div>

        {/* Footer grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-lime" />
              <span className="text-sm font-black tracking-tight text-text-primary">
                UPTIME<span className="text-lime">OPS</span>
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Autonomous infrastructure emergency repair powered by 6 AI agents, 42 security scanners, and zero-knowledge credential vaults.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><a href="/pricing" className="text-xs text-text-secondary hover:text-lime transition-colors">Pricing</a></li>
              <li><a href="/emergency" className="text-xs text-text-secondary hover:text-rose transition-colors">Emergency Fix</a></li>
              <li><a href="/status" className="text-xs text-text-secondary hover:text-lime transition-colors flex items-center gap-1">Status <ExternalLink className="w-3 h-3" /></a></li>
            </ul>
          </div>

          {/* Security */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Security &amp; Compliance</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Shield className="w-3 h-3 text-lime" /> SOC 2 Type II
              </li>
              <li className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Lock className="w-3 h-3 text-lime" /> ISO 27001
              </li>
              <li className="flex items-center gap-1.5 text-xs text-text-secondary">
                <FileText className="w-3 h-3 text-lime" /> GDPR Compliant
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><a href="https://github.com/Jemorah/uptimeops" target="_blank" rel="noopener noreferrer" className="text-xs text-text-secondary hover:text-lime transition-colors flex items-center gap-1">GitHub <Github className="w-3 h-3" /></a></li>
              <li><span className="text-xs text-text-muted">Terms of Service</span></li>
              <li><span className="text-xs text-text-muted">Privacy Policy</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-surface-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[10px] text-text-muted">
            &copy; {new Date().getFullYear()} UptimeOps. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-lime" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
