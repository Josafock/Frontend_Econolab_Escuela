"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type WorkerState = "checking" | "ready" | "disabled" | "insecure" | "unsupported" | "error";
type PwaContextValue = {
  installed: boolean;
  canInstall: boolean;
  installing: boolean;
  online: boolean;
  workerState: WorkerState;
  updateAvailable: boolean;
  install: () => Promise<void>;
  update: () => void;
  message: string;
};

const PwaContext = createContext<PwaContextValue | null>(null);
const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_PWA === "true";

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) throw new Error("usePwa requiere PwaProvider.");
  return context;
}

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [online, setOnline] = useState(true);
  const [workerState, setWorkerState] = useState<WorkerState>("checking");
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [message, setMessage] = useState("");
  const reloadAfterUpdate = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const detectInstalled = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const onConnection = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
      setMessage("Econolab está instalada en este dispositivo.");
    };
    detectInstalled();
    onConnection();
    media.addEventListener("change", detectInstalled);
    window.addEventListener("online", onConnection);
    window.addEventListener("offline", onConnection);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      media.removeEventListener("change", detectInstalled);
      window.removeEventListener("online", onConnection);
      window.removeEventListener("offline", onConnection);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setWorkerState("disabled");
      // Evita conservar el worker de producción al reutilizar el puerto en desarrollo.
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
          for (const registration of registrations) {
            const worker = registration.active ?? registration.waiting ?? registration.installing;
            if (worker && new URL(worker.scriptURL).pathname === "/sw.js" && new URL(worker.scriptURL).origin === window.location.origin) {
              await registration.unregister();
              setMessage("Se desactivó la versión offline anterior para desarrollo. Recarga la página una vez.");
            }
          }
        }).catch(() => {});
      }
      return;
    }
    if (!window.isSecureContext) { setWorkerState("insecure"); return; }
    if (!("serviceWorker" in navigator)) { setWorkerState("unsupported"); return; }

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let registering = false;
    const removeListeners: Array<() => void> = [];
    const watch = (worker: ServiceWorker) => {
      const onStateChange = () => {
        if (disposed) return;
        if (worker.state === "activated") setWorkerState("ready");
        if (worker.state === "installed" && navigator.serviceWorker.controller) setWaitingWorker(worker);
        if (worker.state === "redundant" && !registration?.active) setWorkerState("error");
      };
      worker.addEventListener("statechange", onStateChange);
      removeListeners.push(() => worker.removeEventListener("statechange", onStateChange));
      onStateChange();
    };
    const register = async () => {
      if (registering || disposed) return;
      registering = true;
      try {
        const workerUrl = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
        registration = await navigator.serviceWorker.register(workerUrl, { scope: "/", updateViaCache: "none" });
        if (disposed) return;
        if (registration.active) setWorkerState("ready");
        if (registration.waiting) setWaitingWorker(registration.waiting);
        if (registration.installing) watch(registration.installing);
        const onUpdateFound = () => { if (registration?.installing) watch(registration.installing); };
        registration.addEventListener("updatefound", onUpdateFound);
        const current = registration;
        removeListeners.push(() => current.removeEventListener("updatefound", onUpdateFound));
      } catch {
        if (!disposed) setWorkerState("error");
      } finally {
        registering = false;
      }
    };
    const checkForUpdate = () => {
      if (!navigator.onLine || document.visibilityState === "hidden") return;
      if (registration) void registration.update().catch(() => {});
      else void register();
    };
    const onControllerChange = () => {
      if (reloadAfterUpdate.current) window.location.reload();
      else if (!disposed) setWorkerState("ready");
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
    void register();
    return () => {
      disposed = true;
      removeListeners.forEach((remove) => remove());
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(choice.outcome === "accepted" ? "Instalación solicitada. Puedes abrir Econolab desde tus aplicaciones." : "Puedes instalar Econolab más tarde desde el menú del navegador.");
    } catch {
      setMessage("No se pudo abrir la instalación. Intenta desde el menú del navegador.");
    } finally {
      setPrompt(null);
      setInstalling(false);
    }
  }, [prompt]);

  const update = useCallback(() => {
    if (!waitingWorker) return;
    reloadAfterUpdate.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  return (
    <PwaContext.Provider value={{ installed, canInstall: Boolean(prompt), installing, online, workerState, updateAvailable: Boolean(waitingWorker), install, update, message }}>
      {!online && (
        <div role="status" className="sticky top-0 z-[80] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">
          <span>Sin conexión. Para consultar o guardar datos necesitas volver a conectarte.</span>
          {/* Navegación completa: la guía funciona sin React ni servidor. */}
          <a href="/offline.html" className="font-semibold underline underline-offset-4">Abrir guía sin conexión</a>
        </div>
      )}
      {children}
    </PwaContext.Provider>
  );
}
