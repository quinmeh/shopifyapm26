import { test, expect, type Page } from "@playwright/test";

// Catalog, geocoder and merchant checkout are fixtures. Gift creation, ownership,
// recipient confirmation and persisted delivery choices use the actual local API.
const product = { id: "gid://shopify/p/m5-mug", title: "Handmade stoneware mug", shortName: "stoneware mug", priceCents: 4000, sellerName: "Demo Maker", imageUrl: "/file.svg" };
const swap = { ...product, id: "gid://shopify/p/m5-bowl", title: "Ribbed stoneware bowl", shortName: "stoneware bowl", sellerName: "Another Maker" };

async function mockCatalog(page: Page) {
  await page.route("**/api/search", route => route.fulfill({ json: { products: [product, swap], makers: 2, mode: "occasion", occasion: { key: "home", read: "A thoughtful start for their new home." } } }));
  await page.route("**/api/swaps", route => route.fulfill({ json: { swaps: [swap] } }));
  await page.route("**/api/product/**", route => {
    const selected = new URL(route.request().url()).searchParams.get("selected");
    const color = selected ? JSON.parse(selected)[0]?.label : "Blue";
    return route.fulfill({ json: { product, options: [{ name: "Color", values: [{ label: "Blue", available: true }, { label: "Clay", available: true }, { label: "Green", available: false }] }], variant: { id: `v-${color}`, title: color, options: [{ name: "Color", label: color }], available: color !== "Green" } } });
  });
}

async function fits(page: Page, name: string) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('[data-theme]')).toHaveCSS("background-color", /rgb\(/);
  await page.screenshot({ path: `artifacts/mobile-${name}.png`, fullPage: true });
}

