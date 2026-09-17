import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCOUNT_KINDS } from '@/components/marketplace/platforms';

const inputCls = 'h-10 bg-mk-card2 border-mk-border text-white placeholder:text-slate-500 focus-visible:ring-mk-blue';
const ANY = '__any__';

// Client-side catalogue filters: search, platform, account kind,
// monetisation, follower range, price range and sort order.
export default function ListingFilters({ value, onChange, platforms }) {
  const [open, setOpen] = useState(false);
  const set = (key, v) => onChange({ ...value, [key]: v });

  const activeCount = [
    value.platform, value.accountKind, value.monetised,
    value.minFollowers, value.maxFollowers, value.minPrice, value.maxPrice
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            className={inputCls + ' pl-9'}
            placeholder="Search by listing ID, platform, niche, seller or title…"
            value={value.search}
            onChange={(e) => set('search', e.target.value)}
          />
        </div>
        <Select value={value.sort || 'newest'} onValueChange={(v) => set('sort', v === 'newest' ? '' : v)}>
          <SelectTrigger className={'w-[150px] shrink-0 ' + inputCls}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-mk-card border-mk-border">
            <SelectItem value="newest" className="text-white focus:bg-mk-blue focus:text-white">Newest</SelectItem>
            <SelectItem value="price_asc" className="text-white focus:bg-mk-blue focus:text-white">Price: low to high</SelectItem>
            <SelectItem value="price_desc" className="text-white focus:bg-mk-blue focus:text-white">Price: high to low</SelectItem>
            <SelectItem value="followers_desc" className="text-white focus:bg-mk-blue focus:text-white">Followers: high to low</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-10 border-mk-border text-slate-200 hover:bg-mk-card2 shrink-0 relative" onClick={() => setOpen(o => !o)}>
          <SlidersHorizontal className="w-4 h-4" />
          {activeCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-mk-blue text-white text-[9px] font-bold flex items-center justify-center">{activeCount}</span>}
        </Button>
      </div>

      {open && (
        <div className="rounded-2xl bg-mk-card border border-mk-border p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Platform</Label>
            <Select value={value.platform || ANY} onValueChange={(v) => set('platform', v === ANY ? '' : v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-mk-card border-mk-border">
                <SelectItem value={ANY} className="text-white focus:bg-mk-blue focus:text-white">All</SelectItem>
                {platforms.map(p => <SelectItem key={p} value={p} className="text-white focus:bg-mk-blue focus:text-white">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Type</Label>
            <Select value={value.accountKind || ANY} onValueChange={(v) => set('accountKind', v === ANY ? '' : v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-mk-card border-mk-border">
                <SelectItem value={ANY} className="text-white focus:bg-mk-blue focus:text-white">All</SelectItem>
                {ACCOUNT_KINDS.map(k => <SelectItem key={k} value={k} className="text-white focus:bg-mk-blue focus:text-white">{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Monetisation</Label>
            <Select value={value.monetised || ANY} onValueChange={(v) => set('monetised', v === ANY ? '' : v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-mk-card border-mk-border">
                <SelectItem value={ANY} className="text-white focus:bg-mk-blue focus:text-white">All</SelectItem>
                <SelectItem value="yes" className="text-white focus:bg-mk-blue focus:text-white">Monetised</SelectItem>
                <SelectItem value="no" className="text-white focus:bg-mk-blue focus:text-white">Unmonetised</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Followers min–max</Label>
            <div className="flex gap-1.5">
              <Input className={inputCls} inputMode="numeric" placeholder="min" value={value.minFollowers} onChange={(e) => set('minFollowers', e.target.value.replace(/\D/g, ''))} />
              <Input className={inputCls} inputMode="numeric" placeholder="max" value={value.maxFollowers} onChange={(e) => set('maxFollowers', e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Price min–max (₦)</Label>
            <div className="flex gap-1.5">
              <Input className={inputCls} inputMode="numeric" placeholder="min" value={value.minPrice} onChange={(e) => set('minPrice', e.target.value.replace(/\D/g, ''))} />
              <Input className={inputCls} inputMode="numeric" placeholder="max" value={value.maxPrice} onChange={(e) => set('maxPrice', e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full h-10 border-mk-border text-slate-300 hover:bg-mk-card2" onClick={() => onChange({ search: '' })}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}