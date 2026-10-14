import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { verifySession } from '@/auth/dal';

const receptionistShortcuts = [
  { href: '/servicios', title: 'Servicios', description: 'Registra servicios, da seguimiento y captura resultados.' },
  { href: '/pacientes', title: 'Pacientes', description: 'Consulta expedientes y registra nuevos pacientes.' },
  { href: '/medicos', title: 'Medicos', description: 'Busca medicos tratantes y actualiza sus datos.' },
  { href: '/estudios', title: 'Estudios', description: 'Revisa el catalogo disponible para nuevos servicios.' },
  { href: '/perfil', title: 'Mi perfil', description: 'Consulta tu informacion y cambia tu contrasena si hace falta.' },
];

const adminShortcuts = [
  { href: '/servicios', title: 'Servicios', description: 'Operacion diaria, seguimiento y detalle de entrega.', icon: ClipboardList },
  { href: '/pacientes', title: 'Pacientes', description: 'Expedientes, altas nuevas y busqueda rapida.', icon: Users },
  { href: '/medicos', title: 'Medicos', description: 'Directorio, especialidades y disponibilidad operativa.', icon: Stethoscope },
  { href: '/estudios', title: 'Estudios', description: 'Catalogo, precios y paquetes del laboratorio.', icon: FlaskConical },
];

function KPI({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="app-panel-surface rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-2 text-xs text-gray-500">{hint}</p>
        </div>
        <div className="rounded-2xl bg-gray-100 p-3 text-gray-700">{icon}</div>
      </div>
    </div>
  );
}

function ReceptionistHome() {
  return (
    <div className="space-y-8">
      <section className="app-panel-surface overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-red-600" />
              Inicio
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Panel operativo listo para tu jornada
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Desde aqui puedes entrar directo a servicios, pacientes, medicos y estudios. El historial y las secciones de administracion quedan reservados para el rol administrador.
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-lg shadow-slate-900/20">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-200">Acceso de recepcion</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Operacion completa</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Puedes trabajar servicios, pacientes, medicos, estudios y resultados sin problema.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Secciones restringidas</p>
                    <p className="mt-1 text-sm text-slate-300">
                      Historial administrativo, administracion BD y prediccion siguen protegidos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {receptionistShortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="app-panel-surface group rounded-[1.75rem] border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg hover:shadow-red-100/60"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Acceso rapido</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">{shortcut.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{shortcut.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-600">
              Abrir modulo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

export default async function Dashboard() {
  const { user } = await verifySession('/');

  if (user.rol !== 'admin') {
    return <ReceptionistHome />;
  }

  return (
    <div className="space-y-8">
      <section className="app-panel-surface overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-red-600" />
              Inicio
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Tablero principal del laboratorio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Bienvenido, {user.nombre}. Esta vista ya replica el lenguaje del sistema avanzado: hero principal, panel de control lateral y tarjetas ejecutivas mas limpias.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rango activo</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Hoy</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Periodo</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Operacion diaria</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Corte de hoy</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Pendiente</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-lg shadow-slate-900/20">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-200">Filtros del panel</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['Hoy', '7 dias', '30 dias', '90 dias'].map((label, index) => (
                <span
                  key={label}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? 'bg-white text-slate-900'
                      : 'border border-white/15 bg-white/5 text-slate-200'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-red-100">Lectura ejecutiva</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                Prioriza servicios activos, seguimiento de entregas, catalogos y control administrativo desde una sola vista.
              </p>
            </div>

            <Link href="/historial" className="mt-5 inline-flex items-center gap-2 font-semibold text-emerald-200 transition-colors hover:text-white">
              Ir a historial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPI label="Total de servicios" value={128} hint="Base visible del flujo operativo" icon={<Activity className="h-5 w-5" />} />
        <KPI label="Ingreso estimado" value="$12,480" hint="Referencia visual del panel principal" icon={<Wallet className="h-5 w-5" />} />
        <KPI label="Medicos activos" value={24} hint="Cobertura actual del laboratorio" icon={<UserCheck className="h-5 w-5" />} />
        <KPI label="Pacientes" value={312} hint="Padron operativo disponible" icon={<Users className="h-5 w-5" />} />
        <KPI label="Estudios activos" value={86} hint="Catalogo listo para nuevas ordenes" icon={<BarChart3 className="h-5 w-5" />} />
        <KPI label="Cierres del dia" value={17} hint="Resumen rapido para administracion" icon={<ShieldAlert className="h-5 w-5" />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="app-panel-surface rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Operacion</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Pulso operativo</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Pendientes</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">11</p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">En curso</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">9</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">Retrasados</p>
                <p className="mt-2 text-3xl font-bold text-rose-900">3</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Concluidos</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">17</p>
              </div>
            </div>
          </div>

          <div className="app-panel-surface rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Accesos principales</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Modulos del sistema</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {adminShortcuts.map((shortcut) => {
                const Icon = shortcut.icon;

                return (
                  <Link
                    key={shortcut.href}
                    href={shortcut.href}
                    className="app-panel-surface group rounded-[1.75rem] border border-gray-200 bg-gray-50 p-5 shadow-sm transition-all hover:border-red-200 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl bg-white p-3 text-red-600 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-red-500 transition-transform group-hover:translate-x-1" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">{shortcut.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{shortcut.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="app-panel-surface rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Negocio</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Demanda y foco</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Mas solicitado</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-800">Biometria hematica</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-orange-200 bg-orange-50 p-5">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-orange-700" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Sucursal mas fuerte</p>
                    <p className="mt-1 text-lg font-semibold text-orange-800">Matriz Centro</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-slate-900 to-red-900 p-5 text-white">
              <p className="text-sm text-red-100">Lectura rapida</p>
              <p className="mt-2 text-2xl font-semibold">Pulso del laboratorio</p>
              <p className="mt-2 text-sm text-red-100">
                Esta version se centra en que el panel se vea tan solido como el del otro sistema, aunque algunas metricas todavia sean de referencia visual.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
