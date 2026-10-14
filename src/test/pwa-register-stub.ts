export const registerSW = (options: { onRegisteredSW?: (url: string, reg: ServiceWorkerRegistration) => void; onRegisterError?: (error: unknown) => void }) => {
  void navigator.serviceWorker.register('/sw.js').then(reg => options.onRegisteredSW?.('/sw.js', reg)).catch(options.onRegisterError);
};