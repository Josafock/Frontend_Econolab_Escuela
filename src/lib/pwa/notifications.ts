"use client";

import { isNotificationSessionActive } from "@/actions/notifications/serviceReminders";
import { buildServiceDetailHref } from "@/lib/routes/detail-routes";

export const NOTIFICATION_PREFERENCE_EVENT = "econolab:notification-preference";
const PREFIX = "econolab:pwa:notifications:v1:";
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_HISTORY = 1500;

export type NotificationSession = Readonly<{ userId: string; token: symbol }>;
export type NotificationSupport =
  | "available"
  | "insecure"
  | "install-ios"
  | "unsupported";
export type NotificationResult = "sent" | "disabled" | "not-ready" | "failed";

let activeSession: NotificationSession | null = null;
const memoryPreferences = new Map<string, boolean>();
const memoryHistory = new Map<string, Record<string, number>>();

export function notificationSupport(): NotificationSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "install-ios";
  return "Notification" in window && "serviceWorker" in navigator &&
    "ServiceWorkerRegistration" in window &&
    "showNotification" in ServiceWorkerRegistration.prototype
    ? "available"
    : "unsupported";
}

export function activateNotificationSession(userId: string): NotificationSession {
  const session = { userId, token: Symbol(userId) };
  activeSession = session;
  return session;
}

export function deactivateNotificationSession(session: NotificationSession) {
  if (activeSession === session) activeSession = null;
}

export function getNotificationSession(): NotificationSession | null {
  return activeSession;
}

export function isCurrentNotificationSession(session: NotificationSession | null) {
  return session !== null && activeSession === session;
}

export function notificationsEnabled(userId: string): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    const saved = localStorage.getItem(`${PREFIX}${userId}:enabled`);
    if (saved !== null) return saved === "true";
  } catch { /* Private browsers may block localStorage; fall back for this tab. */ }
  return memoryPreferences.get(userId) ?? false;
}

export function setNotificationsEnabled(userId: string, enabled: boolean) {
  memoryPreferences.set(userId, enabled);
  try {
    localStorage.setItem(`${PREFIX}${userId}:enabled`, String(enabled));
  } catch { /* The preference still works for this tab. */ }
  window.dispatchEvent(new Event(NOTIFICATION_PREFERENCE_EVENT));
}

function readHistory(userId: string): Record<string, number> {
  let history = memoryHistory.get(userId) ?? {};
  try {
    const saved = localStorage.getItem(`${PREFIX}${userId}:seen`);
    if (saved === null) return history;
    const parsed: unknown = JSON.parse(saved);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      history = Object.fromEntries(Object.entries(parsed).filter(
        ([key, value]) => key.length < 150 && typeof value === "number" &&
          Number.isFinite(value) && value > Date.now() - RETENTION_MS,
      )) as Record<string, number>;
    }
  } catch { /* Use memory when storage is unavailable. */ }
  return history;
}

export function unseenReminderKeys(userId: string, keys: string[]): string[] {
  const history = readHistory(userId);
  return keys.filter((key) => !history[key]);
}

export function rememberNotificationKeys(userId: string, keys: string[]) {
  const history = readHistory(userId);
  for (const key of keys) history[key] = Date.now();
  const bounded = Object.fromEntries(Object.entries(history)
    .sort((a, b) => b[1] - a[1]).slice(0, MAX_HISTORY));
  memoryHistory.set(userId, bounded);
  try {
    localStorage.setItem(`${PREFIX}${userId}:seen`, JSON.stringify(bounded));
  } catch { /* Deduplication remains available for the active tab. */ }
}

export async function showServiceNotification(
  session: NotificationSession | null,
  notification: { title: string; body: string; tag: string; url: string },
): Promise<NotificationResult> {
  if (!session || !isCurrentNotificationSession(session) ||
      !notificationsEnabled(session.userId) || notificationSupport() !== "available" ||
      Notification.permission !== "granted") return "disabled";

  try {
    // getRegistration settles without waiting forever when registration failed.
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration?.active) return "not-ready";
    const authenticated = await isNotificationSessionActive(session.userId);
    if (!authenticated || !isCurrentNotificationSession(session) ||
        !notificationsEnabled(session.userId) || Notification.permission !== "granted") {
      return "disabled";
    }
    await registration.showNotification(notification.title, {
      body: notification.body,
      icon: "/icons/icon-192.png",
      tag: `${PREFIX}${session.userId}:${notification.tag}`,
      data: { url: notification.url },
    });
    return "sent";
  } catch {
    // Notification failures must never affect saving a clinical result.
    return "failed";
  }
}

export async function notifyResultFinalized(
  serviceId: number,
  session: NotificationSession | null,
): Promise<NotificationResult> {
  if (!Number.isSafeInteger(serviceId) || serviceId <= 0) return "disabled";
  return showServiceNotification(session, {
    title: "Resultado guardado en Econolab",
    body: "Se confirmó el cierre de un resultado. Abre el servicio para revisarlo.",
    tag: `result-${serviceId}`,
    url: buildServiceDetailHref(serviceId),
  });
}
