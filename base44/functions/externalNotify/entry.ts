import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { notifyUser } from '../../shared/lemak.ts';

// External notification endpoint for the separately-hosted website
// (Vercel production). The caller authenticates with the shared
// EXTERNAL_NOTIFY_API_KEY secret; the endpoint resolves the target by
// their app email and delivers in-app notification + native push.
// Bound and validated: one recipient, capped fields, no raw passthrough.

export default async function(req: Request): Promise<Response> {
  try {
    const apiKey = secrets.get('EXTERNAL_NOTIFY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Endpoint not configured. Set the EXTERNAL_NOTIFY_API_KEY secret first.' }, { status: 503 });
    }
    if (req.headers.get('x-api-key') !== apiKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'send');

    if (action === 'send') {
      const to = String(body.to || '').trim().toLowerCase().slice(0, 120);
      const title = String(body.title || '').trim().slice(0, 100);
      const content = String(body.content || '').trim().slice(0, 240);
      const actionUrl = String(body.actionUrl || '').trim().slice(0, 200) || null;
      if (!to || !title || !content) {
        return Response.json({ error: 'to, title and content are required' }, { status: 400 });
      }

      const base44 = createClientFromRequest(req);
      const service = base44.asServiceRole;
      const profiles = await service.entities.UserProfile.filter({ email: to }, '-created_date', 5);
      const profile = profiles && profiles[0] ? profiles[0] : null;
      if (!profile || !profile.userId) {
        return Response.json({ error: 'No Lemak Connect account uses that email' }, { status: 404 });
      }

      await notifyUser(service, {
        userId: profile.userId,
        type: 'system',
        title,
        message: content,
        actionUrl
      });
      return Response.json({ ok: true, sentTo: to });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}