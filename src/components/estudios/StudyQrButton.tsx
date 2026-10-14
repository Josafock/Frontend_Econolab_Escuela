"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { QrCode } from "lucide-react";
import type { Study } from "@/features/studies/api/studies";

const StudyQrModal = dynamic(() => import("./StudyQrModal"));

export default function StudyQrButton({ study }: { study: Pick<Study, "id" | "name" | "code"> }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><QrCode size={18} />Ver QR</button>
    {open && <StudyQrModal study={study} onClose={() => setOpen(false)} />}
  </>;
}
