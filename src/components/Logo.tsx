import { Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Versão sólida (preenchida) do mesmo símbolo de carteira, para fundos verdes. */
export function WalletSolid({ size = 72, className = '' }: { size?: number; className?: string }) {
  return <img src="/wallet-solid.svg" width={size} height={size} className={className} alt="" aria-hidden />;
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
  return <div className="loading-screen fixed inset-0 z-[90] flex items-center justify-center bg-hero"><WalletSolid size={80} className="loading-wallet" /></div>;
}
