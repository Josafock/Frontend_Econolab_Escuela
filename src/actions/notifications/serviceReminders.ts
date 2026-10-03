"use server";

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { userSchema } from "@/schemas";
import { getServices } from "@/features/services/api/services";

export type ServiceReminder = {
  id: number;
  deliveryAt: string;
};

/** Recheck the cookie: another tab may have signed out or changed accounts. */
export async function isNotificationSessionActive(userId: string): Promise<boolean> {
  const token = (await cookies()).get("ECONOLAB_TOKEN")?.value;
  if (!token || !process.env.JWT_SECRET || !userId) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
    );
    const user = userSchema.safeParse(payload);
    return user.success && user.data.id === userId;
  } catch {
    return false;
  }
}

export async function getServiceReminders(userId: string): Promise<
  | { ok: true; reminders: ServiceReminder[]; truncated: boolean }
  | { ok: false; reason: "session" | "connection" }
> {
  if (!(await isNotificationSessionActive(userId))) {
    return { ok: false, reason: "session" };
  }

  const reminders: ServiceReminder[] = [];
  let truncated = false;
  // Bound database work to 600 active orders / 6 requests per five-minute check.
  // Date filters in the existing API refer to creation, not delivery, so omit them.
  for (const status of ["pending", "in_progress", "delayed"] as const) {
    for (let page = 1; page <= 2; page += 1) {
      const response = await getServices({ status, page, limit: 100 });
      if (!response.ok) return { ok: false, reason: "connection" };

      for (const service of response.data.data) {
        if (
          service.status !== "completed" &&
          service.status !== "cancelled" &&
          !service.completedAt &&
          service.deliveryAt &&
          Number.isFinite(Date.parse(service.deliveryAt))
        ) {
          reminders.push({ id: service.id, deliveryAt: service.deliveryAt });
        }
      }
      if (page * 100 >= response.data.meta.total) break;
      if (page === 2) truncated = true;
    }
  }

  return { ok: true, reminders, truncated };
}
