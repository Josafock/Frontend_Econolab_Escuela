type FolioResult =
  | { ok: true; folio: string }
  | { ok: false; error: string };

/** Receipt CODE128 values contain the complete folio, including any hyphens. */
export function parseReceiptFolio(value: string): FolioResult {
  const folio = value.trim();
  if (!folio) {
    return { ok: false, error: "Escribe el folio o escanea el código del recibo." };
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(folio) || /^(\/\/|www\.)/i.test(folio)) {
    return { ok: false, error: "Este lector acepta folios de Econolab, no enlaces." };
  }
  if (
    folio.length > 50 ||
    Array.from(folio).some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || (code >= 127 && code <= 159);
    })
  ) {
    return {
      ok: false,
      error: "El código no es un folio válido. Usa el código del recibo o escribe su folio (máximo 50 caracteres).",
    };
  }
  // The backend uses trim + uppercase when saving folios. Never split labels
  // into guessed folios or navigate to the text returned by a barcode.
  return { ok: true, folio: folio.toUpperCase() };
}

type SearchResponse =
  | {
      ok: true;
      data: {
        data: Array<{ id: number; folio: string }>;
        meta: { page: number; limit: number; total: number };
      };
    }
  | { ok: false; errors: string[] };

type SearchServices = (params: {
  search: string;
  page: number;
  limit: number;
}) => Promise<SearchResponse>;

export type ReceiptServiceResult =
  | { ok: true; serviceId: number }
  | { ok: false; error: string };

export async function resolveReceiptService(
  rawValue: string,
  searchServices: SearchServices,
  isCancelled: () => boolean = () => false,
): Promise<ReceiptServiceResult> {
  const parsed = parseReceiptFolio(rawValue);
  if (!parsed.ok) return parsed;

  let page = 1;
  let totalPages = 1;
  do {
    if (isCancelled()) return { ok: false, error: "Búsqueda cancelada." };
    const response = await searchServices({ search: parsed.folio, page, limit: 100 });
    if (isCancelled()) return { ok: false, error: "Búsqueda cancelada." };
    if (!response.ok) {
      return { ok: false, error: response.errors[0] ?? "No se pudo consultar el servicio." };
    }

    const match = response.data.data.find(
      (service) => service.folio.trim().toUpperCase() === parsed.folio,
    );
    if (match && Number.isSafeInteger(match.id) && match.id > 0) {
      return { ok: true, serviceId: match.id };
    }

    // Search also matches patients and studies. Never open its first partial
    // result; inspect subsequent pages for the complete receipt folio.
    const { limit, total } = response.data.meta;
    if (!response.data.data.length || limit <= 0 || !Number.isFinite(total)) break;
    totalPages = Math.ceil(total / limit);
    page += 1;
  } while (page <= totalPages);

  return {
    ok: false,
    error: "No hay un servicio con ese folio exacto. Escanea el recibo (no las etiquetas de muestras) o revisa el folio escrito.",
  };
}
