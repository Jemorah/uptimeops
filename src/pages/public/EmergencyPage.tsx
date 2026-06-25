// ═══════════════════════════════════════════════════════════════
// EMERGENCY PAGE — Fastest path to fix
// 4-step wizard: Form → Credentials → Payment → Status Tracker
// Red emergency accents. Zero-knowledge encryption. Inline payment.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, Shield, CheckCircle, Clock, Lock, Globe, Mail,
  Phone, FileText, CreditCard, AlertTriangle, Server, Wrench,
  Eye, Radio, MessageSquare, X, Key,
  ChevronRight, ChevronLeft, Activity, RefreshCw,
  Check, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { EncryptionVisualizer } from '@/components/credentials/EncryptionVisualizer';
import { encryptCredentials } from '@/lib/crypto/encryption';
import { toast } from 'sonner';

type Step = 'form' | 'credentials' | 'payment' | 'active';
type IssueType = 'down' | 'hacked' | 'broken' | 'slow' | 'ddos' | 'other';
type CredentialType = 'ssh' | 'wordpress' | 'panel' | 'other';

const ISSUE_TYPES: { key: IssueType; label: string; icon: typeof AlertTriangle; severity: string }[] = [
  { key: 'down',    label: 'My site is completely down / white screen', icon: AlertTriangle, severity: 'P1' },
  { key: 'hacked',  label: 'My site was hacked / showing malware warnings', icon: Shield, severity: 'P1' },
  { key: 'broken',  label: 'Broken layout / features not working', icon: Wrench, severity: 'P2' },
  { key: 'slow',    label: 'Slow / crashing under traffic', icon: Activity, severity: 'P2' },
  { key: 'ddos',    label: 'DDoS attack / firewall issue', icon: Radio, severity: 'P1' },
  { key: 'other',   label: 'Other — I\'ll describe below', icon: FileText, severity: 'P3' },
];

