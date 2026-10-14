type ServiceLookup = (id: number) => Promise<
  | { ok: true; data: { id: number } }
  | { ok: false; errors: string[] }
>;

export async function resolveServiceQr(value: string, lookup: ServiceLookup, cancelled: () => boolean = () => false) {
  const match = /^econolab:service:([1-9]\d*)$/.exec(value.trim());
  const serviceId = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(serviceId)) return { ok: false as const, error: "Este QR no corresponde a un servicio de Econolab." };
  if (cancelled()) return { ok: false as const, error: "Búsqueda cancelada." };
  const response = await lookup(serviceId);
  if (cancelled()) return { ok: false as const, error: "Búsqueda cancelada." };
  if (!response.ok) return { ok: false as const, error: response.errors[0] ?? "No se pudo consultar el servicio." };
  if (response.data.id !== serviceId) return { ok: false as const, error: "El servicio de este QR no está disponible." };
  return { ok: true as const, serviceId };
}
