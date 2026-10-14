import "server-only"
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { userSchema } from "../schemas";
import { cache } from "react";
import { jwtVerify } from "jose"

export const verifySession = cache(async (unauthenticatedPath: "/" | "/auth/login" = "/auth/login") => {
  const token = (await cookies()).get("ECONOLAB_TOKEN")?.value;
  if (!token) redirect(unauthenticatedPath);

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    
    const parsed = userSchema.safeParse(payload);
    if (!parsed.success) redirect(unauthenticatedPath);

    return {
      user: parsed.data,
      token: true,
    };
  } catch {
    redirect(unauthenticatedPath);
  }
})

export async function VerifyRole(allowed: ("admin" | "recepcionista" | "unassigned")[]) {
    const { user } = await verifySession();

    if (!allowed.includes(user.rol)) {
        redirect("/errors/403");
    }

    return { user };
}
