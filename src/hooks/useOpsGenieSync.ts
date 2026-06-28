// UptimeOps v2.1 — OpsGenie Sync Hook
// Fetches opsgenie_sync and oncall_schedules for engineer data

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface OnCallEntry {
  engineer_id: string;
  schedule_date: string;
  is_on_call: boolean;
  engineer_name?: string;
  engineer_email?: string;
}

export function useOpsGenieSync() {
  const [synced, setSynced] = useState<any[]>([]);
  const [oncallToday, setOncallToday] = useState<OnCallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Get synced engineers
    const { data: syncData } = await supabase
      .from('opsgenie_sync')
      .select('*, engineer_profiles(id, full_name, email, specialization)')
      .order('last_synced_at', { ascending: false });

    setSynced(syncData || []);

    // Get today's on-call schedule
    const today = new Date().toISOString().split('T')[0];
    const { data: scheduleData } = await supabase
      .from('oncall_schedules')
      .select('*, engineer_profiles(id, full_name, email)')
      .eq('schedule_date', today)
      .eq('is_on_call', true);

    setOncallToday((scheduleData || []).map((s: any) => ({
      engineer_id: s.engineer_id,
      schedule_date: s.schedule_date,
      is_on_call: s.is_on_call,
      engineer_name: s.engineer_profiles?.full_name,
      engineer_email: s.engineer_profiles?.email,
    })));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('opsgenie-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oncall_schedules' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opsgenie_sync' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  return { synced, oncallToday, loading, refresh: fetchData };
}
