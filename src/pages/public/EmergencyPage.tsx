import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Globe, Send,
  Shield, Clock, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function EmergencyPage() {
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a site URL');
      return;
    }
    setIsSubmitting(true);
    // Simulate submission - in real app, call Supabase edge function
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    setStep('submitted');
    toast.success('Emergency ticket created! AI triage initiated.');
  };

  const severityConfig = {
    critical: { color: 'bg-red-500', label: 'CRITICAL', desc: 'Site completely down' },
    high: { color: 'bg-orange-500', label: 'HIGH', desc: 'Major functionality impaired' },
    medium: { color: 'bg-yellow-500', label: 'MEDIUM', desc: 'Partial degradation' },
    low: { color: 'bg-blue-500', label: 'LOW', desc: 'Minor issue / cosmetic' },
  };

  if (step === 'submitted') {
    return (
      <div className="pt-24 pb-16 min-h-screen flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-lime/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-lime" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-4">EMERGENCY LOGGED</h1>
          <p className="text-white/60 mb-2">
            Your ticket has been created and AI triage has started.
          </p>
          <p className="text-sm font-mono text-lime mb-8">
            TICKET: UPX-{Math.random().toString(36).substring(2, 10).toUpperCase()}
          </p>

          <div className="bg-surface border border-white/5 p-6 mb-8 text-left">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="status-dot status-dot-active" />
                <div>
                  <div className="text-sm font-medium">AI Triage</div>
                  <div className="text-xs text-white/40 font-mono">IN PROGRESS</div>
                </div>
              </div>
              <div className="w-px h-4 bg-white/10 ml-1" />
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div>
                  <div className="text-sm font-medium text-white/40">Isolation</div>
                  <div className="text-xs text-white/30 font-mono">QUEUED</div>
                </div>
              </div>
              <div className="w-px h-4 bg-white/10 ml-1" />
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div>
                  <div className="text-sm font-medium text-white/40">Repair</div>
                  <div className="text-xs text-white/30 font-mono">PENDING</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/" className="btn-lime text-sm rounded-sm inline-flex items-center justify-center gap-2">
              <Activity className="w-4 h-4" />
              View Live Dashboard
            </Link>
            <button onClick={() => setStep('form')} className="text-sm text-white/40 hover:text-white transition-colors">
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-magenta" />
            <span className="text-magenta text-xs font-mono uppercase tracking-widest">Emergency Fix</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            REPORT AN EMERGENCY
          </h1>
          <p className="text-white/60">
            Our AI agents will immediately begin triage. For non-emergencies, please use the regular support channels.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-surface border border-white/5 p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Site URL
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Severity Level
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(Object.keys(severityConfig) as Array<keyof typeof severityConfig>).map((level) => {
                  const config = severityConfig[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSeverity(level)}
                      className={`p-3 border text-left transition-all ${
                        severity === level
                          ? 'border-lime bg-lime/5'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                        <span className={`text-xs font-bold ${severity === level ? 'text-lime' : 'text-white/60'}`}>
                          {config.label}
                        </span>
                      </div>
                      <span className="text-xs text-white/40">{config.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                What's happening?
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue... error messages, when it started, what you've tried..."
                rows={4}
                className="bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                Contact Email
              </label>
              <Input
                type="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="you@company.com"
                className="bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="w-4 h-4" />
              <span>AI response within 60 seconds</span>
            </div>
            <div className="flex gap-3">
              <Link
                to="/"
                className="px-6 py-3 border border-white/20 text-white text-sm font-medium hover:border-white/40 transition-colors"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="btn-lime text-sm rounded-sm border-0"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-spin" />
                    Initiating Triage...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Submit Emergency
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
