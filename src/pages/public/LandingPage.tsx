// ═══════════════════════════════════════════════════════════════
// LANDING PAGE — UptimeOps v2.2
// 6-Section CRO-optimized landing experience
// ═══════════════════════════════════════════════════════════════

import Navbar from '@/sections/landing/Navbar';
import HeroSphere from '@/sections/landing/HeroSphere';
import AgentPipeline from '@/sections/landing/AgentPipeline';
import ScannerCodeGraph from '@/sections/landing/ScannerCodeGraph';
import PricingEngine from '@/sections/landing/PricingEngine';
import VaultPreview from '@/sections/landing/VaultPreview';
import TrustFooter from '@/sections/landing/TrustFooter';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-void text-white overflow-x-hidden">
      <Navbar />

      {/* Section 1: Hero Sphere */}
      <HeroSphere />

      {/* Section 2: 6-Agent Pipeline */}
      <div id="pipeline">
        <AgentPipeline />
      </div>

      {/* Section 3: 42-Scanner + CodeGraph */}
      <div id="security">
        <ScannerCodeGraph />
      </div>

      {/* Section 4: Pricing Engine */}
      <div id="pricing">
        <PricingEngine />
      </div>

      {/* Section 5: Zero-Knowledge Vault Preview */}
      <div id="vault">
        <VaultPreview />
      </div>

      {/* Section 6: Trust Footer */}
      <TrustFooter />
    </div>
  );
}
