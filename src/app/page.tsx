import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck, FlaskConical, HeartPulse, Microscope } from "lucide-react";
import PublicSiteLayout from "@/components/public/PublicSiteLayout";

export const metadata: Metadata = { title: "Econolab · Laboratorio de análisis clínicos", description: "Conoce Econolab, sus servicios de laboratorio y sus ubicaciones en Huejutla de Reyes, Hidalgo." };

export default function Home() {
  return (
    <PublicSiteLayout current="/">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">Tu salud comienza con información</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">Cerca de ti.<br /><span className="text-red-600">En cada estudio.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">En Econolab puedes conocer nuestros servicios de análisis clínicos y comunicarte con el laboratorio para preparar tu visita.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/servicios-laboratorio" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700">Conoce nuestros servicios<ArrowRight size={18} aria-hidden="true" /></a>
            <a href="/contacto" className="rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold hover:border-red-300">Contactar al laboratorio</a>
          </div>
          <p className="mt-7 text-sm text-slate-500">Huejutla de Reyes, Hidalgo · Información disponible también sin conexión.</p>
        </div>
        <div className="relative overflow-hidden rounded-[2.5rem] border border-red-100 bg-gradient-to-br from-white via-red-50 to-red-100 p-8 sm:p-10">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border-[24px] border-white/60" aria-hidden="true" />
          <div className="relative">
            <div className="mb-10 inline-flex rounded-2xl bg-white p-5 text-red-600 shadow-sm"><FlaskConical size={56} strokeWidth={1.4} aria-hidden="true" /></div>
            <p className="text-sm font-semibold text-red-700">Laboratorio de análisis clínicos</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Un proceso claro,<br />de principio a fin.</h2>
            <div className="mt-7 space-y-3">
              {["Consulta la información del laboratorio", "Confirma tu estudio y preparación", "Da seguimiento con nuestro equipo"].map((text, i) => <div key={text} className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 font-semibold text-red-700">{i + 1}</span>{text}</div>)}
            </div>
          </div>
        </div>
      </section>
      <section className="mt-16 grid gap-5 md:grid-cols-3" aria-label="Conoce el laboratorio">
        {[
          { icon: HeartPulse, title: "Conoce Econolab", text: "Descubre cómo organizamos la atención y el trabajo del laboratorio.", href: "/nosotros" },
          { icon: Microscope, title: "Servicios de laboratorio", text: "Información sobre estudios, paquetes y seguimiento de resultados.", href: "/servicios-laboratorio" },
          { icon: ClipboardCheck, title: "Planea tu visita", text: "Encuentra nuestras ubicaciones y consulta la preparación con recepción.", href: "/contacto" },
        ].map(({ icon: Icon, title, text, href }) => <a href={href} key={title} className="group rounded-3xl border border-slate-200 bg-white p-7 transition-colors hover:border-red-300"><Icon size={25} className="text-red-600" aria-hidden="true" /><h2 className="mt-5 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-red-700">Conocer más<ArrowRight size={15} aria-hidden="true" /></span></a>)}
      </section>
    </PublicSiteLayout>
  );
}
