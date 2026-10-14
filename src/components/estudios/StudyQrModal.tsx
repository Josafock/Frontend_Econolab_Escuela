"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { Study } from "@/features/studies/api/studies";
import { buildStudyQrValue } from "@/lib/studies/study-qr";
import AppModal from "@/components/ui/AppModal";

export default function StudyQrModal({ study, onClose }: { study: Pick<Study, "id" | "code" | "name">; onClose: () => void }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setImage(""); setError("");
    void import("@zxing/library").then(({ QRCodeWriter, BarcodeFormat, EncodeHintType }) => {
      const matrix = new QRCodeWriter().encode(buildStudyQrValue(study.id), BarcodeFormat.QR_CODE, 360, 360, new Map([[EncodeHintType.MARGIN, 4]]));
      const canvas = document.createElement("canvas");
      canvas.width = matrix.getWidth(); canvas.height = matrix.getHeight();
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo generar la imagen.");
      context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#000";
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (matrix.get(x, y)) context.fillRect(x, y, 1, 1);
      if (!cancelled) setImage(canvas.toDataURL("image/png"));
    }).catch(() => { if (!cancelled) setError("No se pudo generar el QR. Cierra esta ventana e intenta de nuevo."); });
    return () => { cancelled = true; };
  }, [study.id]);

  return <AppModal zIndex={90}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="study-qr-title" className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5"><div><h2 id="study-qr-title" className="text-xl font-semibold">QR del estudio</h2><p className="mt-2 text-sm text-slate-600">{study.name}</p><p className="mt-1 text-xs font-semibold text-red-700">{study.code}</p></div><button ref={closeRef} type="button" aria-label="Cerrar QR del estudio" onClick={onClose} className="rounded-xl p-2 hover:bg-slate-100"><X size={22} /></button></div>
      <div className="overflow-y-auto p-5 text-center">
        {image ? <>
          {/* El PNG se genera localmente y se puede guardar como etiqueta. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`Código QR del estudio ${study.code}`} width={360} height={360} className="mx-auto h-auto w-full max-w-[280px]" />
          <a href={image} download={`econolab-estudio-${study.id}-qr.png`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"><Download size={17} />Descargar QR</a>
        </> : error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : <p role="status" className="flex items-center justify-center gap-2 py-10"><Loader2 className="animate-spin" size={20} />Generando QR…</p>}
        <p className="mt-5 text-sm leading-6 text-slate-600">Escanéalo desde <strong>Estudios → Escanear QR</strong> para abrir este registro. Puedes guardar la imagen para imprimirla o usarla en otro dispositivo.</p>
        <p className="mt-3 break-all text-xs text-slate-400">{buildStudyQrValue(study.id)}</p>
      </div>
    </div>
  </AppModal>;
}
