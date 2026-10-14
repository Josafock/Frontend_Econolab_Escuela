import type { Metadata } from "next";
import { ClipboardCheck, FlaskConical, Layers3, Phone } from "lucide-react";
import PublicSiteLayout, { PublicPageHeading } from "@/components/public/PublicSiteLayout";

export const metadata: Metadata = { title: "Servicios del laboratorio · Econolab", description: "Información general sobre estudios, paquetes y seguimiento en Econolab." };

export default function ServiciosLaboratorioPage() {
  return <PublicSiteLayout current="/servicios-laboratorio">
    <PublicPageHeading eyebrow="Nuestros servicios" title="Información para preparar tu visita." description="Consulta con recepción el estudio solicitado, su disponibilidad, precio y tiempo de entrega. Las indicaciones de preparación dependen del estudio y se confirman directamente con el laboratorio." />
    <section className="grid gap-5 md:grid-cols-3" aria-label="Servicios del laboratorio">
      {[
        { icon: FlaskConical, title: "Estudios individuales", text: "El laboratorio administra un catálogo de análisis. Comunícate con el equipo para confirmar el estudio que necesitas y sus indicaciones." },
        { icon: Layers3, title: "Paquetes de estudios", text: "Pregunta por los paquetes disponibles y los estudios que incluyen. Recepción puede ayudarte a revisar la solicitud antes de registrarla." },
        { icon: ClipboardCheck, title: "Seguimiento de entrega", text: "Conserva tu recibo y el folio del servicio. Esa referencia ayuda al personal a localizar tu orden y confirmar el estado de entrega." },
      ].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7"><Icon size={30} className="text-red-600" aria-hidden="true" /><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}
    </section>
    <section className="mt-10 grid gap-6 rounded-[2rem] bg-slate-900 p-7 text-white sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
      <div><h2 className="text-2xl font-semibold">Antes de venir</h2><p className="mt-4 max-w-2xl leading-7 text-slate-300">Ten a la mano el nombre del estudio o la solicitud que recibiste. Confirma con recepción la preparación, el tipo de muestra y el horario de atención para tu visita.</p></div>
      <a href="/contacto" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-900"><Phone size={18} aria-hidden="true" />Hablar con recepción</a>
    </section>
  </PublicSiteLayout>;
}
