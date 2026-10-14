import type { Metadata } from "next";
import { MapPin, Phone } from "lucide-react";
import PublicSiteLayout, { PublicPageHeading } from "@/components/public/PublicSiteLayout";

export const metadata: Metadata = { title: "Contacto · Econolab", description: "Ubicaciones y teléfonos del laboratorio Econolab en Huejutla de Reyes, Hidalgo." };

export default function ContactoPage() {
  return <PublicSiteLayout current="/contacto">
    <PublicPageHeading eyebrow="Estamos cerca" title="Ponte en contacto con Econolab." description="Comunícate con recepción para confirmar la disponibilidad de tu estudio, sus indicaciones, horarios y tiempos de entrega." />
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
        <Phone size={30} className="text-red-600" aria-hidden="true" /><h2 className="mt-5 text-2xl font-semibold">Llámanos</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Selecciona un número para llamar desde tu teléfono.</p>
        <a href="tel:+527711993821" className="mt-6 block text-2xl font-semibold text-red-700 hover:underline">771 199 3821</a>
        <a href="tel:+527711581482" className="mt-3 block text-xl font-semibold text-red-700 hover:underline">771 158 1482</a>
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm leading-6 text-slate-700">Si consultas por un servicio ya registrado, ten a la mano el folio que aparece en tu recibo.</p>
      </div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-9">
        <MapPin size={30} className="text-red-600" aria-hidden="true" /><h2 className="mt-5 text-2xl font-semibold">Visítanos</h2>
        <p className="mt-3 text-sm text-slate-600">Huejutla de Reyes, Hidalgo</p>
        <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-semibold">Matriz</h3><p className="mt-2 text-sm leading-6 text-slate-600">Boulevard Adolfo López Mateos, colonia Aviación Civil.</p></div>
        <div className="mt-5 border-t border-slate-100 pt-5"><h3 className="font-semibold">Toma de muestras</h3><p className="mt-2 text-sm leading-6 text-slate-600">Calle Constituyentes, colonia Cantores.</p></div>
        <p className="mt-6 text-sm leading-6 text-slate-500">Confirma por teléfono el horario y la ubicación correspondiente a tu estudio antes de trasladarte.</p>
      </div>
    </section>
  </PublicSiteLayout>;
}
