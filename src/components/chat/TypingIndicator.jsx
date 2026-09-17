// Three-dot "typing…" bubble shared by the order chat and rental chat.
export default function TypingIndicator({ visible, name }) {
  if (!visible) return null;
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-mk-card2 border border-mk-border px-4 py-3">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
        <span className="ml-1 text-[10px] text-slate-500">{name ? `${name} is typing…` : 'Typing…'}</span>
      </div>
    </div>
  );
}