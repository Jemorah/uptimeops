// UptimeOps v2.1 — Send Engineer Invitation
// HQ admin/coordinator sends invite email to new engineer.
// Creates invitation token, stores in DB, sends email with onboarding link.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { logInfo, logError } from '../_shared/logger.ts';
import { getSupabaseClient, getAuthUser } from '../_shared/supabase.ts';

const FUNCTION = 'send-engineer-invite';

// Generate secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 32; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const { email, specialization, invited_by } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseClient(req);

    // Verify caller is authenticated
    const user = getAuthUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify caller is admin or coordinator
    const { data: callerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!callerRole || !['admin', 'coordinator'].includes(callerRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Permission denied: admin or coordinator required' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if email already has an account
    const { data: existingUser } = await supabase
      .from('engineer_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'An engineer with this email already exists' }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('engineer_invitations')
      .select('id, token')
      .eq('email', email)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    let token: string;

    if (existingInvite) {
      // Reuse existing valid invitation
      token = existingInvite.token;
      logInfo(FUNCTION, `Reusing existing invite for ${email}`);
    } else {
      // Create new invitation
      token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error: insertError } = await supabase
        .from('engineer_invitations')
        .insert({
          email,
          token,
          specialization: specialization || [],
          invited_by: user.id,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        logError(FUNCTION, 'Failed to create invitation', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create invitation: ' + insertError.message }),
          { status: 500, headers: corsHeaders }
        );
      }

      logInfo(FUNCTION, `Created invitation for ${email}`);
    }

    // Build onboarding URL
    const siteUrl = Deno.env.get('SITE_URL') || 'https://uptimeops.com';
    const onboardingUrl = `${siteUrl}/#/engineer/onboard?token=${token}`;

    // Send email via Supabase
    const { error: emailError } = await supabase.auth.admin.sendRawEmail({
      to: email,
      subject: 'You\'ve been invited to join UptimeOps',
      html: `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; padding: 40px; background: #0a0a0f; color: #fff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 24px; font-weight: 900; letter-spacing: -1px;">
              UPTIME<span style="color: #a3e635;">OPS</span>
            </h1>
          </div>
          <div style="border: 1px solid rgba(255,255,255,0.1); padding: 30px; background: rgba(255,255,255,0.02);">
            <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Engineer Invitation</h2>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
              You've been invited to join the UptimeOps engineering team. Click the button below to set up your account and get started.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${onboardingUrl}" style="display: inline-block; background: #a3e635; color: #000; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                Accept Invitation
              </a>
            </div>
            <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin-bottom: 8px;">
              Or copy this link:
            </p>
            <p style="color: #a3e635; font-size: 11px; word-break: break-all; font-family: monospace;">
              ${onboardingUrl}
            </p>
            <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin-top: 24px;">
              This invitation expires in 7 days. If you did not expect this invitation, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      logError(FUNCTION, 'Failed to send email', emailError);
      // Return success anyway - the invitation was created, admin can resend
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'Invitation created but email delivery failed. Token: ' + token,
          token,
          onboarding_url: onboardingUrl,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    logInfo(FUNCTION, `Invite sent to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${email}`,
        token,
        onboarding_url: onboardingUrl,
      }),
      { headers: corsHeaders }
    );

  } catch (err: any) {
    logError(FUNCTION, 'Unexpected error', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