for (const inPerson of [false, true]) {
  test(`${inPerson ? "in-person" : "direct-shipping"} gifting at 390px`, async ({ page, browser }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockCatalog(page);
    await page.goto("/");
    await expect(page.locator('[data-theme="giver"]')).toHaveCSS("background-color", "rgb(241, 241, 241)");
    await fits(page, "start");
    await page.getByRole("button", { name: "Skip — describe them in words instead" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Find gifts for the occasion" }).click();
    await page.getByRole("button", { name: /Handmade stoneware mug/ }).click();
    await page.getByRole("link", { name: "Choose stoneware mug" }).click();
    await expect(page.getByRole("radio", { name: /Ship directly to them/ })).toBeChecked();
    await page.getByLabel("Who’s it for?").fill("your friend");
    await page.getByLabel("What made you think of them?").fill("For slow mornings in your new home.");
    if (inPerson) await page.getByRole("radio", { name: /Give it in person/ }).check();
    await fits(page, inPerson ? "pick-in-person" : "pick-direct");
    await page.getByRole("button", { name: "Create gift link", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your gift is ready to share" })).toBeVisible();
    const giftURL = await page.getByRole("textbox", { name: "Gift link", exact: true }).inputValue();
    const id = new URL(giftURL).pathname.split("/").pop()!;
    const recipientContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const recipient = await recipientContext.newPage();
    recipient.on("pageerror", error => errors.push(error.message));
    await mockCatalog(recipient);
    await recipient.goto(giftURL);
    await expect(recipient.locator('[data-theme="gift"]')).toHaveCSS("background-color", "rgb(250, 246, 240)");
    await fits(recipient, "reveal");
    await recipient.getByRole("link", { name: "Open your gift" }).click();
    await expect(recipient.getByRole("button", { name: "Green", exact: true })).toBeDisabled();
    if (inPerson) {
      await recipient.getByRole("button", { name: /Not quite right/ }).click();
      await expect(recipient.getByRole("dialog")).toBeVisible();
      await recipient.getByRole("dialog").getByRole("button", { name: /Ribbed stoneware bowl/ }).click();
      await expect(recipient.getByRole("dialog")).toHaveCount(0);
    }
    await recipient.getByRole("button", { name: "Blue", exact: true }).click();
    if (inPerson) {
      await expect(recipient.getByLabel("Recipient’s full name")).toHaveCount(0);
      await expect(recipient.getByRole("heading", { name: /will give this to you in person/ })).toBeVisible();
    } else {
      await recipient.getByRole("button", { name: "Confirm gift and delivery" }).click();
      await expect(recipient.getByText("Add the recipient’s full name.")).toBeVisible();
      await recipient.getByLabel("Recipient’s full name").fill("Demo Recipient");
      await recipient.getByLabel("Apartment, suite, unit · optional").fill("Unit 2");
      await recipient.route("**/api/address-search", route => route.fulfill({ json: { matches: [{ line1: "4600 SILVER HILL RD", city: "WASHINGTON", region: "DC", postalCode: "20233" }] } }));
      await recipient.getByRole("combobox", { name: "Street address" }).fill("4600 Silver Hill Rd Washington DC");
      await expect(recipient.getByRole("option", { name: /4600 SILVER HILL/ })).toBeVisible();
      await recipient.getByRole("option", { name: /4600 SILVER HILL/ }).tap();
      await expect(recipient.getByLabel("City", { exact: true })).toHaveValue("WASHINGTON");
      await expect(recipient.getByLabel("Apartment, suite, unit · optional")).toHaveValue("Unit 2");
      await expect(recipient.getByLabel("Recipient’s full name")).toHaveValue("Demo Recipient");
    }
    await expect(recipient.locator("main")).not.toContainText("$40");
    await fits(recipient, inPerson ? "confirm-in-person" : "confirm-direct");
    await recipient.getByRole("button", { name: inPerson ? "Confirm my gift" : "Confirm gift and delivery", exact: true }).click();
    await expect(recipient.getByRole("heading", { name: "You’re all set" })).toBeVisible();
    await fits(recipient, inPerson ? "done-in-person" : "done-direct");
    expect((await recipient.request.get(new URL(`/api/gifts/${id}`, giftURL).href)).status()).toBe(403);

    await page.route(`**/api/gifts/${id}/checkout`, route => route.fulfill({ json: { checkoutUrl: "https://merchant.example/checkout", priceChanged: false, oldCents: 4000, newCents: 4000, soldOut: false, checkedAt: new Date().toISOString(), sellerName: "Demo Maker", proceed: route.request().postDataJSON().proceed === true } }));
    await page.context().route("https://merchant.example/**", route => route.fulfill({ contentType: "text/html", body: "<h1>Test merchant checkout</h1>" }));
    await page.goto(`/gift/${id}`);
    await expect(page.getByText(inPerson ? "Give it in person" : "Ship directly to them", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy delivery details" })).toHaveCount(inPerson ? 0 : 1);
    const checkout = page.getByRole("button", { name: "Complete purchase at Demo Maker ↗", exact: true });
    await expect(checkout).toBeEnabled();
    await fits(page, inPerson ? "status-in-person" : "status-direct");
    const popupReady = page.waitForEvent("popup");
    await checkout.click();
    const popup = await popupReady;
    await expect(popup).toHaveURL("https://merchant.example/checkout");
    await expect(page).toHaveURL(new RegExp(`/gift/${id}$`));
    await expect(page.getByRole("button", { name: /checkout again/ })).toHaveCount(1);
    await expect(page.getByText("Return to merchant checkout")).toHaveCount(0);
    await fits(page, "checkout-opened");
    expect(errors).toEqual([]);
    await recipientContext.close();
  });
}

test("address lookup failure still allows manual confirmation", async ({ page }) => {
  await mockCatalog(page);
  const base = test.info().project.use.baseURL as string;
  const created = await page.request.post("/api/gifts", { headers: { Origin: base }, data: { recipientLabel: "test recipient", note: "Manual address fallback", pick: product } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  await page.route("**/api/address-search", route => route.fulfill({ status: 502, json: { error: "Lookup unavailable" } }));
  await page.goto(`/g/${id}/open`);
  await page.getByRole("button", { name: "Blue", exact: true }).click();
  await page.getByLabel("Recipient’s full name").fill("Demo Recipient");
  await page.getByRole("combobox", { name: "Street address" }).fill("1 Test Street");
  await expect(page.getByText("Suggestions are unavailable. You can still enter your address manually.")).toBeVisible();
  await page.getByLabel("City", { exact: true }).fill("Seattle");
  await page.getByLabel("State", { exact: true }).fill("WA");
  await page.getByLabel("ZIP", { exact: true }).fill("98101");
  await page.getByRole("button", { name: "Confirm gift and delivery" }).click();
  await expect(page.getByRole("heading", { name: "You’re all set" })).toBeVisible();
});
