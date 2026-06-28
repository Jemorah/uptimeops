// UptimeOps v2.1 — HQ Scanner Registry Management
// Full grid of 42 scanners with health check

import { ScannerRegistry } from '@/components/security/ScannerRegistry';
import { Activity, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function HQScanners() {
  const [stats, setStats] = useState({ total: 0, active: 0, failed: 0 });

  useEffect(() => {
    supabase.from('scanner_registry').select('is_active').then(({ data }) => {
      if (data) {
        setStats({
          total: data.length,
          active: data.filter(s => s.is_active).length,
          failed: data.filter(s => !s.is_active).length,
        });
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">42-Scanner Registry</h1>
          <p className="text-xs text-white/40 mt-0.5">Manage all security scanners across the 6-stage pipeline</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-[#a3e635]/10 text-[#a3e635] rounded-lg text-xs font-bold hover:bg-[#a3e635]/20 transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Health Check
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[#a3e635]" />
            <span className="text-2xl font-black text-white">{stats.total}</span>
          </div>
          <p className="text-[11px] text-white/40">Total Scanners</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-[#22c55e]" />
            <span className="text-2xl font-black text-white">{stats.active}</span>
          </div>
          <p className="text-[11px] text-white/40">Active</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-2xl font-black text-white">{stats.failed}</span>
          </div>
          <p className="text-[11px] text-white/40">Inactive</p>
        </div>
      </div>

      <ScannerRegistry />
    </div>
  );
}
