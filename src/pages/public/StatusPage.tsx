import { useState, useEffect } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Clock,
  ArrowUpRight, Activity
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptime: string;
  region: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'resolved' | 'investigating' | 'monitoring';
  service: string;
  started: string;
  resolved?: string;
  severity: 'critical' | 'high' | 'low';
}

const services: ServiceStatus[] = [
  { name: 'AI Triage Engine', status: 'operational', uptime: '99.99%', region: 'Global' },
  { name: 'VM Isolation Grid', status: 'operational', uptime: '99.97%', region: 'US-East, US-West, EU' },
  { name: 'Repair Agent Cluster', status: 'operational', uptime: '99.95%', region: 'Global' },
  { name: 'Validation Pipeline', status: 'operational', uptime: '99.98%', region: 'Global' },
  { name: 'Deploy Controller', status: 'operational', uptime: '99.99%', region: 'Global' },
  { name: 'Audit Stream', status: 'operational', uptime: '100.00%', region: 'Global' },
  { name: 'Engineer Portal', status: 'operational', uptime: '99.96%', region: 'US-East' },
  { name: 'Customer Dashboard', status: 'operational', uptime: '99.99%', region: 'Global' },
  { name: 'Edge Functions', status: 'operational', uptime: '99.94%', region: '40+ Regions' },
  { name: 'Realtime Bus', status: 'operational', uptime: '99.97%', region: 'Global' },
  { name: 'Storage (Encrypted)', status: 'operational', uptime: '99.99%', region: 'Multi-Region' },
  { name: 'Auth Service', status: 'operational', uptime: '99.99%', region: 'Global' },
];

const incidents: Incident[] = [
  {
    id: 'INC-2026-0642',
    title: 'Elevated latency on VM Isolation Grid - US-West',
    status: 'resolved',
    service: 'VM Isolation Grid',
    started: '2026-06-24 14:32 UTC',
    resolved: '2026-06-24 14:47 UTC',
    severity: 'low',
  },
  {
    id: 'INC-2026-0638',
    title: 'AI Triage Engine model refresh',
    status: 'resolved',
    service: 'AI Triage Engine',
    started: '2026-06-23 03:00 UTC',
    resolved: '2026-06-23 03:04 UTC',
    severity: 'low',
  },
];

const statusConfig = {
  operational: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Operational' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
  outage: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Outage' },
  maintenance: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Maintenance' },
};

export function StatusPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const allOperational = services.every(s => s.status === 'operational');

  return (
    <div className="pt-24 pb-16 min-h-screen bg-void text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-lime" />
            <span className="text-lime text-xs font-mono uppercase tracking-widest">System Status</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">STATUS PAGE</h1>
          <p className="text-white/60 mt-2 font-mono text-sm">
            Last updated: {currentTime.toISOString().replace('T', ' ').slice(0, 19)} UTC
          </p>
        </div>

        <div className={`mb-8 p-6 border ${allOperational ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${allOperational ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
            <div>
              <h2 className={`text-lg font-bold ${allOperational ? 'text-green-500' : 'text-yellow-500'}`}>
                {allOperational ? 'All Systems Operational' : 'Some Systems Experiencing Issues'}
              </h2>
              <p className="text-sm text-white/60">
                {allOperational
                  ? 'All services are running normally.'
                  : 'We are aware of the issue and working on a resolution.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-4">Services</h3>
          <div className="bg-surface border border-white/5 divide-y divide-white/5">
            {services.map((service) => {
              const config = statusConfig[service.status];
              return (
                <div key={service.name} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                    <div>
                      <div className="text-sm font-medium">{service.name}</div>
                      <div className="text-xs text-white/40 font-mono">{service.region}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-white/40">{service.uptime}</span>
                    <span className={`text-xs font-bold uppercase ${config.color}`}>{config.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-12">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-4">Incident History (30 Days)</h3>
          {incidents.length === 0 ? (
            <div className="bg-surface border border-white/5 p-6 text-center text-sm text-white/40">
              No incidents in the past 30 days.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="bg-surface border border-white/5 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/40">{incident.id}</span>
                      <span className={`text-xs font-bold uppercase ${
                        incident.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {incident.severity}
                      </span>
                    </div>
                    <span className={`text-xs font-bold uppercase ${
                      incident.status === 'resolved' ? 'text-green-500' : 'text-yellow-500'
                    }`}>
                      {incident.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium mb-1">{incident.title}</h4>
                  <div className="flex items-center gap-4 text-xs text-white/40 font-mono">
                    <span>{incident.service}</span>
                    <span>{incident.started}</span>
                    {incident.resolved && <span>Resolved: {incident.resolved}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => window.open('mailto:support@uptimeops.io?subject=Subscribe%20to%20Status%20Updates', '_blank')}
            className="inline-flex items-center gap-2 text-sm text-lime hover:underline"
          >
            Subscribe to Status Updates
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
