import assert from "node:assert/strict";
import test from "node:test";
import { parseReceiptFolio, resolveReceiptService } from "../src/lib/services/service-barcode.ts";

test("receipt folios retain hyphens and normalize like the backend", () => {
  assert.deepEqual(parseReceiptFolio(" eco-2026-0001 "), { ok: true, folio: "ECO-2026-0001" });
});

test("URLs, missing folios, control characters and excessive input are rejected", () => {
  for (const value of ["", "https://evil.example", "javascript:alert(1)", "//evil.example", "www.example.com", "ECO\n123", "A".repeat(51)]) {
    assert.equal(parseReceiptFolio(value).ok, false, value);
  }
});

test("invalid input never triggers an authenticated search", async () => {
  const result = await resolveReceiptService("https://evil.example", () => { throw new Error("Unexpected API call"); });
  assert.equal(result.ok, false);
});

test("partial matches are skipped and an exact folio on later pages is opened", async () => {
  const calls = [];
  const result = await resolveReceiptService("ECO-42", async (params) => {
    calls.push(params);
    return { ok: true, data: { data: params.page === 1 ? [{ id: 1, folio: "ECO-420" }] : [{ id: 2, folio: "ECO-42" }], meta: { page: params.page, limit: 1, total: 2 } } };
  });
  assert.deepEqual(result, { ok: true, serviceId: 2 });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].search, "ECO-42");
  assert.equal(calls[1].page, 2);
});

test("sample labels are never reduced to a guessed receipt folio", async () => {
  const result = await resolveReceiptService("ECO-42-PATIENT-CBC-9", async () => ({ ok: true, data: { data: [{ id: 2, folio: "ECO-42" }], meta: { page: 1, limit: 100, total: 1 } } }));
  assert.equal(result.ok, false);
});

test("API errors including expired sessions are returned without opening a service", async () => {
  assert.deepEqual(await resolveReceiptService("ECO-42", async () => ({ ok: false, errors: ["Tu sesión expiró."] })), { ok: false, error: "Tu sesión expiró." });
});

test("closing the scanner cancels pagination and late navigation", async () => {
  let cancelled = false;
  const result = await resolveReceiptService("ECO-42", async () => {
    cancelled = true;
    return { ok: true, data: { data: [{ id: 2, folio: "ECO-42" }], meta: { page: 1, limit: 100, total: 1 } } };
  }, () => cancelled);
  assert.equal(result.ok, false);
});
