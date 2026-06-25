import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, ArrowLeft, KeyRound, Upload, List
} from 'lucide-react';
import { CredentialForm } from '@/components/credentials/CredentialForm';
import { CredentialVault } from '@/components/credentials/CredentialVault';

type VaultTab = 'submit' | 'manage';

export function CustomerVault() {
  const [activeTab, setActiveTab] = useState<VaultTab>('submit');

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            to="/customer"
            className="text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-white/40 uppercase tracking-widest">Customer Portal</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight">CREDENTIAL VAULT</h2>
        <p className="text-sm text-white/40 mt-1">
          Zero-knowledge credential submission and management
        </p>
      </div>

      {/* Security Header */}
      <div className="bg-void border border-lime/10 p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-lime/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-lime" />
        </div>
        <div>
          <div className="text-sm font-bold text-lime uppercase tracking-wider">
            Client-Side Encryption Active
          </div>
          <p className="text-xs text-white/50 mt-0.5">
            Your credentials are encrypted with AES-256-GCM in your browser before transmission.
            UptimeOps servers never see your plaintext credentials or the decryption key.
          </p>
        </div>
        <Lock className="w-5 h-5 text-lime/30 flex-shrink-0" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'submit'
              ? 'text-lime border-b-2 border-lime'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          Submit New
        </button>
        <button
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'manage'
              ? 'text-lime border-b-2 border-lime'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          Manage Active
        </button>
      </div>

      {/* Content */}
      {activeTab === 'submit' && (
        <CredentialForm onSubmitted={() => setActiveTab('manage')} />
      )}

      {activeTab === 'manage' && (
        <CredentialVault />
      )}

      {/* Security FAQ */}
      <div className="bg-surface border border-white/5 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-lime" />
          How It Works
        </h3>
        <div className="space-y-3">
          {[
            {
              q: 'Can UptimeOps read my credentials?',
              a: 'No. Your credentials are encrypted with AES-256-GCM in your browser using an ephemeral key. The key never leaves your browser. Our servers only store the ciphertext — we cannot decrypt it.',
            },
            {
              q: 'How does the engineer access my site?',
              a: 'When a repair session starts, your browser securely relays the decryption key directly to the isolated VM via an encrypted WebSocket channel. The VM decrypts and uses the credentials. When you close the tab or revoke access, the key is destroyed.',
            },
            {
              q: 'What happens when I revoke access?',
              a: 'Revocation is instant. The encrypted payload is marked as revoked in our database, all active engineer sessions are terminated, and the associated VM is destroyed. An audit log entry is created for compliance.',
            },
            {
              q: 'How long do credentials remain active?',
              a: 'Credentials auto-expire after 72 hours. You can revoke them earlier at any time. Once expired or revoked, the encrypted data is permanently inaccessible.',
            },
          ].map((item) => (
            <div key={item.q} className="border-b border-white/5 last:border-0 pb-3 last:pb-0">
              <p className="text-sm font-medium text-white/70 mb-1">{item.q}</p>
              <p className="text-xs text-white/40 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
