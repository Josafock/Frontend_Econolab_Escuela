"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { getServiceReminders } from "@/actions/notifications/serviceReminders";
import { buildServiceDetailHref } from "@/lib/routes/detail-routes";
import {
  activateNotificationSession,
  deactivateNotificationSession,
  isCurrentNotificationSession,
  notificationSupport,
  notificationsEnabled,
  NOTIFICATION_PREFERENCE_EVENT,
  rememberNotificationKeys,
  setNotificationsEnabled,
  showServiceNotification,
  unseenReminderKeys,
  type NotificationSession,
  type NotificationSupport,
} from "@/lib/pwa/notifications";

const CHECK_INTERVAL = 5 * 60 * 1000;
const UPCOMING_WINDOW = 60 * 60 * 1000;
// Route layouts remount the panel; preserve the polling interval across navigation.
const lastReminderChecks = new Map<string, number>();

export default function ServiceNotifications({ userId }: { userId: string }) {
  const sessionRef = useRef<NotificationSession | null>(null);
  const [support, setSupport] = useState<NotificationSupport>("unsupported");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = activateNotificationSession(userId);
    sessionRef.current = session;
    const refresh = () => {
      setSupport(notificationSupport());
      setPermission("Notification" in window ? Notification.permission : "default");
      setEnabled(notificationsEnabled(userId));
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(NOTIFICATION_PREFERENCE_EVENT, refresh);
    return () => {
      deactivateNotificationSession(session);
      if (sessionRef.current === session) sessionRef.current = null;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(NOTIFICATION_PREFERENCE_EVENT, refresh);
    };
  }, [userId]);

  useEffect(() => {
    if (!enabled || permission !== "granted" || support !== "available") return;
    const session = sessionRef.current;
    let disposed = false;
    let checking = false;

    const check = async () => {
      if (disposed || checking || document.visibilityState !== "visible" ||
          !navigator.onLine || !isCurrentNotificationSession(session) ||
          Date.now() - (lastReminderChecks.get(userId) ?? 0) < CHECK_INTERVAL) return;
      checking = true;
      lastReminderChecks.set(userId, Date.now());
      try {
        const response = await getServiceReminders(userId);
        if (disposed || !isCurrentNotificationSession(session)) return;
        if (!response.ok) {
          setMessage(response.reason === "session"
            ? "Inicia sesión nuevamente para recibir avisos."
            : "No pudimos revisar las entregas. Reintentaremos cuando haya conexión.");
          return;
        }

        const now = Date.now();
        const due = response.reminders.filter(({ deliveryAt }) =>
          Date.parse(deliveryAt) <= now + UPCOMING_WINDOW,
        ).map((reminder) => ({
          ...reminder,
          key: `${reminder.id}:${reminder.deliveryAt}:${Date.parse(reminder.deliveryAt) <= now ? "overdue" : "soon"}`,
        }));
        const unseen = new Set(unseenReminderKeys(userId, due.map(({ key }) => key)));
        const pending = due.filter(({ key }) => unseen.has(key));
        setMessage(response.truncated
          ? "Se revisan hasta 200 servicios recientes por estado. Consulta Servicios para ver la agenda completa."
          : "Entregas revisadas. Próxima revisión en cinco minutos mientras la app esté visible.");
        if (!pending.length) return;

        const result = await showServiceNotification(session, {
          title: "Entregas por revisar",
          body: "Hay servicios pendientes con entrega próxima o vencida. Revisa la agenda de servicios.",
          tag: "delivery-reminders",
          url: pending.length === 1 ? buildServiceDetailHref(pending[0].id) : "/servicios",
        });
        if (disposed || !isCurrentNotificationSession(session)) return;
        if (result === "sent") {
          rememberNotificationKeys(userId, pending.map(({ key }) => key));
        } else if (result === "not-ready" || result === "failed") {
          setMessage("No se pudo mostrar el aviso. Usa Enviar prueba para comprobar los permisos del dispositivo.");
        }
      } catch {
        if (!disposed && isCurrentNotificationSession(session)) {
          setMessage("No pudimos revisar las entregas. Se reintentará automáticamente.");
        }
      } finally {
        checking = false;
      }
    };

    const timeout = window.setTimeout(() => void check(), 1500);
    const interval = window.setInterval(() => void check(), CHECK_INTERVAL);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [enabled, permission, support, userId]);

  const enable = async () => {
    const session = sessionRef.current;
    if (!session || notificationSupport() !== "available") return;
    setBusy(true);
    try {
      // The permission prompt is called directly from the user's click.
      const nextPermission = await Notification.requestPermission();
      if (!isCurrentNotificationSession(session)) return;
      setPermission(nextPermission);
      setNotificationsEnabled(userId, nextPermission === "granted");
      setMessage(nextPermission === "granted"
        ? "Avisos activados en este dispositivo. Puedes comprobarlos con Enviar prueba."
        : "No se activaron los avisos. Puedes cambiar el permiso en los ajustes del navegador.");
    } catch {
      if (isCurrentNotificationSession(session)) setMessage("El navegador no pudo solicitar el permiso.");
    } finally {
      if (isCurrentNotificationSession(session)) setBusy(false);
    }
  };

  const test = async () => {
    const session = sessionRef.current;
    setBusy(true);
    const result = await showServiceNotification(session, {
      title: "Econolab: avisos activados",
      body: "Recibirás avisos sobre entregas y resultados mientras uses la aplicación.",
      tag: "test",
      url: "/servicios",
    });
    if (!isCurrentNotificationSession(session)) return;
    setBusy(false);
    setMessage(result === "sent"
      ? "Prueba enviada. Si no aparece, revisa las notificaciones o el modo No molestar del dispositivo."
      : result === "not-ready"
        ? "La aplicación se está preparando. Recarga la página e intenta de nuevo."
        : "No se pudo mostrar la prueba. Revisa tu sesión, la conexión y los permisos del navegador.");
  };

  const active = enabled && permission === "granted";
  const unavailable = support === "insecure"
    ? "Abre Econolab mediante HTTPS para activar los avisos."
    : support === "install-ios"
      ? "En iPhone o iPad (iOS 16.4 o posterior), agrega Econolab a la pantalla de inicio y ábrela desde su icono."
      : support === "unsupported"
        ? "Este navegador no admite notificaciones del sistema."
        : permission === "denied"
          ? "El permiso está bloqueado. Permite las notificaciones en los ajustes de este sitio y vuelve a abrirlo."
          : "";

  return (
    <details className="mb-4 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm">
      <summary className="cursor-pointer font-semibold text-slate-700">
        <Bell aria-hidden="true" className="mr-2 inline h-4 w-4" />
        Avisos de entregas y resultados · {active ? "Activados" : "Desactivados"}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="max-w-3xl text-slate-600">
          Recibe avisos al cerrar un resultado y por entregas vencidas o previstas en la próxima hora.
          Las entregas se revisan cada cinco minutos con conexión y la app visible;
          no se envían avisos con la app cerrada. Los avisos no muestran pacientes ni valores clínicos.
        </p>
        {unavailable ? <p className="text-amber-800">{unavailable}</p> : null}
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <button type="button" disabled={busy} onClick={() => {
              setNotificationsEnabled(userId, false);
              setMessage("Avisos desactivados para tu cuenta en este dispositivo.");
            }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-700 disabled:opacity-50">
              <BellOff aria-hidden="true" className="h-4 w-4" /> Desactivar avisos
            </button>
          ) : (
            <button type="button" disabled={busy || !!unavailable} onClick={() => void enable()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Bell aria-hidden="true" className="h-4 w-4" />}
              Activar avisos
            </button>
          )}
          {active && support === "available" ? (
            <button type="button" disabled={busy} onClick={() => void test()}
              className="rounded-xl border border-slate-300 px-3 py-2 font-medium text-slate-700 disabled:opacity-50">
              {busy ? "Enviando…" : "Enviar prueba"}
            </button>
          ) : null}
        </div>
        <p role="status" className="text-xs text-slate-500">{message}</p>
      </div>
    </details>
  );
}
