export function buildStudyQrValue(studyId: number): string {
  if (!Number.isSafeInteger(studyId) || studyId <= 0) throw new Error("Identificador de estudio inválido.");
  return `econolab:study:${studyId}`;
}

export function parseStudyQr(value: string): { ok: true; studyId: number } | { ok: false; error: string } {
  const match = /^econolab:study:([1-9]\d*)$/.exec(value.trim());
  const studyId = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(studyId)) return { ok: false, error: "Este QR no corresponde a un estudio de Econolab. Usa el código generado desde el catálogo." };
  return { ok: true, studyId };
}

type StudyLookup = (id: number) => Promise<
  | { ok: true; data: { id: number; isActive?: boolean } }
  | { ok: false; errors: string[] }
>;

export async function resolveStudyQr(value: string, lookup: StudyLookup, cancelled: () => boolean = () => false) {
  const parsed = parseStudyQr(value);
  if (!parsed.ok) return parsed;
  if (cancelled()) return { ok: false as const, error: "Búsqueda cancelada." };
  const response = await lookup(parsed.studyId);
  if (cancelled()) return { ok: false as const, error: "Búsqueda cancelada." };
  if (!response.ok) return { ok: false as const, error: response.errors[0] ?? "No se pudo consultar el estudio." };
  if (response.data.id !== parsed.studyId || response.data.isActive === false) return { ok: false as const, error: "El estudio de este QR ya no está disponible en el catálogo." };
  return { ok: true as const, studyId: parsed.studyId };
}
