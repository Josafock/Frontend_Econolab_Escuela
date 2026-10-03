"use client";

import { Download, RefreshCw, Smartphone } from "lucide-react";
import { usePwa } from "./PwaProvider";

export default function PwaControls({ children }: { children?: React.ReactNode }) {
  const pwa = usePwa();
  const stateText = {
    checking: "Preparando la guía sin conexión…",
    ready: "Guía sin conexión disponible en este dispositivo.",
    disabled: "La instalación y el modo offline se habilitan en la versión de producción.",
    insecure: "Abre Econolab mediante HTTPS para instalarla y habilitar las funciones del teléfono.",
    unsupported: "Este navegador no admite el modo offline. Usa un navegador compatible actualizado.",
    error: "No se pudo preparar el modo offline. Verifica tu conexión y recarga la página.",
  }[pwa.workerState];

  return (
    <details className="rounded-2xl border border-red-100 bg-white/95 p-4 text-sm text-slate-700 shadow-sm">
      <summary className="cursor-pointer font-semibold text-slate-900">
        <Smartphone className="mr-2 inline h-4 w-4 text-red-600" aria-hidden="true" />
        {pwa.installed ? "Econolab instalada · opciones de la aplicación" : "Instalar Econolab y opciones de la aplicación"}
        {pwa.updateAvailable && <span className="ml-2 text-xs text-red-700">Actualización disponible</span>}
      </summary>
      <div className="mt-4 space-y-4">
        <p role="status">{stateText}</p>
        {pwa.canInstall && !pwa.installed ? (
          <button type="button" onClick={() => void pwa.install()} disabled={pwa.installing} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
            <Download size={16} aria-hidden="true" />{pwa.installing ? "Instalando…" : "Instalar aplicación"}
          </button>
        ) : !pwa.installed && (
          <div className="space-y-2 text-xs leading-5 text-slate-600">
            <p><strong>Computadora o Android:</strong> abre el menú de Chrome o Edge y elige «Instalar aplicación» o «Agregar a pantalla de inicio», si está disponible.</p>
            <p><strong>iPhone o iPad:</strong> abre Econolab en Safari, pulsa Compartir y «Agregar a inicio». Después ábrela desde su icono.</p>
          </div>
        )}
        {pwa.message && <p role="status" className="text-xs">{pwa.message}</p>}
        <p className="text-xs leading-5">La guía de uso, la identidad visual y los recursos estáticos quedan disponibles sin internet después de la primera visita con conexión. Los servicios y resultados se consultan con conexión.</p>
        <a href="/offline.html" className="inline-block font-semibold text-red-700 underline underline-offset-4">Consultar guía sin conexión</a>
        {pwa.updateAvailable && (
          <div className="rounded-xl bg-red-50 p-3">
            <p className="mb-2 text-xs">Hay una nueva versión. Guarda tus cambios antes de actualizar; la página se recargará.</p>
            <button type="button" onClick={pwa.update} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold text-red-700"><RefreshCw size={14} aria-hidden="true" />Actualizar aplicación</button>
          </div>
        )}
        {children}
      </div>
    </details>
  );
}
