import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Searchable service picker: popular quick picks + the live provider list.
export default function ServiceList({ options, value, onChange, popular = [], placeholder, loading }) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const filtered = options.filter(id => !q || id.includes(q)).slice(0, 60);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value.slice(0, 40))}
          placeholder={placeholder}
          className="bg-mk-card2 border-mk-border text-slate-100 h-11 pl-9 text-sm placeholder:text-slate-500"
        />
      </div>
      {popular.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {popular.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={'shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold capitalize ' + (value === id ? 'border-mk-blue bg-mk-blue text-white' : 'border-mk-border bg-mk-card2 text-slate-300')}
            >
              {id === 'openai' ? 'OpenAI' : id}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-48 overflow-y-auto scrollbar-thin rounded-xl border border-mk-border bg-mk-card2 divide-y divide-mk-border">
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mk-blue" /></div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-500">No services match your search.</div>
        ) : filtered.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={'w-full flex items-center justify-between px-3.5 py-2.5 text-left ' + (value === id ? 'bg-mk-blue/15' : '')}
          >
            <span className="text-sm font-semibold text-slate-200 capitalize">{id}</span>
            {value === id && <span className="text-[10px] font-bold text-mk-blue-soft">SELECTED</span>}
          </button>
        ))}
      </div>
    </div>
  );
}