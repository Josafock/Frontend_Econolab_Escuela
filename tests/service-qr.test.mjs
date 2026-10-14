import assert from "node:assert/strict";
import test from "node:test";
import { resolveServiceQr } from "../src/lib/services/service-qr.ts";

test("result PDF QR resolves the exact service without interpreting a result id as a study id", async () => {
  let queried;
  assert.deepEqual(await resolveServiceQr("econolab:service:73", async (id) => { queried = id; return { ok: true, data: { id } }; }), { ok: true, serviceId: 73 });
  assert.equal(queried, 73);
});
test("service QR rejects URLs, study codes, zero, malformed and oversized ids without API calls", async () => {
  for (const value of ["https://evil.test", "econolab:study:41", "econolab:service:0", "econolab:service:01", "econolab:service:9007199254740992", "econolab:service:73:extra"]) {
    assert.equal((await resolveServiceQr(value, async () => { throw new Error("Should not call API"); })).ok, false);
  }
});
test("service QR respects missing records, mismatched ids, expired sessions and cancellation", async () => {
  assert.deepEqual(await resolveServiceQr("econolab:service:73", async () => ({ ok: false, errors: ["Sesión expirada."] })), { ok: false, error: "Sesión expirada." });
  assert.equal((await resolveServiceQr("econolab:service:73", async () => ({ ok: true, data: { id: 74 } }))).ok, false);
  let cancelled = false;
  assert.equal((await resolveServiceQr("econolab:service:73", async () => { cancelled = true; return { ok: true, data: { id: 73 } }; }, () => cancelled)).ok, false);
});
