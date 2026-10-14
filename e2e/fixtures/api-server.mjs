import { createServer } from "node:http";

// Catálogo ficticio exclusivamente para Playwright: no conecta a una base real.
const studies = [
  { id: 41, name: "ESTUDIO QR DE PRUEBA", code: "QR-041", description: "Registro ficticio para probar QR", durationMinutes: 60, type: "study", normalPrice: 100, difPrice: 90, specialPrice: 85, hospitalPrice: 80, otherPrice: 0, defaultDiscountPercent: 0, sampleType: "unknown", status: "active", isActive: true },
  { id: 42, name: "PAQUETE QR DE PRUEBA", code: "QR-042", description: "Paquete ficticio", durationMinutes: 60, type: "package", normalPrice: 150, difPrice: 140, specialPrice: 130, hospitalPrice: 120, otherPrice: 0, defaultDiscountPercent: 0, packageStudyIds: [41], sampleType: "unknown", status: "active", isActive: true },
];
createServer((request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:5184");
  response.setHeader("Content-Type", "application/json");
  if (url.pathname === "/health") return response.end(JSON.stringify({ ok: true }));
  if (request.method !== "GET") { response.statusCode = 405; return response.end(JSON.stringify({ message: "Fixture de solo lectura" })); }
  if (url.pathname === "/api/studies") return response.end(JSON.stringify({ data: studies, meta: { page: 1, limit: 2000, total: studies.length } }));
  const match = /^\/api\/studies\/(\d+)(\/details)?$/.exec(url.pathname);
  if (match) {
    const study = studies.find(({ id }) => id === Number(match[1]));
    if (!study) { response.statusCode = 404; return response.end(JSON.stringify({ message: "Estudio no encontrado." })); }
    return response.end(JSON.stringify(match[2] ? [] : study));
  }
  return response.end(JSON.stringify({ data: [], meta: { page: 1, limit: 100, total: 0 } }));
}).listen(5184, "127.0.0.1", () => console.log("API ficticia de lectura lista en 5184"));
