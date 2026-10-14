import type { Metadata } from "next";
import { ClipboardList, HeartHandshake, ShieldCheck } from "lucide-react";
import PublicSiteLayout, { PublicPageHeading } from "@/components/public/PublicSiteLayout";

export const metadata: Metadata = { title: "Nosotros · Econolab", description: "Conoce el enfoque de atención y la organización del laboratorio Econolab." };

export default function NosotrosPage() {
  return <PublicSiteLayout current="/nosotros">
    <PublicPageHeading eyebrow="Quiénes somos" title="El laboratorio detrás de cada estudio." description="Econolab es un laboratorio de análisis clínicos en Huejutla de Reyes, Hidalgo. Este espacio te ayuda a conocer nuestros servicios y encontrar al equipo que puede orientarte antes y después de tu visita." />
    <section className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-10 md:grid-cols-2">
      <div><h2 className="text-2xl font-semibold">Nuestra razón de ser</h2><p className="mt-4 leading-7 text-slate-600">Facilitar el acceso a información clara sobre los estudios de laboratorio y acompañar la atención con una organización cuidadosa de cada servicio.</p></div>
      <div><h2 className="text-2xl font-semibold">Cómo trabajamos</h2><p className="mt-4 leading-7 text-slate-600">El proceso conecta recepción, registro de estudios, captura de resultados y seguimiento de entrega. Cada orden tiene un folio que permite al personal localizarla y dar continuidad a la atención.</p></div>
    </section>
    <section className="mt-8 grid gap-5 md:grid-cols-3" aria-label="Nuestro enfoque">
      {[
        { icon: HeartHandshake, title: "Atención cercana", text: "Recepción puede orientarte sobre la disponibilidad de un estudio y los pasos para tu visita." },
        { icon: ClipboardList, title: "Organización", text: "La identificación de cada servicio ayuda a mantener el seguimiento desde el registro hasta la entrega." },
        { icon: ShieldCheck, title: "Cuidado de la información", text: "El acceso a expedientes y resultados dentro del sistema requiere una sesión autorizada del personal." },
      ].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-slate-200 bg-white p-7"><Icon size={28} className="text-red-600" aria-hidden="true" /><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}
    </section>
  </PublicSiteLayout>;
}
