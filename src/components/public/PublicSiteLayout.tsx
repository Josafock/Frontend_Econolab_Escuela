import Image from "next/image";
import { FlaskConical, MapPin, Phone } from "lucide-react";
import PwaControls from "@/components/pwa/PwaControls";

export const publicPages = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/servicios-laboratorio", label: "Servicios" },
  { href: "/contacto", label: "Contacto" },
];

// Enlaces de documento completo: las páginas públicas pueden navegarse sin RSC ni red.
/* eslint-disable @next/next/no-html-link-for-pages */
export default function PublicSiteLayout({ children, current }: { children: React.ReactNode; current: string }) {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-slate-900">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-xl focus:bg-white focus:p-4">Saltar al contenido</a>
      <div className="border-b border-red-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-2 text-xs text-slate-500">
          <span>Laboratorio de análisis clínicos · Huejutla de Reyes, Hidalgo</span>
          <a href="tel:+527711993821" className="inline-flex items-center gap-1.5 font-medium text-slate-700"><Phone size={12} aria-hidden="true" />771 199 3821</a>
        </div>
      </div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-5 gap-y-4 px-5 py-5 sm:px-6 lg:grid-cols-[auto_1fr_auto]">
          <a href="/" aria-label="Econolab, inicio" className="order-1"><Image src="/econolab-brand.png" alt="Econolab" width={220} height={70} unoptimized priority className="h-auto w-28 sm:w-44" /></a>
          <nav aria-label="Navegación pública" className="order-3 col-span-2 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-100 pt-4 text-sm lg:order-2 lg:col-span-1 lg:justify-center lg:border-0 lg:pt-0">
            {publicPages.map((page) => <a key={page.href} href={page.href} aria-current={current === page.href ? "page" : undefined} className={`border-b-2 pb-1 transition-colors ${current === page.href ? "border-red-600 font-semibold text-red-700" : "border-transparent text-slate-600 hover:text-red-700"}`}>{page.label}</a>)}
          </nav>
          <div className="order-2 flex flex-col gap-2 sm:flex-row lg:order-3">
            <a href="/auth/login" className="rounded-full border border-slate-300 px-3 py-2.5 text-center text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700 sm:px-4 sm:text-sm">Iniciar sesión</a>
            <a href="/auth/register" className="rounded-full bg-red-600 px-3 py-2.5 text-center text-xs font-semibold text-white hover:bg-red-700 sm:px-4 sm:text-sm">Registrarse</a>
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold"><FlaskConical size={20} className="text-red-600" aria-hidden="true" />Econolab</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">Información del laboratorio, nuestros servicios y cómo ponerte en contacto con el equipo.</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><MapPin size={15} aria-hidden="true" />Huejutla de Reyes, Hidalgo</p>
            <a href="/contacto" className="mt-3 inline-block text-sm font-semibold text-red-700 hover:underline">Consultar ubicaciones y teléfonos</a>
          </div>
          <PwaControls />
        </div>
        <div className="border-t border-slate-100 px-5 py-4 text-center text-xs text-slate-500">Econolab · Laboratorio de análisis clínicos</div>
      </footer>
    </div>
  );
}

export function PublicPageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-10 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">{eyebrow}</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1><p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{description}</p></div>;
}
