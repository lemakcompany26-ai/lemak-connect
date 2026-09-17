import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { notifyUser } from '../../shared/lemak.ts';

// Private buyer/seller chat for a marketplace escrow order. Only the two
// participants (and admins) can read or post — enforced server-side and by
// the OrderMessage access rules.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const service = base44.asServiceRole;

    const body = await req.json();
    const action = String(body.action || '');

    const orders = await service.entities.MarketplaceOrder.filter({ id: body.orderId }, '-created_date', 1);
    const order = orders && orders[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    const isBuyer = order.buyerUserId === user.id;
    const isSeller = !!order.sellerUserId && order.sellerUserId === user.id;
    if (!isBuyer && !isSeller) {
      return Response.json({ error: 'You are not part of this order' }, { status: 403 });
    }

    if (action === 'list') {
      const messages = await service.entities.OrderMessage.filter({ orderId: order.id }, 'created_date', 200);
      return Response.json({ ok: true, messages, role: isBuyer ? 'buyer' : 'seller' });
    }

    if (action === 'send') {
      const content = String(body.content || '').trim().slice(0, 1000);
      if (!content) return Response.json({ error: 'Message cannot be empty' }, { status: 400 });
      if (['cancelled', 'refunded'].includes(order.status)) {
        return Response.json({ error: 'This order is closed' }, { status: 400 });
      }
      const senderRole = isBuyer ? 'buyer' : 'seller';
      const message = await service.entities.OrderMessage.create({
        orderId: order.id,
        buyerUserId: order.buyerUserId,
        sellerUserId: order.sellerUserId || null,
        senderRole,
        senderName: user.full_name || user.email || 'User',
        content
      });
      const recipient = isBuyer ? order.sellerUserId : order.buyerUserId;
      if (recipient) {
        await notifyUser(service, {
          userId: recipient, type: 'marketplace',
          title: 'New order message',
          message: `${user.full_name || 'A customer'}: "${content.slice(0, 80)}" — order ${order.transactionId}`,
          actionUrl: '/app/marketplace'
        });
      }
      return Response.json({ ok: true, message });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}