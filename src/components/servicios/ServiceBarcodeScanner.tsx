"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Loader2, Search, X } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import AppModal from "@/components/ui/AppModal";
import { getServices } from "@/features/services/api/services";
import { buildServiceDetailHref } from "@/lib/routes/detail-routes";
import { resolveReceiptService } from "@/lib/services/service-barcode";

function cameraErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "No se autorizó la cámara. Permite su uso en los ajustes del navegador o escribe el folio.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No se encontró una cámara disponible. Puedes buscar escribiendo el folio.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "No se pudo abrir la cámara. Cierra otras aplicaciones que la estén usando e intenta de nuevo.";
  }
  return "No se pudo iniciar el lector. Revisa la conexión, vuelve a intentarlo o escribe el folio.";
}

export default function ServiceBarcodeScanner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [folio, setFolio] = useState("");
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "scanning">("idle");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Activa la cámara cuando tengas el recibo a la mano.");
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRunRef = useRef(0);
  const searchRunRef = useRef(0);
  const searchingRef = useRef(false);
  const mountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    cameraRunRef.current += 1;
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const closeScanner = useCallback(() => {
    searchRunRef.current += 1;
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      stopCamera();
      setCameraState("idle");
      setStatus("Cámara detenida al salir de la pantalla. Actívala para continuar.");
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeScanner();
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("keydown", handleKey);
    return () => {
      mountedRef.current = false;
      searchRunRef.current += 1;
      stopCamera();
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeScanner, stopCamera]);

  const findService = async (value: string) => {
    if (searchingRef.current) return;
    stopCamera();
    setCameraState("idle");
    setError("");
    if (!navigator.onLine) {
      setError("Conéctate a internet para localizar el servicio de este recibo.");
      setStatus("El folio está listo para consultar al recuperar la conexión.");
      return;
    }
    const run = ++searchRunRef.current;
    searchingRef.current = true;
    setSearching(true);
    setStatus("Buscando una coincidencia exacta del folio…");
    const isCancelled = () => !mountedRef.current || searchRunRef.current !== run;
    try {
      const result = await resolveReceiptService(value, getServices, isCancelled);
      if (isCancelled()) return;
      if (!result.ok) {
        setError(result.error);
        setStatus("Puedes corregir el folio o volver a escanear.");
        return;
      }
      router.push(buildServiceDetailHref(result.serviceId, { hash: "resumen-operativo" }));
      closeScanner();
    } catch {
      if (!isCancelled()) {
        setError("No se pudo consultar el servicio. Revisa la conexión e intenta de nuevo.");
        setStatus("El folio leído se conserva en el campo de búsqueda.");
      }
    } finally {
      searchingRef.current = false;
      if (!isCancelled()) setSearching(false);
    }
  };

  const startCamera = async () => {
    if (cameraState !== "idle" || searchingRef.current) return;
    setError("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("La cámara necesita HTTPS (o localhost) y un navegador compatible. Puedes escribir el folio.");
      return;
    }
    stopCamera();
    const run = cameraRunRef.current;
    const isCancelled = () => !mountedRef.current || run !== cameraRunRef.current;
    setCameraState("starting");
    setStatus("Preparando cámara. Acepta el permiso si el navegador lo solicita.");
    try {
      const [
        { BrowserMultiFormatReader },
        { BarcodeFormat, DecodeHintType, ChecksumException, FormatException, NotFoundException },
      ] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      if (isCancelled()) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      // Permission may resolve after the user closes or hides the scanner.
      if (isCancelled() || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      stream.getVideoTracks().forEach((track) => track.addEventListener("ended", () => {
        if (isCancelled()) return;
        stopCamera();
        setCameraState("idle");
        setError("Se interrumpió el acceso a la cámara. Actívala de nuevo o escribe el folio.");
      }, { once: true }));
      const reader = new BrowserMultiFormatReader(
        new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]]]),
        { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 1000 },
      );
      let decoded = false;
      const controls = await reader.decodeFromStream(stream, videoRef.current, (result, decodeError, currentControls) => {
        if (isCancelled() || decoded) {
          currentControls.stop();
          return;
        }
        if (!result) {
          // No barcode in a frame, incomplete codes, and checksum failures are
          // normal while aiming. Unexpected decoder errors need a retry.
          if (decodeError && !(decodeError instanceof NotFoundException) && !(decodeError instanceof ChecksumException) && !(decodeError instanceof FormatException)) {
            currentControls.stop();
            stopCamera();
            setCameraState("idle");
            setError("Se detuvo la lectura de la cámara. Intenta de nuevo o escribe el folio.");
          }
          return;
        }
        decoded = true;
        const value = result.getText();
        currentControls.stop();
        setFolio(value);
        void findService(value);
      });
      if (isCancelled() || decoded) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setCameraState("scanning");
      setStatus("Acerca el código de barras del recibo. Mantén el teléfono quieto y con buena luz.");
    } catch (cameraError) {
      if (isCancelled()) return;
      stopCamera();
      setCameraState("idle");
      setError(cameraErrorMessage(cameraError));
      setStatus("Puedes intentar de nuevo o escribir el folio.");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void findService(folio);
  };

  return (
    <AppModal zIndex={90}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="receipt-scanner-title" aria-describedby="receipt-scanner-description" className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 p-4 sm:p-6">
          <div>
            <h2 id="receipt-scanner-title" className="text-xl font-bold text-gray-900">Escanear recibo</h2>
            <p id="receipt-scanner-description" className="mt-2 text-sm text-gray-600">Usa la cámara para abrir el servicio del recibo y evitar errores al teclear su folio.</p>
          </div>
          <button ref={closeRef} type="button" onClick={closeScanner} aria-label="Cerrar lector de recibos" className="shrink-0 rounded-xl p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-red-600">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-gray-950">
            <video ref={videoRef} autoPlay playsInline muted aria-label="Vista de la cámara para leer el código de barras" className="h-full w-full object-contain" />
            {cameraState === "idle" && <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-white"><CameraOff size={22} /> Cámara apagada</div>}
            {cameraState === "scanning" && <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] inset-y-[25%] rounded-lg border-2 border-white/80" />}
          </div>
          <p role="status" aria-live="polite" className="text-sm text-gray-600">{status}</p>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {cameraState === "idle" ? (
            <button type="button" onClick={() => void startCamera()} disabled={searching} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              <Camera size={18} /> Activar cámara
            </button>
          ) : (
            <button type="button" onClick={() => { stopCamera(); setCameraState("idle"); setStatus("Cámara detenida. Puedes activarla de nuevo o escribir el folio."); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {cameraState === "starting" ? <Loader2 size={18} className="animate-spin" /> : <CameraOff size={18} />} Detener cámara
            </button>
          )}
          <p className="text-xs leading-relaxed text-gray-500">Escanea el código de barras del recibo de Econolab. Las etiquetas de muestras no son compatibles. Las imágenes se procesan en este dispositivo y no se guardan ni se envían. La consulta del servicio requiere conexión y sesión iniciada.</p>
          <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-200 pt-4">
            <label htmlFor="receipt-folio" className="block text-sm font-semibold text-gray-900">También puedes escribir el folio</label>
            <input id="receipt-folio" value={folio} onChange={(event) => setFolio(event.target.value)} disabled={searching} maxLength={50} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Folio completo del recibo" className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50" />
            <button type="submit" disabled={searching || !folio.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} {searching ? "Buscando servicio…" : "Abrir servicio"}
            </button>
          </form>
        </div>
      </div>
    </AppModal>
  );
}
