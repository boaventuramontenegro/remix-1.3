import { useEffect, useState } from "react";

const SW_URL = "/sw.js";
const workerFailure = (name: string) => Object.assign(new Error(name), { name });

export function isRefusedContext() {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.filter((r) => r.active?.scriptURL.endsWith(SW_URL) || r.installing?.scriptURL.endsWith(SW_URL) || r.waiting?.scriptURL.endsWith(SW_URL)).map((r) => r.unregister()),
  );
}

let registrationTask: Promise<ServiceWorkerRegistration> | undefined;
/** Single guarded registration point; callers await activation, not just registration. */
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) throw Error('Este navegador não suporta o serviço de notificações.');
  if (isRefusedContext()) {
    await unregisterAppSW();
    throw Error('A prévia não recebe notificações. Use o aplicativo publicado.');
  }
  if (!registrationTask) {
    registrationTask = new Promise<ServiceWorkerRegistration>((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('O serviço de notificações não conseguiu ficar ativo. Tente novamente; confira sua conexão.')), 15000);
      const fail = (error: unknown) => {
        clearTimeout(timeout);
        const name = error instanceof Error ? error.name : '';
        reject(Error(`Falha ao registrar o serviço de notificações${name ? ` (${name})` : ''}. Tente novamente.`));
      };
      void import('virtual:pwa-register').then(({ registerSW }) => {
        registerSW({ immediate: true, onRegisterError: fail, onRegisteredSW: (_url, reg) => {
          if (!reg) { fail(workerFailure('RegistrationMissing')); return; }
          const active = () => {
            if (reg.active?.state !== 'activated') return;
            if (new URL(reg.scope).origin !== location.origin || new URL(reg.scope).pathname !== '/' || new URL(reg.active.scriptURL).pathname !== SW_URL) { fail(workerFailure('ScopeMismatch')); return; }
            clearTimeout(timeout); resolve(reg);
          };
          active();
          const worker = reg.installing ?? reg.waiting;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'redundant') fail(workerFailure('WorkerInstallFailed'));
            else active();
          });
          reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', active));
        } });
      }).catch(fail);
    }).catch(error => { registrationTask = undefined; throw error; });
  }
  return registrationTask;
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Captured once by the root, before the profile menu mounts or a route changes.
let installEvent: BIPEvent | null = null;
let installed = false;
const installListeners = new Set<() => void>();
let listening = false;
export function captureInstallPrompt() {
  if (listening) return;
  listening = true;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e as BIPEvent; installListeners.forEach(fn => fn()); });
  window.addEventListener('appinstalled', () => { installed = true; installEvent = null; installListeners.forEach(fn => fn()); });
}

export function useInstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [isInstalled, setInstalled] = useState(false);
  useEffect(() => {
    captureInstallPrompt();
    const sync = () => { setEvt(installEvent); setInstalled(installed || window.matchMedia('(display-mode: standalone)').matches); };
    sync(); installListeners.add(sync);
    return () => { installListeners.delete(sync); };
  }, []);
  const install = async () => {
    if (isInstalled) return 'installed' as const;
    const current = installEvent;
    if (!current) return 'unavailable' as const;
    await current.prompt();
    const { outcome } = await current.userChoice;
    installEvent = null; installListeners.forEach(fn => fn());
    return outcome === 'accepted' ? 'accepted' as const : 'cancelled' as const;
  };
  return { canInstall: !!evt, install, isInstalled };
}
