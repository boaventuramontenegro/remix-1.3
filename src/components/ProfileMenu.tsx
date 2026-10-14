import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Settings, LogOut, HelpCircle, Lock, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { BottomSheet } from './BottomSheet';
import { profileQuery, accountQuery } from '@/lib/preferences';
import { readPin } from '@/lib/device-security';
import { useInstallPrompt } from '@/lib/pwa';
import { isIOS, isStandalone } from '@/lib/push-client';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const item = 'w-full justify-start rounded-xl';

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [installSheet, setInstallSheet] = useState(false);
  const [instalado, setInstalado] = useState(true);
  const [ios, setIos] = useState(false);
  const { data: profile } = useQuery(profileQuery);
  const { data: user } = useQuery(accountQuery);
  const { canInstall, install, isInstalled } = useInstallPrompt();
  const qc = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => { setInstalado(isStandalone()); setIos(isIOS()); }, []);
  const nome = profile?.nome?.trim();
  const mostrarInstalar = !instalado && !isInstalled;

  const sair = async () => { await qc.cancelQueries(); qc.clear(); const { error } = await supabase.auth.signOut(); if (error) { toast.error('Não foi possível sair.'); return; } setOpen(false); navigate({ to: '/auth', replace: true }); };
  const bloquear = () => {
    setOpen(false);
    if (!user || !readPin(user.id)) { toast('Defina um PIN para poder bloquear o app', { id: 'pin' }); navigate({ to: '/configuracoes', hash: 'seguranca' }); return; }
    window.dispatchEvent(new Event('meubolso-bloquear'));
  };
  const instalar = async () => {
    try {
      const result = await install();
      if (result === 'accepted') { setInstallSheet(false); toast('Instalação aceita. Aguarde a conclusão pelo navegador.'); }
      else if (result === 'installed') { setInstallSheet(false); setInstalado(true); }
      else if (result === 'cancelled') { setInstallSheet(false); toast('Instalação cancelada.'); }
      else toast('A instalação direta não está disponível neste navegador agora.');
    } catch { toast.error('Não foi possível iniciar a instalação. Tente novamente.'); }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button aria-label="Abrir perfil" size="icon" className="h-10 w-10 rounded-full bg-brand-green text-brand-white">
            {nome ? <span className="text-lg">{nome.charAt(0).toUpperCase()}</span> : <User />}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={12} className="w-64 origin-top-right rounded-2xl bg-popover p-2 shadow-soft duration-150">
          <span className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t bg-popover" />
          <div className="relative border-b px-3 py-3">
            {nome ? <><p className="truncate font-semibold">{nome}</p><p className="truncate text-xs text-muted-foreground">{user?.email}</p></> : <p className="truncate font-semibold">{user?.email}</p>}
          </div>
          <Button variant="ghost" asChild className={`mt-1 ${item}`}><Link to="/perfil" onClick={() => setOpen(false)}><User />Meu perfil</Link></Button>
          <Button variant="ghost" asChild className={item}><Link to="/configuracoes" onClick={() => setOpen(false)}><Settings />Configurações</Link></Button>
          <Button variant="ghost" asChild className={item}><Link to="/ajuda" onClick={() => setOpen(false)}><HelpCircle />Ajuda e sugestão</Link></Button>
          <Button variant="ghost" onClick={bloquear} className={item}><Lock />Bloquear app</Button>
          {mostrarInstalar && <Button variant="ghost" onClick={() => { setOpen(false); setInstallSheet(true); }} className={item}><Download />Instalar app</Button>}
          <div className="my-1 border-t" />
          <Button variant="ghost" onClick={sair} className={`${item} text-destructive/80 hover:text-destructive`}><LogOut />Sair</Button>
        </PopoverContent>
      </Popover>
      <BottomSheet open={installSheet} onOpenChange={setInstallSheet} title="Instalar Meu Bolso" description={canInstall ? 'Deseja instalar o Meu Bolso neste aparelho?' : 'A instalação direta não está disponível neste navegador agora.'}>
        {!canInstall && <p className="mb-4 text-sm text-muted-foreground">{ios ? 'No Safari, use Compartilhar e Adicionar à Tela de Início.' : 'Abra o site publicado no Chrome. Se a instalação direta continuar indisponível, use a opção Instalar app do navegador, quando oferecida; um atalho comum não equivale à instalação.'}</p>}
        <div className="flex gap-2"><Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setInstallSheet(false)}>Cancelar</Button><Button className="h-12 flex-1 rounded-xl" disabled={!canInstall} onClick={instalar}>Instalar</Button></div>
      </BottomSheet>
    </>
  );
}
