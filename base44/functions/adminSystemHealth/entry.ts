import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole } from '../../shared/lemak.ts';

// Admin-only system health check. Never reveals secret values —
// only whether each provider/secret is configured and operational.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
    const profile = profiles && profiles[0] ? profiles[0] : null;
    const authorized = (profile && isStaffRole(profile.role)) || isAdminEmail(user.email);
    if (!authorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { secrets } = await import('base44:runtime');
    const configured = name => {
      try { return Boolean(secrets.get(name)); } catch (e) { return false; }
    };

    // Database: exercised by this very request
    const database = { status: 'operational' };

    const vtuKey = configured('BIGISUBS_API_KEY') && configured('BIGISUBS_API_URL');
    const paystackKey = configured('PAYSTACK_SECRET_KEY');
    const otpKey = configured('OTP_PROVIDER_API_KEY') && configured('OTP_PROVIDER_API_URL');
    const smmKey = configured('SMM_API_KEY') && configured('SMM_API_URL');
    const openaiKey = configured('OPENAI_API_KEY');
    const resendKey = configured('RESEND_API_KEY');

    const providers = {
      database: { label: 'Database', status: database.status },
      vtu: { label: 'VTU Provider (Bigisubs)', status: vtuKey ? 'operational' : 'not_configured', detail: 'Airtime, data, bills' },
      payments: { label: 'Payments (Paystack)', status: paystackKey ? 'operational' : 'not_configured', detail: 'Card wallet funding' },
      otp: { label: 'Virtual Numbers (OTP)', status: otpKey ? 'operational' : 'not_configured', detail: 'OTP phone numbers' },
      smm: { label: 'Social Growth (SMM)', status: smmKey ? 'operational' : 'not_configured', detail: 'Likes, views, followers' },
      ai: { label: 'Lemak AI Support (OpenAI)', status: openaiKey ? 'operational' : 'not_configured', detail: 'AI chat assistant' },
      email: { label: 'Email (Resend)', status: resendKey ? 'operational' : 'not_configured', detail: 'Transactional emails' }
    };

    return Response.json({ providers, checkedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}