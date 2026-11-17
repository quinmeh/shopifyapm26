import assert from "node:assert/strict";

// Local route/render checks only. No emails, catalog calls or merchant checkout.
const base = "http://localhost:3000";
const post = (path: string, body: unknown, cookie = "") => fetch(base + path, {
  method: "POST", headers: { Origin: base, Cookie: cookie, "content-type": "application/json" }, body: JSON.stringify(body),
});
async function page(path: string, cookie = "") {
  const response = await fetch(base + path, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200, path);
  return response.text();
}
const pick = { id: "delivery-test-pick", title: "Delivery test mug", shortName: "mug", priceCents: 1000 };
const setup = { recipientLabel: "test recipient", note: "Delivery flow test", pick, approvedSwaps: [{ ...pick, id: "delivery-test-swap" }] };
const address = { fullName: "Test Recipient", line1: "1 Test Street", line2: "Unit 2", city: "Seattle", region: "WA", postalCode: "98101", country: "US" };

async function main() {
  assert.equal((await post("/api/gifts", { ...setup, deliveryMethod: "invalid" })).status, 400);
  for (const deliveryMethod of ["ship_to_recipient", "give_in_person", undefined]) {
    const inPerson = deliveryMethod === "give_in_person";
    const created = await post("/api/gifts", { ...setup, deliveryMethod });
    assert.equal(created.status, 201);
    const cookie = created.headers.get("set-cookie")!.split(";")[0];
    const { id } = await created.json();
    const read = async () => (await fetch(`${base}/api/gifts/${id}?for=recipient`)).json();
    assert.equal((await read()).deliveryMethod, deliveryMethod ?? "ship_to_recipient");
    const waiting = await page(`/gift/${id}`, cookie);
    assert.ok(waiting.includes(inPerson ? "Give it in person" : "Ship directly to them"));
    const open = await page(`/g/${id}/open`);
    assert.equal(open.includes('id="addr-fullName"'), !inPerson);
    assert.equal(open.includes('id="addr-line1"'), !inPerson);
    assert.ok(open.includes(inPerson ? "Confirm my gift" : "Confirm gift and delivery"));
    const selection = { chosenProductId: inPerson ? "delivery-test-swap" : pick.id, variantId: "blue", variantTitle: "Blue" };
    if (!inPerson) assert.equal((await post(`/api/gifts/${id}/confirm`, { ...selection, deliveryMethod: "give_in_person" })).status, 400);
    assert.equal((await post(`/api/gifts/${id}/confirm`, { ...selection, ...(!inPerson ? { address } : {}) })).status, 200);
    const recipient = await read();
    assert.equal(recipient.confirmation.address?.fullName, inPerson ? undefined : address.fullName);
    assert.ok(!JSON.stringify(recipient).includes("priceCents"));
    const done = await page(`/g/${id}/done`);
    assert.ok(done.includes(inPerson ? "will take it from here" : "Your choice and delivery details are saved"));
    const status = await page(`/gift/${id}`, cookie);
    assert.ok(status.includes(inPerson ? "Enter your own shipping address" : "not transferred automatically"));
    assert.equal(status.includes("Copy delivery details"), !inPerson);
    assert.ok(!status.includes("Return to merchant checkout"));
    const reopened = await post(`/api/gifts/${id}/reopen`, { deliveryMethod: inPerson ? "ship_to_recipient" : "give_in_person" }, cookie);
    assert.equal(reopened.status, 200);
    assert.equal((await reopened.json()).deliveryMethod, deliveryMethod ?? "ship_to_recipient");
    const reset = await read();
    assert.equal(reset.confirmation, undefined);
  }
  console.log("Delivery flows passed: creation, legacy default, recipient form, confirmation, summaries, address copy action, and reopening. No checkout opened.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
