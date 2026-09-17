import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { OTP_SERVICE_CATALOGUE, getOtpServers } from '../../shared/otp.ts';

// OTP service catalogue (email, SMS, all social media) + dual OTP server
// status for the virtual numbers feature. Server B is optional — used as
// an automatic fallback once its URL and key are configured.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = String(body.action || 'list');

    if (action === 'list') {
      const servers = getOtpServers().map(s => ({
        id: s.id,
        label: s.label,
        configured: Boolean(s.url && s.key)
      }));
      const serviceCount = OTP_SERVICE_CATALOGUE.reduce((n, g) => n + g.services.length, 0);
      return Response.json({ services: OTP_SERVICE_CATALOGUE, servers, serviceCount });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}