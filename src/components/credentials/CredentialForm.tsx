import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Shield, Server, KeyRound, Globe, FileText,
  Eye, EyeOff, AlertTriangle, ChevronRight, Fingerprint,
  Loader2, CheckCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { encryptCredentials, storeEphemeralKey } from '@/lib/crypto/encryption';
import { supabase } from '@/lib/supabase/client';
import { EncryptionVisualizer } from './EncryptionVisualizer';
import { useAuth } from '@/hooks/useAuth';

type CredentialType = 'sftp_ssh' | 'wordpress' | 'hosting' | 'api' | 'other';

interface CredentialFormProps {
  incidentId?: string;
  fixId?: string;
  onSubmitted?: () => void;
}

const credentialTypes: { value: CredentialType; label: string; icon: typeof Server; desc: string }[] = [
  { value: 'sftp_ssh', label: 'SFTP / SSH', icon: Server, desc: 'Server credentials for file access' },
  { value: 'wordpress', label: 'WordPress Admin', icon: KeyRound, desc: 'WP-admin login credentials' },
  { value: 'hosting', label: 'Hosting Panel', icon: Globe, desc: 'cPanel, Plesk, or custom panel' },
  { value: 'api', label: 'API Keys', icon: FileText, desc: 'API keys or tokens' },
  { value: 'other', label: 'Other', icon: Lock, desc: 'Any other type of access' },
];

