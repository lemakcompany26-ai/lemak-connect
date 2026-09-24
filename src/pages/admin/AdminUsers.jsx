import { useEffect, useState } from 'react';
import { Activity, Search, Loader2, ShieldCheck, WalletCards, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatNaira } from '@/lib/format';

const ROLES = ['customer', 'seller', 'moderator', 'admin', 'super_admin'];
const STATUSES = ['active', 'suspended', 'pending', 'blocked'];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [activityUserId, setActivityUserId] = useState(null);
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const load = () => base44.entities.UserProfile.list('-created_date', 200).then(setUsers).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const showActivity = async (user) => {
    if (activityUserId === user.userId) {
      setActivityUserId(null);
      setActivity(null);
      return;
    }
    setActivityUserId(user.userId);
    setActivity(null);
    setActivityLoading(true);
    try {
      const res = await base44.functions.invoke('adminUserActivity', { userId: user.userId });
      setActivity(res.data || res);
    } catch (err) {
      toast({ title: 'Could not load user activity', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
      setActivityUserId(null);
    } finally {
      setActivityLoading(false);
    }
  };

  const act = async (userId, action, data, label) => {
    setBusyId(userId);
    try {
      await base44.functions.invoke('adminAction', { action, targetId: userId, data });
      toast({ title: label });
      await load();
    } catch (err) {
      toast({ title: 'Action failed', description: (err.response && err.response.data && err.response.data.error) || err.message, variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (users || []).filter(u =>
    !search || (u.fullName + ' ' + u.username + ' ' + u.email).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">{users ? users.length : '…'} accounts</p>
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, username, email…" className="pl-10" />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {users === null && <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
        {filtered.map(u => (
          <div key={u.id}>
            <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full brand-gradient-soft flex items-center justify-center text-white font-bold shrink-0">
                  {u.fullName ? u.fullName[0].toUpperCase() : '?'}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{u.fullName} <span className="text-muted-foreground font-normal">@{u.username}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{u.email} · joined {formatDate(u.created_date)}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={u.role} onValueChange={role => act(u.id, 'update_user_role', { role }, `Role set to ${role}`)}>
                  <SelectTrigger className="w-36 h-9 text-xs"><ShieldCheck className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={u.accountStatus} onValueChange={accountStatus => act(u.id, 'update_user_status', { accountStatus }, `Status set to ${accountStatus}`)}>
                  <SelectTrigger className="w-32 h-9 text-xs capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
                <button type="button" onClick={() => showActivity(u)} className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted">
                  {activityUserId === u.userId ? <X className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />} Activity
                </button>
                {busyId === u.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>
            </div>
            {activityUserId === u.userId && (
              <div className="border-t border-border bg-muted/20 px-4 py-5 space-y-5">
                {activityLoading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
                {activity && (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">Current balance</div><div className="mt-1 text-lg font-extrabold">{formatNaira(activity.wallet?.balance || 0)}</div></div>
                      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">Transactions</div><div className="mt-1 text-lg font-extrabold">{activity.transactions?.length || 0}</div></div>
                      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">Promo uses</div><div className="mt-1 text-lg font-extrabold">{activity.promoRedemptions?.length || 0}</div></div>
                      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">Wallet entries</div><div className="mt-1 text-lg font-extrabold">{activity.ledger?.length || 0}</div></div>
                      <div className="rounded-xl border border-border bg-card p-3"><div className="text-xs text-muted-foreground">All activity</div><div className="mt-1 text-lg font-extrabold">{activity.events?.length || 0}</div></div>
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold"><WalletCards className="w-4 h-4 text-primary" /> User activity timeline</div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-border">
                        {(activity.events || []).map(event => (
                          <div key={event.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                            <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold">{event.title}</div>
                              <div className="text-xs text-muted-foreground break-words">{event.detail || '—'}</div>
                            </div>
                            <div className="text-right shrink-0">
                              {event.amount !== null && event.amount !== undefined && <div className={`text-xs font-bold ${Number(event.amount) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatNaira(event.amount)}</div>}
                              <div className="text-[10px] text-muted-foreground">{formatDate(event.at)} · {event.kind}</div>
                            </div>
                          </div>
                        ))}
                        {!activity.events?.length && <div className="px-4 py-8 text-center text-sm text-muted-foreground">No activity recorded for this user.</div>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {users !== null && filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No users match your search.</div>}
      </div>
    </div>
  );
}