// ═══════════════════════════════════════════════════════════════
// TAB 3: CREDENTIALS
// Ephemeral decryption with customer approval flow
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import {
  KeyRound, Shield, Clock, CheckCircle, Lock,
  Unlock, Send, UserCheck, Radio, Timer,
  Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CredentialsPanelProps {
  incidentId: string;
  customerEmail?: string;
}

type CredState = 'locked' | 'requesting' | 'awaiting_approval' | 'approved' | 'decrypted' | 'expired';

interface CredentialField {
  label: string;
  value: string;
  masked: boolean;
  type: 'text' | 'password' | 'key';
}

const MOCK_CREDS: CredentialField[] = [
  { label: 'Server IP', value: '203.0.113.47', masked: true, type: 'text' },
  { label: 'SSH User', value: 'deploy', masked: true, type: 'text' },
  { label: 'SSH Key', value: '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----', masked: true, type: 'key' },
  { label: 'DB Password', value: 'pg_prod_2024!xK9#mP', masked: true, type: 'password' },
  { label: 'Sudo Password', value: 'Sudo#Secure789!', masked: true, type: 'password' },
];

const SESSION_MAX_MS = 4 * 60 * 60 * 1000; // 4 hours

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function CredentialsPanel({ incidentId, customerEmail }: CredentialsPanelProps) {
  const [state, setState] = useState<CredState>('locked');
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_MAX_MS);
  const [creds, setCreds] = useState(MOCK_CREDS);
  const [logs, setLogs] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session timer
  useEffect(() => {
    if (state === 'decrypted' && sessionStart) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - sessionStart;
        const remaining = SESSION_MAX_MS - elapsed;
        if (remaining <= 0) {
          handleExpire();
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state, sessionStart]);

  const addLog = (msg: string) => {
    const ts = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleRequest = () => {
    setState('requesting');
    addLog('Credential access requested');
    toast.info('Requesting credential access...');

    // Simulate push notification to customer
    setTimeout(() => {
      setState('awaiting_approval');
      addLog(`Push notification sent to ${customerEmail || 'customer'}`);
      toast.success('Push notification sent to customer for approval');
    }, 1500);

    // Simulate customer approval after delay
    setTimeout(() => {
      setState('approved');
      addLog('Customer approved credential access');
      toast.success('Customer approved credential access');

      setTimeout(() => {
        setState('decrypted');
        setSessionStart(Date.now());
        addLog('Ephemeral key received via secure WebSocket');
        addLog('Credentials decrypted in VM context only');
        toast.success('Credentials decrypted — 4-hour session started');
      }, 1000);
    }, 5000);
  };

  const handleExpire = () => {
    setState('expired');
    setCreds(MOCK_CREDS); // re-mask
    addLog('SESSION EXPIRED — All credentials purged from memory');
    toast.error('Credential session expired — all data purged');
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleManualLock = () => {
    setState('locked');
    setCreds(MOCK_CREDS);
    setSessionStart(null);
    addLog('Engineer manually locked credentials');
    toast.info('Credentials locked');
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const toggleMask = (index: number) => {
    setCreds(prev => prev.map((c, i) => i === index ? { ...c, masked: !c.masked } : c));
  };

  const getStateBadge = () => {
    switch (state) {
      case 'locked': return <span className="px-2 py-1 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">Locked</span>;
      case 'requesting': return <span className="px-2 py-1 text-[9px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase animate-pulse">Requesting...</span>;
      case 'awaiting_approval': return <span className="px-2 py-1 text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">Awaiting Approval</span>;
      case 'approved': return <span className="px-2 py-1 text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase animate-pulse">Approved</span>;
      case 'decrypted': return <span className="px-2 py-1 text-[9px] font-bold bg-lime/10 text-lime border border-lime/20 uppercase">Active</span>;
      case 'expired': return <span className="px-2 py-1 text-[9px] font-bold bg-white/5 text-white/30 border border-white/10 uppercase">Expired</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Status Header ── */}
      <div className="bg-surface border border-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center border ${
              state === 'decrypted' ? 'bg-lime/10 border-lime/30' :
              state === 'locked' ? 'bg-red-500/10 border-red-500/20' :
              'bg-yellow-500/10 border-yellow-500/20'
            }`}>
              {state === 'decrypted' ? <Unlock className="w-5 h-5 text-lime" /> :
               state === 'expired' ? <Lock className="w-5 h-5 text-white/30" /> :
               <KeyRound className="w-5 h-5 text-yellow-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold">Credential Vault</h3>
              <p className="text-[10px] text-white/40 font-mono">{incidentId}</p>
            </div>
          </div>
          {getStateBadge()}
        </div>

        {/* Session Timer */}
        {state === 'decrypted' && (
          <div className="flex items-center gap-3 p-2.5 bg-lime/5 border border-lime/10 mb-3">
            <Timer className="w-4 h-4 text-lime" />
            <div className="flex-1">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Session Time Remaining</div>
              <div className="text-xl font-black font-mono text-lime tabular-nums">
                {formatTimeRemaining(timeRemaining)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-white/30">Auto-logout in</div>
              <div className="text-xs text-lime font-mono">{Math.floor(timeRemaining / 60000)}m</div>
            </div>
          </div>
        )}

        {/* Progress bar for time */}
        {state === 'decrypted' && (
          <div className="w-full h-1 bg-white/5 mb-3">
            <div
              className="h-full bg-lime transition-all duration-1000"
              style={{ width: `${(timeRemaining / SESSION_MAX_MS) * 100}%` }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {state === 'locked' && (
            <Button
              onClick={handleRequest}
              className="bg-lime text-black hover:bg-lime/90 text-xs font-bold h-8"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Request Credentials
            </Button>
          )}
          {state === 'requesting' && (
            <Button disabled className="bg-yellow-500/20 text-yellow-400 text-xs font-bold h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Sending Request...
            </Button>
          )}
          {state === 'awaiting_approval' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20">
              <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span className="text-xs text-orange-400 font-bold">Waiting for customer approval...</span>
            </div>
          )}
          {state === 'approved' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20">
              <UserCheck className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400 font-bold">Customer approved — decrypting...</span>
            </div>
          )}
          {state === 'decrypted' && (
            <>
              <Button
                onClick={handleManualLock}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold h-8"
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Lock Now
              </Button>
              <span className="text-[10px] text-white/30 ml-auto">
                <Shield className="w-3 h-3 inline mr-1" />
                Decrypted in VM only — never leaves sandbox
              </span>
            </>
          )}
          {state === 'expired' && (
            <Button
              onClick={handleRequest}
              className="bg-lime text-black hover:bg-lime/90 text-xs font-bold h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Request Again
            </Button>
          )}
        </div>
      </div>

      {/* ── Approval Flow Visualization ── */}
      <div className="bg-surface border border-white/5 p-4">
        <span className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 block">Approval Flow</span>
        <div className="flex items-center gap-0">
          {[
            { label: 'Request', state: 'requesting' },
            { label: 'Notify', state: 'awaiting_approval' },
            { label: 'Approve', state: 'approved' },
            { label: 'Decrypt', state: 'decrypted' },
          ].map((step, i, arr) => {
            const stepStates: CredState[] = ['requesting', 'awaiting_approval', 'approved', 'decrypted'];
            const stepIndex = stepStates.indexOf(step.state as CredState);
            const currentIndex = stepStates.indexOf(state);
            const isDone = currentIndex > stepIndex;
            const isActive = state === step.state;

            return (
              <div key={step.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 flex items-center justify-center border text-[10px] font-black ${
                    isDone ? 'bg-lime/20 border-lime/40 text-lime' :
                    isActive ? 'bg-cyan/20 border-cyan/40 text-cyan animate-pulse' :
                    'bg-white/5 border-white/10 text-white/20'
                  }`}>
                    {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[8px] mt-1 font-bold uppercase ${
                    isDone ? 'text-lime' : isActive ? 'text-cyan' : 'text-white/20'
                  }`}>{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`w-6 h-[2px] ${
                    isDone ? 'bg-lime/40' : 'bg-white/5'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Credential Fields ── */}
      {(state === 'decrypted' || state === 'expired') && (
        <div className="bg-surface border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">Decrypted Credentials</span>
            <span className="text-[9px] text-white/30 font-mono">VM-only access</span>
          </div>
          <div className="divide-y divide-white/5">
            {creds.map((cred, i) => (
              <div key={i} className="p-3 flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <span className="text-[10px] text-white/40 uppercase">{cred.label}</span>
                </div>
                <div className="flex-1 font-mono text-xs bg-black border border-white/5 px-2.5 py-1.5 truncate">
                  {state === 'expired' ? (
                    <span className="text-white/20">••••••••••••••••</span>
                  ) : cred.masked ? (
                    <span className="text-white/30">••••••••••••••••</span>
                  ) : (
                    <span className="text-lime">{cred.value}</span>
                  )}
                </div>
                {state === 'decrypted' && (
                  <button
                    onClick={() => toggleMask(i)}
                    className="p-1.5 hover:bg-white/5 transition-colors"
                  >
                    {cred.masked ? (
                      <Eye className="w-3.5 h-3.5 text-white/30" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-lime" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Security Notice ── */}
      <div className="p-3 border border-white/5 bg-white/[0.01]">
        <div className="flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
          <div className="text-[10px] text-white/30 space-y-1">
            <p>All credential access is logged and customer-auditable.</p>
            <p>Credentials are decrypted in the isolated VM only — never transmitted to engineer device.</p>
            <p>Session auto-terminates after 4 hours. All data is purged from memory.</p>
            <p>Customer receives real-time notification of all credential access events.</p>
          </div>
        </div>
      </div>

      {/* ── Access Log ── */}
      {logs.length > 0 && (
        <div className="bg-black border border-white/5 p-3 font-mono text-[10px]">
          <div className="flex items-center gap-2 mb-2 text-white/40">
            <Clock className="w-3 h-3" />
            <span>Access Log</span>
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`${
                log.includes('EXPIRED') ? 'text-red-400' :
                log.includes('purged') ? 'text-red-400' :
                log.includes('decrypted') ? 'text-lime' :
                log.includes('approved') ? 'text-green-400' :
                'text-white/30'
              }`}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