const PAYMENT_TIERS = [
  { key: 'rapid',       name: 'RAPID',       price: 149, response: '2-hour',     desc: 'For non-critical fixes',            features: ['AI diagnosis + fix', '72h dashboard', 'Email support'], popular: false, color: 'text-cyan', border: 'border-cyan/30', bg: 'bg-cyan/5' },
  { key: 'critical',    name: 'CRITICAL',    price: 349, response: '30-minute',  desc: 'Most popular — complex issues',     features: ['Everything in Rapid', 'Security hardening', '30-day warranty', 'Priority queue'], popular: true, color: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-400/5' },
  { key: 'catastrophic',name: 'CATASTROPHIC',price: 799, response: '15-minute',  desc: 'P1 emergency — full response',      features: ['Everything in Critical', 'P1 priority', 'Forensic audit', 'DDoS mitigation', '90-day warranty'], popular: false, color: 'text-magenta', border: 'border-magenta/30', bg: 'bg-magenta/5' },
];

export function EmergencyPage() {
  const [step, setStep] = useState<Step>('form');
  const [stepHistory, setStepHistory] = useState<Step[]>([]);

  // Form state
  const [url, setUrl] = useState('');
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Credential state
  const [credType, setCredType] = useState<CredentialType>('ssh');
  const [credHost, setCredHost] = useState('');
  const [credPort, setCredPort] = useState('22');
  const [credUser, setCredUser] = useState('');
  const [credPass, setCredPass] = useState('');
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPass, setWpPass] = useState('');
  const [panelUrl, setPanelUrl] = useState('');
  const [panelUser, setPanelUser] = useState('');
  const [panelPass, setPanelPass] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [encryptState, setEncryptState] = useState<'idle' | 'encrypting' | 'locked' | 'error'>('idle');
  const [encryptedFingerprint, setEncryptedFingerprint] = useState('');

  // Payment state
  const [selectedTier, setSelectedTier] = useState<string>('critical');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardZip, setCardZip] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Active state
  const [ticketId] = useState(`ESC-${Date.now().toString(36).toUpperCase().slice(-4)}`);
  const [agentProgress, setAgentProgress] = useState(0);
  const [activeAgent, setActiveAgent] = useState(0);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Emergency ticket created']);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ from: 'user' | 'support'; text: string }[]>([
    { from: 'support', text: 'Hi! I\'m your emergency coordinator. I\'ll be monitoring your fix. How can I help?' },
  ]);
  const [chatInput, setChatInput] = useState('');

  const goTo = (s: Step) => { setStepHistory(prev => [...prev, step]); setStep(s); };
  const goBack = () => { const prev = stepHistory.pop(); if (prev) { setStep(prev); setStepHistory([...stepHistory]); } };

  // Simulate active fix progress
  useEffect(() => {
    if (step !== 'active') return;
    const agentSteps = [
      { name: 'TRIAGE', delay: 2000, log: '[TRIAGE] Classifying issue... Detected: WordPress plugin conflict' },
      { name: 'ISOLATE', delay: 5000, log: '[ISOLATE] VM sandbox-7f3a9e2d spawned. Site cloned successfully.' },
      { name: 'REPAIR', delay: 12000, log: '[REPAIR] Patching class-checkout.php line 142... Fix applied.' },
      { name: 'VALIDATE', delay: 18000, log: '[VALIDATE] Smoke tests: 8/8 passed. Confidence: 94%.' },
      { name: 'DEPLOY', delay: 22000, log: '[DEPLOY] Coordinator approved. Deploying to production...' },
      { name: 'AUDIT', delay: 28000, log: '[AUDIT] Audit trail compiled. Credentials purged. Incident closed.' },
    ];
    agentSteps.forEach((a, i) => {
      setTimeout(() => {
        setActiveAgent(i);
        setAgentProgress(((i + 1) / 6) * 100);
        setLogs(prev => [...prev, a.log]);
      }, a.delay);
    });
  }, [step]);

  const handleEncrypt = useCallback(async () => {
    setEncryptState('encrypting');
    try {
      const creds = credType === 'ssh'
        ? JSON.stringify({ type: 'ssh', host: credHost, port: credPort, user: credUser, pass: credPass })
        : credType === 'wordpress'
        ? JSON.stringify({ type: 'wordpress', url: wpUrl, user: wpUser, pass: wpPass })
        : credType === 'panel'
        ? JSON.stringify({ type: 'panel', url: panelUrl, user: panelUser, pass: panelPass })
        : JSON.stringify({ type: 'other', note: description });

      const result = await encryptCredentials(creds);
      setEncryptedFingerprint(result.readableFingerprint);
      setEncryptState('locked');
      setTimeout(() => goTo('payment'), 2500);
    } catch {
      setEncryptState('error');
      toast.error('Encryption failed. Please try again.');
    }
  }, [credType, credHost, credPort, credUser, credPass, wpUrl, wpUser, wpPass, panelUrl, panelUser, panelPass, description]);

  const handlePay = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      goTo('active');
      toast.success('Payment confirmed! AI is now fixing your site.');
    }, 2500);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { from: 'user', text: chatInput.trim() }]);
    setChatInput('');
    setTimeout(() => {
      const replies = [
        'I can see your fix is progressing well. The AI has identified the root cause.',
        'Your site will be back online shortly. I\'ll keep you updated.',
        'Good news — the smoke tests are passing. We\'re almost done!',
      ];
      setChatMessages(prev => [...prev, { from: 'support', text: replies[Math.floor(Math.random() * replies.length)] }]);
    }, 1500);
  };

  const canSubmitForm = url.trim() && issueType && email.trim();
  const canPay = cardNumber.length >= 15 && cardExpiry.length >= 4 && cardCvc.length >= 3 && cardZip.length >= 5;

  const stepLabels: Record<Step, string> = { form: 'Describe Issue', credentials: 'Secure Access', payment: 'Choose Speed', active: 'Fix in Progress' };

  return (
    <div className="min-h-screen pt-20 pb-12">
      {/* Header */}
      <div className="border-b border-red-400/10 bg-red-400/[0.02]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-400/10 border border-red-400/20 flex items-center justify-center animate-pulse">
                <Radio className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight text-red-400 uppercase">Emergency Website Repair — Live</h1>
                <p className="text-[10px] text-white/30 font-mono">AI fix: ~18 min | Human escalation: &lt;5 min</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-white/30 font-mono">AI ONLINE — {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} UTC</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Stepper */}
            {step !== 'active' && (
              <div className="flex items-center gap-0 mb-8">
                {(['form', 'credentials', 'payment'] as const).map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div className={`flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      step === s ? 'bg-red-400/10 border-red-400/30 text-red-400' :
                      stepHistory.includes(s) ? 'bg-lime/5 border-lime/20 text-lime' :
                      'bg-white/5 border-white/5 text-white/20'
                    }`}>
                      <span className="font-mono">0{i + 1}</span>
                      {stepLabels[s]}
                      {stepHistory.includes(s) && <Check className="w-3 h-3" />}
                    </div>
                    {i < 2 && <ChevronRight className="w-4 h-4 text-white/10 mx-1" />}
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 1: FORM ── */}
            {step === 'form' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight mb-1">What happened?</h2>
                  <p className="text-xs text-white/30">The more detail you provide, the faster our AI can diagnose.</p>
                </div>

                {/* Website URL */}
                <div className="bg-surface border border-white/5 p-5">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 block">Your Website URL *</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-site.com" className="pl-10 bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" required />
                  </div>
                </div>

                {/* Issue Type */}
                <div className="bg-surface border border-white/5 p-5">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-3 block">What happened? *</label>
                  <div className="space-y-2">
                    {ISSUE_TYPES.map(it => (
                      <button
                        key={it.key}
                        onClick={() => setIssueType(it.key)}
                        className={`w-full flex items-center gap-3 p-3 border text-left transition-all ${
                          issueType === it.key
                            ? 'bg-red-400/5 border-red-400/30'
                            : 'bg-transparent border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${
                          issueType === it.key ? 'border-red-400 bg-red-400/20' : 'border-white/20'
                        }`}>
                          {issueType === it.key && <div className="w-2 h-2 bg-red-400" />}
                        </div>
                        <it.icon className={`w-4 h-4 flex-shrink-0 ${issueType === it.key ? 'text-red-400' : 'text-white/20'}`} />
                        <span className={`text-xs ${issueType === it.key ? 'text-white' : 'text-white/40'}`}>{it.label}</span>
                        <span className={`ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 border ${
                          it.severity === 'P1' ? 'bg-red-400/10 text-red-400 border-red-400/20' :
                          it.severity === 'P2' ? 'bg-orange-400/10 text-orange-400 border-orange-400/20' :
                          'bg-white/5 text-white/30 border-white/10'
                        }`}>{it.severity}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-surface border border-white/5 p-5">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 block">Describe what you see (optional)</label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Error messages, when it started, what you've tried..." rows={3} className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30 resize-none" />
                </div>

                {/* Contact */}
                <div className="bg-surface border border-white/5 p-5">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 block">Your Email *</label>
                  <div className="relative mb-4">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="pl-10 bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                  </div>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2 block">Your Phone (optional, for SMS)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1-555-0199" className="pl-10 bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Link to="/" className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Back to home
                  </Link>
                  <Button
                    onClick={() => canSubmitForm ? goTo('credentials') : toast.error('Please fill required fields')}
                    className="bg-red-400 hover:bg-red-400/90 text-void font-black uppercase tracking-wider px-8 py-5 text-sm"
                  >
                    Continue to Secure Access
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 2: CREDENTIALS ── */}
            {step === 'credentials' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-5 h-5 text-red-400" />
                    <h2 className="text-xl font-black tracking-tight">Secure Credential Access</h2>
                  </div>
                  <p className="text-xs text-white/30">To fix your site, we need temporary access. Everything is encrypted in your browser before it leaves your device.</p>
                </div>

                {/* Encryption visual */}
                <EncryptionVisualizer state={encryptState} fingerprint={encryptedFingerprint} />

                {encryptState === 'idle' && (
                  <>
                    {/* Credential Type Tabs */}
                    <div className="flex border-b border-white/5">
                      {([
                        { key: 'ssh', label: 'SSH/FTP', icon: Key },
                        { key: 'wordpress', label: 'WordPress', icon: FileText },
                        { key: 'panel', label: 'Hosting Panel', icon: Server },
                      ] as const).map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setCredType(tab.key)}
                          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase border-b-2 transition-colors ${
                            credType === tab.key ? 'border-red-400 text-red-400' : 'border-transparent text-white/30 hover:text-white/50'
                          }`}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* SSH/FTP Form */}
                    {credType === 'ssh' && (
                      <div className="bg-surface border border-white/5 p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="text-[10px] text-white/30 uppercase mb-1 block">Host</label>
                            <Input value={credHost} onChange={e => setCredHost(e.target.value)} placeholder="sftp.your-site.com" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/30 uppercase mb-1 block">Port</label>
                            <Input value={credPort} onChange={e => setCredPort(e.target.value)} placeholder="22" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-white/30 uppercase mb-1 block">Username</label>
                          <Input value={credUser} onChange={e => setCredUser(e.target.value)} placeholder="root or ftp-user" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/30 uppercase mb-1 block">Password / Private Key</label>
                          <Input type="password" value={credPass} onChange={e => setCredPass(e.target.value)} placeholder="••••••••••••" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                        </div>
                      </div>
                    )}

                    {/* WordPress Form */}
                    {credType === 'wordpress' && (
                      <div className="bg-surface border border-white/5 p-5 space-y-4">
                        <div>
                          <label className="text-[10px] text-white/30 uppercase mb-1 block">WordPress Admin URL</label>
                          <Input value={wpUrl} onChange={e => setWpUrl(e.target.value)} placeholder="https://your-site.com/wp-admin" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-white/30 uppercase mb-1 block">Username</label>
                            <Input value={wpUser} onChange={e => setWpUser(e.target.value)} placeholder="admin" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/30 uppercase mb-1 block">Password</label>
                            <Input type="password" value={wpPass} onChange={e => setWpPass(e.target.value)} placeholder="••••••••" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hosting Panel Form */}
                    {credType === 'panel' && (
                      <div className="bg-surface border border-white/5 p-5 space-y-4">
                        <div>
                          <label className="text-[10px] text-white/30 uppercase mb-1 block">Panel URL</label>
                          <Input value={panelUrl} onChange={e => setPanelUrl(e.target.value)} placeholder="https://cpanel.your-host.com" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-white/30 uppercase mb-1 block">Username</label>
                            <Input value={panelUser} onChange={e => setPanelUser(e.target.value)} placeholder="panel-user" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/30 uppercase mb-1 block">Password</label>
                            <Input type="password" value={panelPass} onChange={e => setPanelPass(e.target.value)} placeholder="••••••••" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Checkbox */}
                    <div className="flex items-start gap-3 p-4 bg-red-400/[0.02] border border-red-400/10">
                      <Checkbox checked={understood} onCheckedChange={c => setUnderstood(c === true)} className="mt-0.5 border-white/20 data-[state=checked]:bg-red-400 data-[state=checked]:border-red-400" />
                      <label className="text-xs text-white/40 leading-relaxed cursor-pointer" onClick={() => setUnderstood(!understood)}>
                        I understand my credentials are <span className="text-red-400 font-bold">encrypted in my browser</span> using AES-256-GCM before transmission. They are automatically deleted after the fix is complete. I can revoke access at any time.
                      </label>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button onClick={goBack} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Back
                  </button>
                  {encryptState === 'idle' && (
                    <Button
                      onClick={() => understood ? handleEncrypt() : toast.error('Please confirm the encryption notice')}
                      className="bg-red-400 hover:bg-red-400/90 text-void font-black uppercase tracking-wider px-8 py-5 text-sm"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Encrypt &amp; Lock
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3: PAYMENT ── */}
            {step === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-black tracking-tight mb-1">Choose Your Fix Speed</h2>
                  <p className="text-xs text-white/30">Select the response tier that matches your urgency. Pay only when you confirm the fix works.</p>
                </div>

                {/* Tiers */}
                <div className="space-y-3">
                  {PAYMENT_TIERS.map(tier => (
                    <button
                      key={tier.key}
                      onClick={() => setSelectedTier(tier.key)}
                      className={`w-full text-left p-5 border transition-all ${
                        selectedTier === tier.key
                          ? `${tier.bg} ${tier.border} ring-1 ${tier.border.replace('border-', 'ring-').replace('/30', '/20')}`
                          : 'border-white/5 hover:border-white/15 bg-surface'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${selectedTier === tier.key ? `border-red-400 bg-red-400/20` : 'border-white/20'}`}>
                              {selectedTier === tier.key && <div className="w-2 h-2 bg-red-400" />}
                            </div>
                            <span className={`text-sm font-black ${tier.color}`}>{tier.name}</span>
                            {tier.popular && (
                              <span className="text-[9px] bg-red-400/10 text-red-400 px-2 py-0.5 border border-red-400/20 font-bold uppercase">Recommended</span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-3xl font-black font-mono text-white">${tier.price}</span>
                            <span className="text-xs text-white/30">one-time</span>
                          </div>
                          <p className="text-xs text-white/30 mb-3">{tier.desc}</p>
                          <div className="flex flex-wrap gap-2">
                            {tier.features.map(f => (
                              <span key={f} className="text-[10px] text-white/40 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 text-lime" />{f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={`px-3 py-2 border text-center ${tier.bg} ${tier.border}`}>
                          <Clock className={`w-4 h-4 ${tier.color} mx-auto mb-1`} />
                          <span className={`text-[10px] font-bold ${tier.color}`}>{tier.response}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Card Form */}
                <div className="bg-surface border border-white/5 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-4 h-4 text-white/30" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Payment Details</span>
                    <span className="text-[10px] text-white/15 ml-auto font-mono">Stripe Secure</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] text-white/20 mb-1 block">Card Number</label>
                      <Input value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="4242 4242 4242 4242" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/20 mb-1 block">Expiry</label>
                      <Input value={cardExpiry} onChange={e => setCardExpiry(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="MM/YY" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30 font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/20 mb-1 block">CVC</label>
                      <Input value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30 font-mono" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-white/20 mb-1 block">ZIP Code</label>
                      <Input value={cardZip} onChange={e => setCardZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="10001" className="bg-black/30 border-white/10 text-white placeholder:text-white/15 focus:border-red-400/30 font-mono" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button onClick={goBack} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> Back
                  </button>
                  <Button
                    onClick={handlePay}
                    disabled={!canPay || isPaying}
                    className="bg-red-400 hover:bg-red-400/90 text-void font-black uppercase tracking-wider px-8 py-5 text-sm disabled:opacity-30"
                  >
                    {isPaying ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        Pay ${PAYMENT_TIERS.find(t => t.key === selectedTier)?.price} &amp; Start Fix
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 4: ACTIVE FIX ── */}
            {step === 'active' && (
              <div className="space-y-6">
                {/* Ticket Header */}
                <div className="bg-surface border border-white/5 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-lime" />
                        <span className="text-xs font-bold text-lime uppercase">Payment Confirmed</span>
                      </div>
                      <h2 className="text-lg font-black tracking-tight">Fix In Progress — {ticketId}</h2>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/30 font-mono">{url}</div>
                      <div className="text-[10px] text-white/20 font-mono">{email}</div>
                    </div>
                  </div>
                </div>

                {/* Pipeline Progress */}
                <div className="bg-surface border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">AI Pipeline</span>
                    <span className="text-[10px] text-lime font-mono">{Math.round(agentProgress)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 overflow-hidden mb-4">
                    <div className="h-full bg-lime transition-all duration-1000" style={{ width: `${agentProgress}%` }} />
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {['TRIAGE', 'ISOLATE', 'REPAIR', 'VALIDATE', 'DEPLOY', 'AUDIT'].map((name, i) => (
                      <div key={name} className={`text-center p-2 border ${
                        i < activeAgent ? 'bg-lime/5 border-lime/20' :
                        i === activeAgent ? 'bg-cyan/5 border-cyan/20' :
                        'bg-white/[0.02] border-white/5'
                      }`}>
                        <div className={`text-[8px] font-bold ${
                          i < activeAgent ? 'text-lime' :
                          i === activeAgent ? 'text-cyan' :
                          'text-white/15'
                        }`}>{name}</div>
                        {i < activeAgent && <Check className="w-3 h-3 text-lime mx-auto mt-1" />}
                        {i === activeAgent && <div className="w-2 h-2 bg-cyan animate-pulse mx-auto mt-1" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Log */}
                <div className="bg-surface border border-white/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-3.5 h-3.5 text-cyan" />
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Live Log</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-3 font-mono text-[10px] space-y-1.5 max-h-48 overflow-y-auto">
                    {logs.map((log, i) => (
                      <div key={i} className={`${
                        log.includes('SYSTEM') ? 'text-white/30' :
                        log.includes('TRIAGE') ? 'text-cyan' :
                        log.includes('ISOLATE') ? 'text-purple-400' :
                        log.includes('REPAIR') ? 'text-lime' :
                        log.includes('VALIDATE') ? 'text-green-400' :
                        log.includes('DEPLOY') ? 'text-orange-400' :
                        log.includes('AUDIT') ? 'text-white/50' :
                        'text-white/30'
                      }`}>
                        {log}
                      </div>
                    ))}
                    <div className="text-cyan animate-pulse">_</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Link to="/customer/comms" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-lime/10 border border-lime/30 text-lime text-xs font-bold uppercase hover:bg-lime/20 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                    View Full Dashboard
                  </Link>
                  <button onClick={() => {}} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/40 text-xs font-bold uppercase hover:border-white/20 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Revoke Credentials
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── TRUST SIDEBAR ── */}
          <div className="space-y-4">
            {/* Trust Card */}
            <div className="bg-surface border border-white/5 p-5 sticky top-24">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">Why You Can Trust Us</h3>
              <div className="space-y-3">
                {[
                  { icon: Server, text: 'Isolated VM', desc: 'Your site is never touched directly. All fixes happen in a sandbox.' },
                  { icon: Shield, text: 'Coordinator Approval', desc: 'A human reviews every fix before it goes live.' },
                  { icon: RefreshCw, text: 'Auto-Rollback', desc: 'If anything goes wrong, we revert automatically.' },
                  { icon: Lock, text: 'Zero-Knowledge', desc: 'We cannot see your credentials. Revoke access anytime.' },
                  { icon: Clock, text: 'Transparent Timing', desc: 'You see every step in real-time. No black boxes.' },
                ].map(item => (
                  <div key={item.text} className="flex items-start gap-3">
                    <item.icon className="w-4 h-4 text-lime flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white/60">{item.text}</div>
                      <div className="text-[10px] text-white/25 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-lg font-black font-mono text-lime">18m</div>
                  <div className="text-[9px] text-white/20 uppercase">Avg Fix</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black font-mono text-cyan">95%</div>
                  <div className="text-[9px] text-white/20 uppercase">AI Success</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black font-mono text-green-400">2,000+</div>
                  <div className="text-[9px] text-white/20 uppercase">Sites Saved</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black font-mono text-red-400">&lt;5m</div>
                  <div className="text-[9px] text-white/20 uppercase">Escalation</div>
                </div>
              </div>
            </div>

            {/* Pricing Quick Ref */}
            {step !== 'active' && (
              <div className="bg-surface border border-white/5 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Response Times</h3>
                <div className="space-y-2">
                  {PAYMENT_TIERS.map(t => (
                    <div key={t.key} className={`flex items-center justify-between p-2 border ${t.border} ${t.bg}`}>
                      <span className={`text-xs font-bold ${t.color}`}>{t.name}</span>
                      <span className="text-xs text-white/40 font-mono">${t.price} / {t.response}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FLOATING CHAT WIDGET ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen ? (
          <div className="w-80 bg-surface border border-white/10 shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-red-400/[0.05]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-bold text-white/70">Emergency Coordinator</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Messages */}
            <div className="h-64 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 text-xs ${
                    msg.from === 'user'
                      ? 'bg-cyan/10 border border-cyan/20 text-white/70'
                      : 'bg-white/5 border border-white/10 text-white/50'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            {/* Input */}
            <div className="flex items-center gap-2 p-3 border-t border-white/5">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
                className="flex-1 bg-black/30 border border-white/10 text-xs text-white/70 px-3 py-2 outline-none focus:border-lime/30 placeholder:text-white/20"
              />
              <button onClick={sendChat} className="p-2 text-lime hover:text-lime/70 transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="w-14 h-14 bg-red-400 hover:bg-red-400/90 text-void flex items-center justify-center shadow-lg shadow-red-400/20 transition-all hover:scale-105"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