export function CredentialForm({ incidentId, fixId, onSubmitted }: CredentialFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [credType, setCredType] = useState<CredentialType>('sftp_ssh');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState('');
  const [notes, setNotes] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [encryptState, setEncryptState] = useState<'idle' | 'encrypting' | 'locked' | 'error'>('idle');
  const [fingerprint, setFingerprint] = useState('');

  const isWordPress = credType === 'wordpress';
  const isHosting = credType === 'hosting';
  const isApi = credType === 'api';

  const buildCredentialString = (): string => {
    const parts: string[] = [`Type: ${credType.toUpperCase()}`];
    if (isWordPress) {
      parts.push(`Admin URL: ${host}/wp-admin`);
    } else if (isHosting) {
      parts.push(`Panel URL: ${host}`);
    } else if (isApi) {
      parts.push(`API Endpoint: ${host}`);
    } else {
      parts.push(`Host: ${host}`);
      if (port) parts.push(`Port: ${port}`);
    }
    parts.push(`Username: ${username}`);
    parts.push(`Password/Key: ${password}`);
    if (notes) parts.push(`Notes: ${notes}`);
    return parts.join('\n');
  };

  const handleEncryptAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!host.trim() || !username.trim() || !password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user?.id) {
      toast.error('You must be signed in to submit credentials');
      navigate('/login');
      return;
    }

    try {
      // ── STEP 1: Build credential string ──
      const credentialString = buildCredentialString();

      // ── STEP 2: Encrypt in browser ──
      setIsEncrypting(true);
      setEncryptState('encrypting');

      // Small delay for visual effect
      await new Promise(r => setTimeout(r, 1500));

      const { payload, ephemeralKey, readableFingerprint } = await encryptCredentials(credentialString);

      setFingerprint(readableFingerprint);
      setEncryptState('locked');
      setIsEncrypting(false);

      // ── STEP 3: Store ephemeral key in sessionStorage ──
      storeEphemeralKey(payload.fingerprint, ephemeralKey);

      // Small delay to show the locked state
      await new Promise(r => setTimeout(r, 1000));

      // ── STEP 4: Submit encrypted payload to Supabase ──
      setIsSubmitting(true);

      const { error } = await supabase.from('credentials_vault').insert({
        customer_id: user.id,
        incident_id: incidentId || null,
        one_time_fix_id: fixId || null,
        encrypted_payload: JSON.stringify(payload),
        public_key_fingerprint: payload.fingerprint,
        session_key_hash: payload.keyHash,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72h
      });

      setIsSubmitting(false);

      if (error) {
        toast.error('Failed to store credentials: ' + error.message);
        setEncryptState('error');
        return;
      }

      toast.success('Credentials submitted securely! Encrypted with AES-256-GCM.');
      onSubmitted?.();

      // Clear form
      setHost('');
      setUsername('');
      setPassword('');
      setPort('');
      setNotes('');
      setEncryptState('idle');

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Encryption failed';
      toast.error(msg);
      setEncryptState('error');
      setIsEncrypting(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Notice Banner */}
      <div className="bg-lime/5 border border-lime/20 p-4 rounded-sm">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-lime flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-lime uppercase tracking-wider">
              Zero-Knowledge Encryption
            </h4>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Your credentials are encrypted in your browser with AES-256-GCM before being sent.
              The decryption key never leaves your browser. UptimeOps cannot access your plaintext credentials.
            </p>
          </div>
        </div>
      </div>

      {/* Credential Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {credentialTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setCredType(type.value)}
            className={`p-3 border text-left transition-all ${
              credType === type.value
                ? 'border-lime bg-lime/5'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <type.icon
              className={`w-4 h-4 mb-2 ${
                credType === type.value ? 'text-lime' : 'text-white/40'
              }`}
            />
            <div
              className={`text-xs font-bold uppercase tracking-wider ${
                credType === type.value ? 'text-lime' : 'text-white/60'
              }`}
            >
              {type.label}
            </div>
            <div className="text-xs text-white/30 mt-0.5">{type.desc}</div>
          </button>
        ))}
      </div>

      {/* Encryption Visualizer */}
      <EncryptionVisualizer
        state={encryptState}
        fingerprint={fingerprint}
      />

      {/* Credential Form */}
      {encryptState !== 'locked' && (
        <form onSubmit={handleEncryptAndSubmit} className="space-y-4">
          <div className="bg-surface border border-white/5 p-6 space-y-4">
            {/* Host / URL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                {isWordPress ? 'Website URL' : isHosting ? 'Panel URL' : isApi ? 'API Endpoint' : 'Host / Server Address'} *
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder={
                    isWordPress ? 'https://yoursite.com' :
                    isHosting ? 'https://cpanel.host.com' :
                    isApi ? 'https://api.yoursite.com' :
                    'sftp.yoursite.com or IP'
                  }
                  className="pl-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11"
                  required
                  disabled={isEncrypting || isSubmitting}
                />
              </div>
            </div>

            {/* Port (SFTP/SSH only) */}
            {!isWordPress && !isHosting && !isApi && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                  Port
                </label>
                <Input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="22 (SFTP) or 21 (FTP)"
                  className="bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11 font-mono"
                  disabled={isEncrypting || isSubmitting}
                />
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                {isApi ? 'API Key / Token' : 'Username'} *
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isApi ? 'sk-... or api-key' : 'root / admin'}
                className="bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11 font-mono"
                required
                disabled={isEncrypting || isSubmitting}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                {isApi ? 'API Secret' : 'Password / Private Key'} *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isApi ? 'secret key' : '••••••••'}
                  className="pr-10 bg-elevated border-white/10 text-white placeholder:text-white/20 focus:border-lime h-11 font-mono"
                  required
                  disabled={isEncrypting || isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">
                Additional Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions, 2FA details, etc."
                rows={3}
                className="w-full bg-elevated border border-white/10 text-white placeholder:text-white/20 focus:border-lime rounded-sm px-3 py-2 text-sm resize-none outline-none"
                disabled={isEncrypting || isSubmitting}
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 p-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                These credentials will be encrypted in your browser before transmission.
                Ensure they are correct — engineers cannot ask you to re-submit once the session begins.
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isEncrypting || isSubmitting}
            className="w-full btn-lime h-12 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 rounded-sm"
          >
            {isEncrypting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting...</>
            ) : isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Storing...</>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Encrypt & Submit Credentials
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Fingerprint className="w-3 h-3 text-lime" />
          <span>Fingerprint Verified</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Shield className="w-3 h-3 text-lime" />
          <span>AES-256-GCM</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <Lock className="w-3 h-3 text-lime" />
          <span>Client-Side Encryption</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          <CheckCircle className="w-3 h-3 text-green-500" />
          <span>Zero-Knowledge Architecture</span>
        </div>
      </div>
    </div>
  );
}
