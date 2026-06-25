import { useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle,
  Clock, Globe, Shield, TrendingUp, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface SiteMetric {
  url: string;
  status: 'up' | 'down' | 'degraded';
  uptime: string;
  responseTime: string;
  lastCheck: string;
}

const mockSites: SiteMetric[] = [
  { url: 'acme-corp.com', status: 'up', uptime: '99.99%', responseTime: '42ms', lastCheck: '2s ago' },
  { url: 'shop.acme-corp.com', status: 'up', uptime: '99.97%', responseTime: '68ms', lastCheck: '3s ago' },
  { url: 'api.acme-corp.com', status: 'up', uptime: '100.00%', responseTime: '12ms', lastCheck: '1s ago' },
];

const mockIncidents = [
  { id: 'INC-0641', title: 'Database connection timeout', status: 'resolved', severity: 'high', time: '2h ago' },
  { id: 'INC-0639', title: 'CSS asset 404 on checkout page', status: 'resolved', severity: 'low', time: '1d ago' },
  { id: 'INC-0635', title: 'SSL cert renewal', status: 'resolved', severity: 'medium', time: '3d ago' },
];

export function CustomerDashboard() {
  const [subscription] = useState({
    tier: 'Pro',
    status: 'active',
    sitesUsed: 3,
    sitesLimit: 10,
    incidentsUsed: 8,
    incidentsLimit: 25,
    expiresAt: '2026-12-31',
  });

  const statusConfig = {
    up: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Up' },
    down: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Down' },
    degraded: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">DASHBOARD</h2>
          <p className="text-sm text-white/40 mt-1">Overview of your protected sites and account</p>
        </div>
        <Link
          to="/emergency"
          className="px-4 py-2 bg-magenta/10 border border-magenta/30 text-magenta text-sm font-medium hover:bg-magenta/20 transition-colors flex items-center gap-2 self-start"
        >
          <AlertTriangle className="w-4 h-4" />
          Report Emergency
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sites Up', value: '3/3', icon: Globe, color: 'text-green-500' },
          { label: 'Incidents (30d)', value: '8', icon: AlertTriangle, color: 'text-yellow-500' },
          { label: 'Avg Response', value: '41ms', icon: Activity, color: 'text-lime' },
          { label: 'Uptime (30d)', value: '99.98%', icon: TrendingUp, color: 'text-cyan' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="text-2xl font-black font-mono">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Sites + Subscription Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monitored Sites */}
        <div className="lg:col-span-2 bg-surface border border-white/5">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-lime" />
              Monitored Sites
            </h3>
            <span className="text-xs font-mono text-white/40">{subscription.sitesUsed} / {subscription.sitesLimit}</span>
          </div>
          <div className="divide-y divide-white/5">
            {mockSites.map((site) => {
              const config = statusConfig[site.status];
              return (
                <div key={site.url} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <config.icon className={`w-4 h-4 ${config.color}`} />
                    <div>
                      <div className="text-sm font-medium">{site.url}</div>
                      <div className="text-xs text-white/40 font-mono">Last check: {site.lastCheck}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-white/40">Uptime</div>
                      <div className="text-sm font-mono font-bold">{site.uptime}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/40">Response</div>
                      <div className="text-sm font-mono">{site.responseTime}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Card */}
        <div className="bg-surface border border-white/5">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime" />
              Subscription
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Plan</span>
              <span className="text-sm font-bold text-lime">{subscription.tier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Status</span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium capitalize">{subscription.status}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Renews</span>
              <span className="text-sm font-mono">{subscription.expiresAt}</span>
            </div>

            <div className="pt-2 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/40">Sites</span>
                  <span className="font-mono">{subscription.sitesUsed}/{subscription.sitesLimit}</span>
                </div>
                <Progress value={(subscription.sitesUsed / subscription.sitesLimit) * 100} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/40">Incidents</span>
                  <span className="font-mono">{subscription.incidentsUsed}/{subscription.incidentsLimit}</span>
                </div>
                <Progress value={(subscription.incidentsUsed / subscription.incidentsLimit) * 100} className="h-1.5" />
              </div>
            </div>

            <Link
              to="/customer/billing"
              className="flex items-center justify-center gap-2 w-full py-2 border border-white/10 text-sm text-white/60 hover:border-lime hover:text-lime transition-colors"
            >
              Manage Subscription
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-surface border border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan" />
            Recent Incidents
          </h3>
          <Link to="/customer/incidents" className="text-xs text-lime hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {mockIncidents.map((inc) => (
            <div key={inc.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">{inc.title}</div>
                  <div className="text-xs text-white/40 font-mono">{inc.id} &middot; {inc.severity}</div>
                </div>
              </div>
              <span className="text-xs text-white/40 font-mono">{inc.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
