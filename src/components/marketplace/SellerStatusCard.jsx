import StatusBadge from '@/components/admin/marketplace/StatusBadge';
import { formatNaira, formatDate } from '@/lib/format';

const FEEDBACK = {
  pending: 'Your application is awaiting admin review.',
  approved: 'Your listing is live on the marketplace.',
  rejected: 'Your application was not approved. You can apply again via the seller form.',
  changes_requested: 'Changes were requested — resubmit through the seller form to return to review.',
  suspended: 'Your seller account is suspended. Contact support for details.'
};

export default function SellerStatusCard({ application }) {
  return (
    <div className="rounded-2xl bg-mk-card border border-mk-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">{application.serviceTitle || application.accountType}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {application.category || '—'} · {formatNaira(application.price)} · Submitted {formatDate(application.submittedAt || application.created_date)}
          </div>
          {application.listingId && <div className="text-[11px] font-mono text-mk-brown-soft mt-1">{application.listingId}</div>}
        </div>
        <StatusBadge status={application.status} />
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="text-xs text-slate-300">
          <span className="text-slate-500">Review status: </span>
          {application.reviewedBy ? `Reviewed by ${application.reviewedBy}` : 'Pending admin review'}
        </div>
        {application.reviewNotes && <div className="text-xs text-mk-blue-soft">Admin feedback: {application.reviewNotes}</div>}
        <div className="text-xs text-mk-brown-soft">{FEEDBACK[application.status]}</div>
      </div>
    </div>
  );
}