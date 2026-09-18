import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdminEmail, isStaffRole } from '../../shared/lemak.ts';
import { sendTransactionalEmail, getEmailSystemStatus, TEMPLATES } from '../../shared/emails.ts';

// Central transactional email function. All emails are generated and sent
// server-side through Resend; the API key never appears in any request,
// response or log. Arbitrary subjects/HTML are rejected — only registered
// templates can be sent.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || 'send');

    const isStaff = async () => {
      const profiles = await service.entities.UserProfile.filter({ userId: user.id }, '-created_date', 1);
      const profile = profiles && profiles[0] ? profiles[0] : null;
      return (profile && isStaffRole(profile.role)) || isAdminEmail(user.email);
    };

    if (action === 'send') {
      const { recipientEmail, recipientName, emailType, data, transactionId } = body;
      if (!emailType || !TEMPLATES[emailType]) {
        return Response.json({ error: 'Unknown email type' }, { status: 400 });
      }
      if (!recipientEmail) return Response.json({ error: 'Missing recipient email' }, { status: 400 });
      const result = await sendTransactionalEmail(service, {
        emailType, recipientEmail, recipientName,
        transactionId: transactionId || null, data: data || {}, userId: user.id
      });
      return Response.json({
        ok: result.ok, duplicated: !!result.duplicated,
        skipped: result.skipped || null, error: result.error || null
      });
    }

    if (action === 'test') {
      if (!(await isStaff())) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const to = String(body.to || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return Response.json({ error: 'Enter a valid email address' }, { status: 400 });
      }
      const result = await sendTransactionalEmail(service, {
        emailType: 'TEST', recipientEmail: to, recipientName: user.full_name || 'Admin',
        userId: user.id, transactionId: `test-${Date.now()}`, force: true, data: {}
      });
      return Response.json({ ok: result.ok, error: result.error || null, duplicated: !!result.duplicated });
    }

    if (action === 'status') {
      if (!(await isStaff())) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const status = await getEmailSystemStatus(service);
      let recentLogs = [];
      try {
        const logs = await service.entities.EmailLog.list('-created_date', 10);
        recentLogs = (logs || []).map(l => ({
          emailType: l.emailType, recipientEmail: l.recipientEmail, status: l.status,
          subject: l.subject, transactionId: l.transactionId,
          sentAt: l.sentAt, safeErrorMessage: l.safeErrorMessage, createdAt: l.created_date
        }));
      } catch (e) { /* no logs yet */ }
      return Response.json({ ok: true, ...status, recentLogs });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}