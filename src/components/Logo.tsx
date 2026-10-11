import { useId } from 'react';
import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Versão sólida (preenchida) do mesmo símbolo de carteira, para fundos verdes. */
export function WalletSolid({ size = 72, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <defs>
        <mask id={`wm${id}`}>
          <rect width="24" height="24" fill="#fff" />
          <rect x="15" y="11" width="9" height="6" rx="2" fill="#000" />
        </mask>
      </defs>
      <path d="M5 2.5h12.5A1.5 1.5 0 0 1 19 4v2.2H5a1.6 1.6 0 0 1 0-3.2Z" />
      <path mask={`url(#wm${id})`} d="M2.4 5.2A2.6 2.6 0 0 0 5 7.4h15a1.6 1.6 0 0 1 1.6 1.6v10.4a2.2 2.2 0 0 1-2.2 2.2H5A2.6 2.6 0 0 1 2.4 19Z" />
      <rect x="16.4" y="12.2" width="6.2" height="3.6" rx="1.4" />
      <circle cx="18.6" cy="14" r="0.95" fill="var(--wallet-dot, #1F8A5B)" />
    </svg>
  );
}

export function Logo({ variante = 'completa', cor = 'verde', tamanho = 'md', className = '' }: { variante?: 'simbolo' | 'completa' | 'claro' | 'verde'; cor?: 'claro' | 'verde'; tamanho?: 'sm' | 'md' | 'lg'; className?: string }) {
  const light = variante === 'claro' || cor === 'claro';
  const size = { sm: 22, md: 30, lg: 40 }[tamanho];
  return <span className={cn('inline-flex items-center gap-2.5 font-display font-bold', light ? 'text-brand-white' : 'text-primary', tamanho === 'lg' ? 'text-4xl font-extrabold' : tamanho === 'sm' ? 'text-lg' : 'text-2xl', className)}><Wallet size={size} strokeWidth={2.25} aria-hidden />{variante !== 'simbolo' && <span>Meu Bolso</span>}</span>;
}

/** Marca para fundos verdes: símbolo sólido solto + nome, sem contêiner. */
export function MarcaHero({ comNome = true, size = 72, className = '' }: { comNome?: boolean; size?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col items-start gap-4 text-brand-white', className)}>
      <WalletSolid size={size} className="drop-shadow-sm" />
      {comNome && <span className="font-display text-4xl font-extrabold tracking-tight text-brand-white">Meu Bolso</span>}
    </div>
  );
}

export function LoadingScreen() {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-hero"><WalletSolid size={80} className="text-brand-white motion-safe:animate-pulse" /></div>;
}
