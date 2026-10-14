import assert from "node:assert/strict";
import test from "node:test";
import { buildStudyQrValue, parseStudyQr, resolveStudyQr } from "../src/lib/studies/study-qr.ts";

test("study QR preserves stable record identity and rejects invalid identifiers", () => {
  assert.equal(buildStudyQrValue(41), "econolab:study:41");
  assert.deepEqual(parseStudyQr(buildStudyQrValue(41)), { ok: true, studyId: 41 });
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => buildStudyQrValue(value));
});
test("QR rejects external links, receipt codes, malformed and unsafe ids", () => {
  for (const value of ["https://evil.example", "javascript:alert(1)", "ECO-0001", "econolab:study:0", "econolab:study:01", "econolab:study:9007199254740992", "econolab:study:41:extra", ""]) assert.equal(parseStudyQr(value).ok, false);
});
test("QR lookup opens only the exact existing study and returns backend errors", async () => {
  let lookedUp;
  assert.deepEqual(await resolveStudyQr("econolab:study:41", async (id) => { lookedUp = id; return { ok: true, data: { id } }; }), { ok: true, studyId: 41 });
  assert.equal(lookedUp, 41);
  for (const data of [{ id: 42 }, { id: 41, isActive: false }]) assert.equal((await resolveStudyQr("econolab:study:41", async () => ({ ok: true, data }))).ok, false);
  assert.deepEqual(await resolveStudyQr("econolab:study:41", async () => ({ ok: false, errors: ["Estudio no encontrado."] })), { ok: false, error: "Estudio no encontrado." });
});
test("closing the scanner cancels pending study lookup and invalid QR never calls API", async () => {
  let cancelled = false;
  assert.equal((await resolveStudyQr("econolab:study:41", async () => { cancelled = true; return { ok: true, data: { id: 41 } }; }, () => cancelled)).ok, false);
  assert.equal((await resolveStudyQr("https://evil.example", async () => { throw new Error("Should not call API"); })).ok, false);
});
