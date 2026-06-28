// UptimeOps v2.1 — Engineer Onboarding
// Handles invitation acceptance: validates token, creates auth user, sets up profile
// Can also create engineer profiles directly (admin/coordinator only)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'engineer-onboard';

interface OnboardRequest {
  action: 'accept_invitation' | 'create_engineer' | 'get_invitation';
  token?: string;
  email?: string;
  password?: string;
  full_name?: string;
  specialization?: string[];
  phone?: string;
  max_weekly_hours?: number;
  timezone?: string;
}

// ═══════════════════════════════════════════════════════════════
// ACCEPT INVITATION
// ═══════════════════════════════════════════════════════════════

async function acceptInvitation(
  supabase: any,
  token: string,
  password: string,
  full_name: string
): Promise<{ success: boolean; engineer_id?: string; error?: string }> {;

  // 1. Find and validate invitation
  const { data: invitation, error: invError } = await supabase
    .from('engineer_invitations')
    .select('*, invited_by')
    .eq('token', token)
    .single();

  if (invError || !invitation) {
    return { success: false, error: 'Invalid or expired invitation token' };
  }

  if (invitation.used_at) {
    return { success: false, error: 'Invitation already used' };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'Invitation expired' };
  }

  // 2. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError || !authUser.user) {;
    return { success: false, error: authError?.message || 'Failed to create user account' };
  }

  const userId = authUser.user.id;

  // 3. Create engineer profile
  const { error: profileError } = await supabase.from('engineer_profiles').insert({
    id: userId,
    full_name,
    email: invitation.email,
    specialization: invitation.specialization || [],
    is_available: true,
    status: 'active',
    joined_at: new Date().toISOString(),
    max_weekly_hours: 40,
  });

  if (profileError) {;
    // Don't fail - the auth user exists, profile can be fixed manually
  }

  // 4. Set user role
  const { error: roleError } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'engineer',
  });

  if (roleError) {;
  }

  // 5. Mark invitation as used
  await supabase.from('engineer_invitations').update({
    used_at: new Date().toISOString(),
  }).eq('id', invitation.id);

  // 6. Log the onboarding
  await supabase.from('activity_log').insert({
    type: 'engineer_onboarded',
    user_id: userId,
    metadata: {
      invited_by: invitation.invited_by,
      specialization: invitation.specialization,
      method: 'invitation',
    },
  });

  return { success: true, engineer_id: userId };
}

// ═══════════════════════════════════════════════════════════════
// CREATE ENGINEER (admin/coordinator only)
// ═══════════════════════════════════════════════════════════════

async function createEngineer(
  supabase: any,
  callerId: string,
  data: {
    email: string;
    password: string;
    full_name: string;
    specialization?: string[];
    phone?: string;
    max_weekly_hours?: number;
    timezone?: string;
  }
): Promise<{ success: boolean; engineer_id?: string; error?: string }> {;

  // Check caller is admin or coordinator
  const { data: callerRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', callerId)
    .single();

  if (!callerRole || !['admin', 'coordinator'].includes(callerRole.role)) {
    return { success: false, error: 'Permission denied: admin or coordinator required' };
  }

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });

  if (authError || !authUser.user) {
    return { success: false, error: authError?.message || 'Failed to create user' };
  }

  const userId = authUser.user.id;

  // Create profile
  await supabase.from('engineer_profiles').insert({
    id: userId,
    full_name: data.full_name,
    email: data.email,
    specialization: data.specialization || [],
    phone: data.phone,
    is_available: true,
    status: 'active',
    joined_at: new Date().toISOString(),
    max_weekly_hours: data.max_weekly_hours || 40,
    timezone: data.timezone || 'UTC',
  });

  // Set role
  await supabase.from('user_roles').insert({ user_id: userId, role: 'engineer' });

  // Log
  await supabase.from('activity_log').insert({
    type: 'engineer_created',
    user_id: userId,
    metadata: { created_by: callerId, specialization: data.specialization },
  });

  return { success: true, engineer_id: userId };
}

// ═══════════════════════════════════════════════════════════════
// GET INVITATION DETAILS
// ═══════════════════════════════════════════════════════════════

async function getInvitation(supabase: any, token: string) {
  const { data: invitation, error } = await supabase
    .from('engineer_invitations')
    .select('email, specialization, expires_at, used_at')
    .eq('token', token)
    .single();

  if (error || !invitation) {
    return { valid: false, error: 'Invalid token' };
  }

  if (invitation.used_at) {
    return { valid: false, error: 'Already used' };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { valid: false, error: 'Expired' };
  }

  return {
    valid: true,
    email: invitation.email,
    specialization: invitation.specialization,
    expires_at: invitation.expires_at,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body: OnboardRequest = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'action required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabaseClient(req);

    // No auth required for accepting invitation (public endpoint)
    if (action === 'accept_invitation') {
      const { token, password, full_name } = body;
      if (!token || !password || !full_name) {
        return new Response(
          JSON.stringify({ error: 'token, password, and full_name required' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await acceptInvitation(supabase, token, password, full_name);
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: corsHeaders }
      );
    }

    if (action === 'get_invitation') {
      const { token } = body;
      if (!token) {
        return new Response(JSON.stringify({ error: 'token required' }), { status: 400, headers: corsHeaders });
      }
      const result = await getInvitation(supabase, token);
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    }

    // Auth required for admin actions
    if (action === 'create_engineer') {
      const user = getAuthUser(req);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
      }

      const { email, password, full_name, specialization, phone, max_weekly_hours, timezone } = body;
      if (!email || !password || !full_name) {
        return new Response(
          JSON.stringify({ error: 'email, password, full_name required' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const result = await createEngineer(supabase, user.id, {
        email, password, full_name, specialization, phone, max_weekly_hours, timezone,
      });

      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 400, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });

  } catch (err) {
    logError(FUNCTION, \'Operation failed\', err);;
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
