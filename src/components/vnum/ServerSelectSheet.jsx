import { ArrowLeft, Phone } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

// Generic server-selection bottom sheet. Rows are labelled "Server A / B" —
// the underlying provider names are never shown to customers.
export default function ServerSelectSheet({ open, onOpen, title, rows, onSelect }) {
  return (
    <Drawer open={open} onOpenChange={onOpen}>
      <DrawerContent className="bg-card">
        <DrawerHeader className="pb-2 sm:pb-2">
          <DrawerTitle className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <button
              type="button"
              onClick={() => onOpen(false)}
              className="inline-flex items-center gap-1 text-primary font-bold"
            >
              <ArrowLeft className="w-4 h-4" /> BACK
            </button>
            <span className="truncate">{title}</span>
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-5 space-y-3">
          {rows.map(r => (
            <button
              key={r.id}
              type="button"
              disabled={r.disabled}
              onClick={() => onSelect(r)}
              className={'w-full flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors ' + (r.disabled
                ? 'border-border/60 bg-muted/40 cursor-not-allowed'
                : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5')}
            >
              <span className={'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ' + (r.disabled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                <Phone className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">{r.label}</span>
                <span className="block text-xs text-muted-foreground mt-0.5 truncate">{r.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}