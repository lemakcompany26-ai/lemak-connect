import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatNaira, formatDate } from '@/lib/format';

const TYPE_ICONS = {
  transaction: '💸', wallet: '👛', payment: '💳', marketplace: '🛍️',
  virtual_number: '📱', smm: '📈', security: '🔐', system: '⚙️', promotional: '🎁'
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    base44.entities.Notification.list('-created_date', 50).then(setNotifications).catch(() => setNotifications([]));
  }, []);

  const markRead = async (n) => {
    if (n.isRead) return;
    try {
      await base44.entities.Notification.update(n.id, { isRead: true });
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    } catch (e) { /* non-fatal */ }
  };

  const markAllRead = async () => {
    const unread = (notifications || []).filter(n => !n.isRead);
    for (const n of unread) {
      try { await base44.entities.Notification.update(n.id, { isRead: true }); } catch (e) { /* skip */ }
    }
    setNotifications(prev => prev.map(x => ({ ...x, isRead: true })));
  };

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2.5"><Bell className="w-6 h-6 text-primary" /> Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-primary px-4 py-2 rounded-lg hover:bg-primary/5">
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {notifications === null && <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>}
        {notifications && notifications.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        )}
        {notifications && notifications.map(n => (
          <button key={n.id} onClick={() => markRead(n)} className={'w-full text-left rounded-2xl border p-4 transition-all ' + (n.isRead ? 'border-border bg-card' : 'border-primary/25 bg-primary/5')}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">{TYPE_ICONS[n.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{n.title}</span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                <div className="mt-1.5 text-[11px] text-muted-foreground/70">{formatDate(n.created_date)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}