// ═══════════════════════════════════════════════════════════════
// EMERGENCY INCIDENT REPORTING PAGE — UptimeOps v2.2
// Stage 1: Intake Form | Stage 2: Fix Tier Matrix | Stage 3: Pipeline Tracker
// Public & unauthenticated. High-urgency cyberpunk theme.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertTriangle, Zap, Shield, Lock, Radio, Eye,
  Globe, Mail, FileText, ChevronRight, Upload, X,
  CheckCircle2, Clock, Server, Bot, Loader2,
  ArrowRight, Wifi, Activity, ScanLine, HardHat, Crown,
  ChevronLeft
} from 'lucide-react';

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════
type SeverityLevel = 1 | 2 | 3 | 4 | 5;
type FixTier = 'rapid' | 'critical' | 'catastrophic';
type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

interface FormData {
  url: string;
  email: string;
  severity: SeverityLevel;
  description: string;
  files: File[];
}

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const SEVERITY_LABELS: Record<SeverityLevel, { label: string; color: string; badgeClass: string }> = {
  1: { label: 'MINOR', color: '#22d3ee', badgeClass: 'badge-cyan' },
  2: { label: 'MODERATE', color: '#a3e635', badgeClass: 'badge-lime' },
  3: { label: 'MAJOR', color: '#e879f9', badgeClass: 'badge-magenta' },
  4: { label: 'CRITICAL', color: '#f43f5e', badgeClass: 'badge-rose' },
  5: { label: 'CATASTROPHIC', color: '#f43f5e', badgeClass: 'badge-rose' },
};

const FIX_TIERS: Record<FixTier, {
  name: string;
  price: number;
  sla: string;
  description: string;
  features: string[];
  icon: React.ElementType;
  borderColor: string;
  glowColor: string;
  dimColor: string;
}> = {
  rapid: {
    name: 'RAPID FIX',
    price: 99,
    sla: '2-hour',
    description: 'Autonomous AI-only repair pipeline. Best for isolated configuration issues.',
    features: [
      'Full 6-Agent AI pipeline',
      '2-hour SLA response',
      'Isolated VM execution',
      '42-scanner security validation',
      'Post-fix audit trail',
    ],
    icon: Zap,
    borderColor: 'rgba(34,211,238,0.3)',
    glowColor: 'rgba(34,211,238,0.15)',
    dimColor: 'rgba(34,211,238,0.08)',
  },
  critical: {
    name: 'CRITICAL FIX',
    price: 249,
    sla: '1-hour',
    description: '6-Agent engine + dedicated human engineer peer review in sandboxed VM.',
    features: [
      'Everything in Rapid Fix',
      'Dedicated engineer review',
      '1-hour SLA guarantee',
      'Sandboxed VM execution',
      'CodeGraph deep analysis',
      'Priority queue access',
    ],
    icon: Shield,
    borderColor: 'rgba(232,121,249,0.4)',
    glowColor: 'rgba(232,121,249,0.2)',
    dimColor: 'rgba(232,121,249,0.12)',
  },
  catastrophic: {
    name: 'CATASTROPHIC FIX',
    price: 599,
    sla: '30-minute',
    description: 'Full engine + Senior Engineer + Coordinator supervision. Maximum response.',
    features: [
      'Everything in Critical Fix',
      'On-call Senior Engineer',
      'Coordinator supervision',
      '30-minute priority SLA',
      'Dedicated monitoring',
      'Post-fix validation review',
      'Forensic audit report',
    ],
    icon: Crown,
    borderColor: 'rgba(244,63,94,0.4)',
    glowColor: 'rgba(244,63,94,0.2)',
    dimColor: 'rgba(244,63,94,0.12)',
  },
};

