import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendUserEmail } from '../../shared/lemak.ts';
import { SUPPORT_EMAIL } from '../../shared/emails.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;
    const body = await req.json();
    const subject = String(body.subject || 'Customer support request').trim().slice(0, 160);
    const content = String(body.content || '').trim().slice(0, 4000);
    const transactionId = String(body.transactionId || '').trim().slice(0, 100);
    if (!content) return Response.json({ error: 'Describe your complaint or query first.' }, { status: 400 });

    const conversation = await service.entities.SupportConversation.create({
      userId: user.id, subject, channel: 'human', status: 'open', lastMessageAt: new Date().toISOString()
    });
    const message = [
      transactionId ? `Transaction ID: ${transactionId}` : '',
      content
    ].filter(Boolean).join('\n\n');
    await service.entities.SupportMessage.create({
      conversationId: conversation.id, userId: user.id, sender: 'user', content: message, isRead: false
    });
    await sendUserEmail({
      to: SUPPORT_EMAIL,
      subject: `[Lemak support] ${subject}`,
      html: `<p><b>Customer:</b> ${user.full_name || user.email}<br/><b>Email:</b> ${user.email}<br/><b>Conversation:</b> ${conversation.id}</p><p>${message.replace(/\n/g, '<br/>')}</p>`
    });
    return Response.json({ ok: true, conversationId: conversation.id, supportEmail: SUPPORT_EMAIL });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.statusCode || 500 });
  }
}
