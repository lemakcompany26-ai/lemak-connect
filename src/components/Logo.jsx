import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Logo({ light = false, size = 'md', className }) {
  const textClass = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5 group', className)}>
      <div className={cn(
        'rounded-xl brand-gradient-soft flex items-center justify-center shadow-md shadow-primary/30',
        size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
      )}>
        <svg viewBox="0 0 24 24" className={cn('text-white', size === 'lg' ? 'w-6 h-6' : 'w-5 h-5')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" />
        </svg>
      </div>
      <div className={cn('font-heading font-extrabold tracking-tight', textClass, light ? 'text-white' : 'text-foreground')}>
        <span className="text-primary">Lemak</span>
        <span className={light ? 'text-white' : ''}> Connect</span>
      </div>
    </Link>
  );
}