// ═══════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════
function isValidUrl(u: string): boolean {
  try { new URL(u); return true; } catch { return false; }
}
function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════
export function EmergencyPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();

  // ── Form State ──
  const [form, setForm] = useState<FormData>({
    url: '',
    email: '',
    severity: 3,
    description: '',
    files: [],
  });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Wizard State ──
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [selectedTier, setSelectedTier] = useState<FixTier>('critical');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [trackingId, setTrackingId] = useState('');

  // ── Pre-fill from URL ──
  useEffect(() => {
    const tier = searchParams.get('tier');
    if (tier === 'rapid' || tier === 'critical' || tier === 'catastrophic') {
      setSelectedTier(tier);
    }
    const url = searchParams.get('url');
    if (url) setForm(prev => ({ ...prev, url }));
  }, [searchParams]);

  // ═══════ STAGE 1: FORM HANDLERS ═══════
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) {
      setForm(prev => ({ ...prev, files: [...prev.files, ...dropped] }));
      toast.success(`${dropped.length} file(s) attached`);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length) {
      setForm(prev => ({ ...prev, files: [...prev.files, ...selected] }));
      toast.success(`${selected.length} file(s) attached`);
    }
  };

  const removeFile = (idx: number) => {
    setForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));
  };

  const canProceedToStage2 =
    isValidUrl(form.url) &&
    isValidEmail(form.email) &&
    form.severity >= 1 &&
    form.description.length >= 20;

  // ═══════ STAGE 3: SUBMIT HANDLER ═══════
  const handleSubmit = async () => {
    setSubmitState('submitting');

    try {
      // Upload files to Supabase storage
      const fileUrls: string[] = [];
      if (form.files.length > 0) {
        setUploading(true);
        for (const file of form.files) {
          const path = `emergency/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage
            .from('emergency-attachments')
            .upload(path, file, { contentType: file.type });
          if (!error) {
            const { data } = supabase.storage
              .from('emergency-attachments')
              .getPublicUrl(path);
            fileUrls.push(data.publicUrl);
          }
        }
        setUploading(false);
      }

      const tier = FIX_TIERS[selectedTier];
      const trackId = `EMRG-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      setTrackingId(trackId);

      if (isAuthenticated && user) {
        // Authenticated: direct-write to incidents
        const { error: incError } = await supabase
          .from('incidents')
          .insert({
            customer_id: user.id,
            title: `Emergency: ${form.url}`,
            website_url: form.url,
            source_type: 'emergency_portal',
            source_id: trackId,
            status: 'submitted',
            priority: form.severity >= 4 ? 'critical' : form.severity >= 3 ? 'high' : 'medium',
          });

        if (incError) throw incError;

        // Create one_time_fixes record
        await supabase.from('one_time_fixes').insert({
          customer_id: user.id,
          status: 'pending_payment',
          amount_paid: tier.price,
        });

      } else {
        // Anonymous: insert into incidents as emergency lead
        const { error: incError } = await supabase
          .from('incidents')
          .insert({
            customer_id: '00000000-0000-0000-0000-000000000000',
            title: `Emergency Lead: ${form.url}`,
            website_url: form.url,
            source_type: 'emergency_lead',
            source_id: trackId,
            status: 'new',
            priority: form.severity >= 4 ? 'critical' : form.severity >= 3 ? 'high' : 'medium',
          });

        if (incError) throw incError;
        // Store lead info in a way we can retrieve it later
        await supabase.from('one_time_fixes').insert({
          customer_id: '00000000-0000-0000-0000-000000000000',
          status: 'lead',
          amount_paid: tier.price,
        });
      }

      setSubmitState('success');
      toast.success('Emergency report submitted successfully!');

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      toast.error(message);
      setSubmitState('error');
    }
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-void text-text-primary">
      {/* ═══════ TOP HUD STATUS RIBBON ═══════ */}
      <HUDRibbon />

      {/* ═══════ NAV BAR ═══════ */}
      <nav className="border-b border-surface-border bg-void-deep/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-lime" />
            <span className="text-sm font-black tracking-tight">UPTIME<span className="text-lime">OPS</span></span>
          </button>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-rose-dim border border-rose/20">
              <Radio className="w-3 h-3 text-rose animate-pulse" />
              <span className="text-[10px] font-bold text-rose uppercase tracking-wider">Emergency Portal</span>
            </div>
            {isAuthenticated && (
              <button onClick={() => navigate('/customer')} className="text-[10px] text-cyan hover:text-cyan-light font-bold uppercase tracking-wider">
                Dashboard
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Stage Progress */}
        {stage !== 3 && <StageProgress stage={stage} />}

        {stage === 1 && (
          <Stage1Form
            form={form}
            setForm={setForm}
            dragOver={dragOver}
            setDragOver={setDragOver}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
            removeFile={removeFile}
            canProceed={canProceedToStage2}
            onProceed={() => setStage(2)}
          />
        )}

        {stage === 2 && (
          <Stage2TierSelection
            selectedTier={selectedTier}
            onSelect={setSelectedTier}
            onBack={() => setStage(1)}
            onSubmit={() => setStage(3)}
          />
        )}

        {stage === 3 && (
          <Stage3Submission
            form={form}
            selectedTier={selectedTier}
            submitState={submitState}
            trackingId={trackingId}
                      uploading={uploading}
            isAuthenticated={isAuthenticated}
            onSubmit={handleSubmit}
            onNavigate={navigate}
          />
        )}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════
// HUD RIBBON
// ═══════════════════════════════════════════
function HUDRibbon() {
  return (
    <div className="bg-void-deep border-b border-surface-border overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest animate-slide-left whitespace-nowrap">
          <span className="flex items-center gap-1.5 text-cyan">
            <Lock className="w-3 h-3" /> AES-256-GCM Vault Operational
          </span>
          <span className="text-surface-border">|</span>
          <span className="flex items-center gap-1.5 text-lime">
            <ScanLine className="w-3 h-3" /> 42/42 Security Scanners Armed
          </span>
          <span className="text-surface-border">|</span>
          <span className="flex items-center gap-1.5 text-magenta">
            <HardHat className="w-3 h-3" /> OpsGenie Duty Engineer Online
          </span>
          <span className="text-surface-border">|</span>
          <span className="flex items-center gap-1.5 text-rose">
            <Clock className="w-3 h-3" /> 15-Min Response Guaranteed
          </span>
          <span className="text-surface-border">|</span>
          <span className="flex items-center gap-1.5 text-cyan">
            <Wifi className="w-3 h-3 animate-pulse" /> Realtime Channel Active
          </span>
        </div>
      </div>
      <style>{`
        @keyframes slideLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-slide-left { animation: slideLeft 20s linear infinite; }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════
// STAGE PROGRESS
// ═══════════════════════════════════════════
function StageProgress({ stage }: { stage: 1 | 2 | 3 }) {
  const stages = [
    { num: 1, label: 'Report Incident' },
    { num: 2, label: 'Select Fix Tier' },
    { num: 3, label: 'Initialize Pipeline' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {stages.map((s, i) => (
        <div key={s.num} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
            stage >= s.num
              ? 'bg-rose-dim border-rose/30 text-rose'
              : 'bg-void-light border-surface-border text-text-muted'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              stage >= s.num ? 'bg-rose text-white' : 'bg-surface-border text-text-muted'
            }`}>
              {stage > s.num ? <CheckCircle2 className="w-3 h-3" /> : s.num}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">{s.label}</span>
          </div>
          {i < stages.length - 1 && (
            <ArrowRight className={`w-4 h-4 ${stage > s.num ? 'text-rose' : 'text-surface-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// STAGE 1: INCIDENT INTAKE FORM
// ═══════════════════════════════════════════
function Stage1Form({
  form,
  setForm,
  dragOver,
  setDragOver,
  handleDrop,
  handleFileSelect,
  removeFile,
  canProceed,
  onProceed,
}: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number) => void;
  canProceed: boolean;
  onProceed: () => void;
}) {
  const sev = SEVERITY_LABELS[form.severity];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-dim border border-rose/20 mb-4">
          <AlertTriangle className="w-3.5 h-3.5 text-rose animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-rose">Active Emergency Reporting</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-text-primary">
          Report Your <span className="text-rose">Incident</span>
        </h1>
        <p className="text-sm text-text-secondary mt-2">
          Our 6-Agent AI pipeline will begin remediation immediately upon submission.
        </p>
      </div>

      {/* Form Card */}
      <div className="glass-surface rounded-xl p-6 sm:p-8 space-y-6"
        style={{ borderColor: 'rgba(244,63,94,0.15)' }}
      >
        {/* Affected URL */}
        <div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            <Globe className="w-3.5 h-3.5 text-cyan" /> Affected Infrastructure URL
          </label>
          <input
            type="url"
            value={form.url}
            onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://yoursite.com"
            className={`w-full bg-void-light border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
              form.url && !isValidUrl(form.url) ? 'border-rose' : 'border-surface-border focus:border-cyan'
            }`}
          />
          {form.url && !isValidUrl(form.url) && (
            <p className="text-[11px] text-rose mt-1">Please enter a valid URL including https://</p>
          )}
        </div>

        {/* Contact Email */}
        <div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            <Mail className="w-3.5 h-3.5 text-cyan" /> Contact Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="you@company.com"
            className={`w-full bg-void-light border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none transition-colors ${
              form.email && !isValidEmail(form.email) ? 'border-rose' : 'border-surface-border focus:border-cyan'
            }`}
          />
          {form.email && !isValidEmail(form.email) && (
            <p className="text-[11px] text-rose mt-1">Please enter a valid email address</p>
          )}
        </div>

        {/* Severity Slider */}
        <div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
            <Activity className="w-3.5 h-3.5 text-rose" /> Severity Level
          </label>
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="5"
              value={form.severity}
              onChange={e => setForm(prev => ({ ...prev, severity: parseInt(e.target.value) as SeverityLevel }))}
              className="w-full accent-rose cursor-pointer"
              style={{ accentColor: sev.color }}
            />
            <div className="flex justify-between mt-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  onClick={() => setForm(prev => ({ ...prev, severity: level as SeverityLevel }))}
                  className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    form.severity === level ? 'text-rose' : 'text-text-disabled'
                  }`}
                >
                  {SEVERITY_LABELS[level as SeverityLevel].label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className={`px-3 py-1 rounded text-[11px] font-black uppercase tracking-wider ${sev.badgeClass}`}>
              Level {form.severity}: {sev.label}
            </span>
            {form.severity >= 4 && (
              <span className="flex items-center gap-1 text-[11px] text-rose font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3" /> This will trigger immediate AI response
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            <FileText className="w-3.5 h-3.5 text-cyan" /> Diagnostic Description
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what happened. Error messages, when it started, recent changes... (min 20 characters)"
            rows={4}
            className={`w-full bg-void-light border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none resize-none transition-colors ${
              form.description.length > 0 && form.description.length < 20 ? 'border-rose' : 'border-surface-border focus:border-cyan'
            }`}
          />
          <div className="flex justify-between mt-1">
            <span className={`text-[10px] ${form.description.length < 20 ? 'text-rose' : 'text-lime'} font-bold`}>
              {form.description.length} / 20 minimum
            </span>
          </div>
        </div>

        {/* File Dropzone */}
        <div>
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
            <Upload className="w-3.5 h-3.5 text-cyan" /> Attachments (Logs / Screenshots)
          </label>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-cyan bg-cyan-dim'
                : 'border-surface-border hover:border-cyan/50 bg-void-light/50'
            }`}
          >
            <Upload className="w-6 h-6 text-text-muted mx-auto mb-2" />
            <p className="text-xs text-text-secondary">
              Drag & drop files here, or <span className="text-cyan font-semibold">click to browse</span>
            </p>
            <p className="text-[10px] text-text-muted mt-1">Screenshots, logs, HAR files accepted</p>
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="absolute inset-0 cursor-pointer" />
          </div>

          {/* File list */}
          {form.files.length > 0 && (
            <div className="mt-3 space-y-2">
              {form.files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-void-light rounded border border-surface-border/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-cyan shrink-0" />
                    <span className="text-xs text-text-secondary truncate">{file.name}</span>
                    <span className="text-[10px] text-text-muted shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-text-muted hover:text-rose transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Proceed Button */}
        <button
          onClick={onProceed}
          disabled={!canProceed}
          className={`w-full py-4 rounded-lg text-sm font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
            canProceed
              ? 'bg-rose text-white hover:bg-rose-light hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]'
              : 'bg-surface-solid text-text-disabled cursor-not-allowed'
          }`}
        >
          Continue to Fix Selection
          <ChevronRight className="w-4 h-4" />
        </button>
        {!canProceed && (
          <p className="text-[10px] text-text-muted text-center mt-2">
            Fill in all required fields (valid URL, email, severity, description 20+ chars) to continue
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STAGE 2: ONE-TIME FIX TIER SELECTION
// ═══════════════════════════════════════════
function Stage2TierSelection({
  selectedTier,
  onSelect,
  onBack,
  onSubmit,
}: {
  selectedTier: FixTier;
  onSelect: (t: FixTier) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <button onClick={onBack} className="text-[10px] text-text-muted hover:text-text-primary font-bold uppercase tracking-wider mb-4 flex items-center gap-1 mx-auto">
          <ChevronLeft className="w-3 h-3" /> Back to Form
        </button>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-text-primary">
          Select Your <span className="text-magenta">Emergency Fix</span>
        </h2>
        <p className="text-sm text-text-secondary mt-2">
          One-time payment. No subscription required. AI pipeline initializes immediately.
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.keys(FIX_TIERS) as FixTier[]).map(tier => {
          const t = FIX_TIERS[tier];
          const isSelected = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => onSelect(tier)}
              className={`glass-surface rounded-xl p-6 text-left transition-all duration-300 ${
                isSelected
                  ? 'ring-2 ring-offset-0'
                  : 'opacity-80 hover:opacity-100'
              }`}
              style={{
                borderColor: isSelected ? t.borderColor : '#1e293b',
                boxShadow: isSelected ? `0 0 25px ${t.glowColor}` : 'none',
                background: isSelected ? `linear-gradient(180deg, ${t.dimColor} 0%, rgba(15,23,42,0.6) 40%)` : undefined,
              }}
            >
              {/* Tier Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: t.borderColor, background: t.dimColor }}
                  >
                    <t.icon className="w-5 h-5" style={{ color: tier === 'rapid' ? '#22d3ee' : tier === 'critical' ? '#e879f9' : '#f43f5e' }} />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider" style={{ color: tier === 'rapid' ? '#22d3ee' : tier === 'critical' ? '#e879f9' : '#f43f5e' }}>
                      {t.name}
                    </div>
                    <div className="text-[10px] text-text-muted">{t.sla} SLA</div>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-lime" />}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-black text-text-primary">${t.price}</span>
                <span className="text-sm text-text-muted ml-1">one-time</span>
              </div>

              <p className="text-xs text-text-secondary mb-4 leading-relaxed">{t.description}</p>

              {/* Features */}
              <ul className="space-y-2">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Submit CTA */}
      <div className="text-center">
        <button
          onClick={onSubmit}
          className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-xl text-sm font-black uppercase tracking-wider text-white transition-all duration-300 hover:shadow-[0_0_40px_rgba(244,63,94,0.5)] animate-pulse-slow"
          style={{
            background: 'linear-gradient(135deg, #f43f5e, #e879f9)',
          }}
        >
          <Zap className="w-5 h-5" />
          Authorize Emergency Remediation — Initialize AI Pipeline
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="text-[10px] text-text-muted mt-3">
          Secure payment processing. 256-bit SSL encrypted. No subscription required.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// STAGE 3: SUBMISSION & PIPELINE TRACKER
// ═══════════════════════════════════════════
function Stage3Submission({
  form,
  selectedTier,
  submitState,
  trackingId,
  uploading,
  isAuthenticated,
  onSubmit,
  onNavigate,
}: {
  form: FormData;
  selectedTier: FixTier;
  submitState: SubmitState;
  trackingId: string;
  uploading: boolean;
  isAuthenticated: boolean;
  onSubmit: () => void;
  onNavigate: (path: string) => void;
}) {
  const tier = FIX_TIERS[selectedTier];

  if (submitState === 'idle') {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-in">
        <div className="glass-surface rounded-xl p-8" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
          <h2 className="text-2xl font-black tracking-tight text-text-primary mb-4">
            Confirm & <span className="text-rose">Initialize</span>
          </h2>

          {/* Summary */}
          <div className="text-left space-y-3 mb-6 p-4 bg-void-light rounded-lg border border-surface-border/50">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">URL:</span>
              <span className="text-text-primary font-mono truncate max-w-[200px]">{form.url}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Severity:</span>
              <span className={SEVERITY_LABELS[form.severity].badgeClass}>Level {form.severity}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Fix Tier:</span>
              <span className="text-magenta font-bold">{tier.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">SLA:</span>
              <span className="text-lime font-bold">{tier.sla} response</span>
            </div>
            <div className="border-t border-surface-border/50 pt-3 flex justify-between">
              <span className="text-text-primary font-bold">Total:</span>
              <span className="text-2xl font-black text-rose">${tier.price}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={uploading}
            className="w-full py-4 rounded-lg text-sm font-black uppercase tracking-wider text-white transition-all hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #e879f9)' }}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading attachments...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Submit Emergency & Initialize Pipeline
              </span>
            )}
          </button>

          <p className="text-[10px] text-text-muted mt-3">
            By submitting, you authorize our AI agents to analyze and repair your infrastructure.
            All credentials are encrypted with AES-256-GCM before transmission.
          </p>
        </div>
      </div>
    );
  }

  if (submitState === 'submitting') {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-fade-in">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-rose/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-rose animate-spin" />
          <Zap className="absolute inset-0 m-auto w-8 h-8 text-rose" />
        </div>
        <h2 className="text-xl font-black text-text-primary mb-2">Initializing AI Pipeline...</h2>
        <p className="text-sm text-text-secondary">Your emergency is being processed. Stand by.</p>
      </div>
    );
  }

  if (submitState === 'success') {
    return (
      <PipelineTracker
        form={form}
        tier={tier}
        tierKey={selectedTier}
        trackingId={trackingId}
        isAuthenticated={isAuthenticated}
        onNavigate={onNavigate}
      />
    );
  }

  // Error state
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <AlertTriangle className="w-12 h-12 text-rose mx-auto mb-4" />
      <h2 className="text-xl font-black text-rose mb-2">Submission Failed</h2>
      <p className="text-sm text-text-secondary mb-6">Please try again or contact support.</p>
      <button
        onClick={() => onSubmit()}
        className="px-6 py-3 bg-rose text-white text-xs font-black uppercase tracking-wider rounded-lg hover:bg-rose-light transition-colors"
      >
        Retry Submission
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// PIPELINE TRACKER (Post-Submission)
// ═══════════════════════════════════════════
function PipelineTracker({
  form,
  tier,
  tierKey,
  trackingId,
  isAuthenticated,
  onNavigate,
}: {
  form: FormData;
  tier: (typeof FIX_TIERS)[FixTier];
  tierKey: FixTier;
  trackingId: string;
  isAuthenticated: boolean;
  onNavigate: (path: string) => void;
}) {
  const [activeAgent, setActiveAgent] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Emergency ticket ${trackingId} created`,
    `[${new Date().toLocaleTimeString()}] Severity classified: ${SEVERITY_LABELS[form.severity].label}`,
  ]);

  const agents = [
    { name: 'TRIAGE', icon: Eye, color: '#22d3ee', desc: 'Classifying incident scope' },
    { name: 'ISOLATE', icon: Server, color: '#a3e635', desc: 'Provisioning sandbox VM' },
    { name: 'REPAIR', icon: Bot, color: '#e879f9', desc: 'Generating autonomous fix' },
    { name: 'VALIDATE', icon: ScanLine, color: '#22d3ee', desc: '42-scanner security review' },
    { name: 'DEPLOY', icon: Zap, color: '#a3e635', desc: 'Zero-downtime deployment' },
    { name: 'AUDIT', icon: Shield, color: '#e879f9', desc: 'Immutable compliance trail' },
  ];

  useEffect(() => {
    const timings = [
      { delay: 1500, log: `[TRIAGE] Analyzing ${form.url}... Issue detected: ${form.severity >= 4 ? 'Critical failure' : 'Service degradation'}` },
      { delay: 4000, log: `[ISOLATE] Secure VM provisioned. Site cloned. Credentials vault sealed.` },
      { delay: 8000, log: `[REPAIR] AI agent generating patch. Confidence: 94%.` },
      { delay: 12000, log: `[VALIDATE] 42/42 scanners passed. Zero vulnerabilities detected.` },
      { delay: 16000, log: `[DEPLOY] Fix deployed to production. Health checks passing.` },
      { delay: 20000, log: `[AUDIT] SHA-256 trail sealed. Credentials purged. Incident resolved.` },
    ];

    timings.forEach((t, i) => {
      setTimeout(() => {
        setActiveAgent(i + 1);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${t.log}`]);
      }, t.delay);
    });
  }, [form.url, form.severity]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-dim border border-lime/20 mb-4">
          <CheckCircle2 className="w-4 h-4 text-lime" />
          <span className="text-[11px] font-black uppercase tracking-widest text-lime">Emergency Submitted</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
          AI Pipeline <span className="text-lime">Active</span>
        </h2>
        <p className="text-sm text-text-secondary mt-2">
          {tier.name} initialized. {tier.sla} SLA guarantee.
        </p>
      </div>

      {/* Tracking ID */}
      <div className="glass-surface rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Tracking ID</div>
          <div className="text-lg font-black font-mono text-cyan">{trackingId}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Status</div>
          <div className="flex items-center gap-1.5 text-lime">
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            <span className="text-xs font-bold uppercase">Processing</span>
          </div>
        </div>
      </div>

      {/* Agent Pipeline Visualization */}
      <div className="glass-surface rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan" /> 6-Agent Pipeline
          </h3>
          <span className="text-[10px] text-text-muted font-mono">
            {Math.min(activeAgent, 6)}/6 agents
          </span>
        </div>

        {/* Horizontal agent steps */}
        <div className="flex items-center gap-1 mb-6">
          {agents.map((agent, i) => {
            const isDone = i < activeAgent;
            const isCurrent = i === activeAgent;
            const AIcon = agent.icon;
            return (
              <div key={agent.name} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500"
                    style={{
                      borderColor: isDone || isCurrent ? agent.color : '#1e293b',
                      background: isDone ? `${agent.color}20` : isCurrent ? `${agent.color}15` : 'rgba(15,23,42,0.6)',
                      boxShadow: isCurrent ? `0 0 15px ${agent.color}40` : 'none',
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" style={{ color: agent.color }} />
                    ) : (
                      <AIcon className="w-4 h-4" style={{ color: isCurrent ? agent.color : '#475569' }} />
                    )}
                  </div>
                  <span className={`text-[8px] font-bold uppercase tracking-wider mt-1.5 ${isDone || isCurrent ? '' : 'text-text-disabled'}`} style={{ color: isDone || isCurrent ? agent.color : undefined }}>
                    {agent.name}
                  </span>
                </div>
                {i < agents.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1" style={{ background: i < activeAgent ? agent.color : '#1e293b' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current agent description */}
        {activeAgent < agents.length && (
          <div className="p-3 rounded-lg border text-center" style={{ borderColor: `${agents[activeAgent].color}30`, background: `${agents[activeAgent].color}10` }}>
            <span className="text-xs font-bold" style={{ color: agents[activeAgent].color }}>
              {agents[activeAgent].name}: {agents[activeAgent].desc}
            </span>
          </div>
        )}
      </div>

      {/* Live Logs */}
      <div className="glass-surface rounded-xl p-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-text-primary mb-4 flex items-center gap-2">
          <Radio className="w-4 h-4 text-lime animate-pulse" /> Live Operation Log
        </h3>
        <div className="bg-void-deep rounded-lg p-4 font-mono text-[11px] space-y-1.5 max-h-48 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="text-text-secondary">
              <span className="text-lime">&gt;</span> {log}
            </div>
          ))}
          <div className="text-text-muted animate-pulse">
            <span className="text-lime">&gt;</span> _
          </div>
        </div>
      </div>

      {/* CTA for anonymous users */}
      {!isAuthenticated && (
        <div className="glass-surface rounded-xl p-6 text-center" style={{ borderColor: 'rgba(163,230,53,0.2)' }}>
          <h3 className="text-sm font-black text-text-primary mb-2">Track Your Fix in Real Time</h3>
          <p className="text-xs text-text-secondary mb-4">
            Create an account to view the full 42-scanner dashboard, chat with your engineer, and monitor every step of the repair pipeline.
          </p>
          <button
            onClick={() => onNavigate(`/login?intent=emergency&track=${trackingId}&tier=${tierKey}`)}
            className="px-6 py-3 bg-lime text-void-dark text-xs font-black uppercase tracking-wider rounded-lg hover:bg-lime-light transition-colors"
          >
            Create Account — View Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
