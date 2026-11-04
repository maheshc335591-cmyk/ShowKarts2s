import { expect, test, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on("pageerror", (error) => errors.get(page)!.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), "Uncaught browser exceptions").toEqual([]);
});

async function login(page: Page, role: "customer" | "admin" = "customer") {
  await page.goto("/login");
  await page.getByTestId(`demo-login-${role}-button`).click();
  await expect(page).toHaveURL(role === "admin" ? /\/admin$/ : /\/dashboard$/);
}

async function hold(page: Page, seat: string) {
  const result = await page.request.post("/api/bookings/hold", {
    data: { concert_id: "c6", seats: [seat] },
  });
  expect(result.ok(), await result.text()).toBeTruthy();
  return (await result.json()) as { id: string; ref: string; total: number };
}

for (const role of ["customer", "admin"] as const) {
  test(`${role} account menu opens, navigates, and logs out from the home page`, async ({
    page,
  }) => {
    await login(page, role);
    await page.goto("/");
    await page.getByTestId("navbar-user-menu").click();
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByTestId("navbar-logout-button")).toBeVisible();
    await page
      .getByTestId(role === "admin" ? "navbar-admin-link" : "navbar-dashboard-link")
      .click();
    await expect(page).toHaveURL(role === "admin" ? /\/admin$/ : /\/dashboard$/);
    await page.getByTestId("navbar-user-menu").click();
    await page.getByTestId("navbar-logout-button").click();
    await expect(page.getByTestId("navbar-login-button")).toBeVisible();
    expect(await (await page.request.get("/api/auth/me")).json()).toBeNull();
  });
}

for (const role of ["customer", "admin"] as const) {
  test(`${role} has responsive account controls and logout in the account menu`, async ({
    page,
  }) => {
    await login(page, role);
    await page.goto("/");
    for (const width of [390, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByTestId("navbar-user-menu")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `Header overflow at ${width}px`,
      ).toBeTruthy();
    }
    await page.getByTestId("navbar-user-menu").click();
    await page.getByTestId("navbar-logout-button").click();
    await expect(page.getByTestId("navbar-login-button")).toBeVisible();
    expect(await (await page.request.get("/api/auth/me")).json()).toBeNull();
  });
}

test("failed account-menu logout shows an error without pretending the session ended", async ({
  page,
}) => {
  await login(page);
  await page.goto("/");
  await page.route("**/api/auth/logout", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Sign-out temporarily unavailable" }),
    }),
  );
  await page.getByTestId("navbar-user-menu").click();
  await page.getByTestId("navbar-logout-button").click();
  await expect(page.getByText("Sign-out temporarily unavailable", { exact: true })).toBeVisible();
  await expect(page.getByTestId("navbar-user-menu")).toBeVisible();
  expect(await (await page.request.get("/api/auth/me")).json()).not.toBeNull();
  await page.unroute("**/api/auth/logout");
  await page.getByTestId("navbar-user-menu").click();
  await page.getByTestId("navbar-logout-button").click();
  await expect(page.getByTestId("navbar-login-button")).toBeVisible();
});

test("all public and guarded routes load without browser exceptions", async ({
  page,
}, testInfo) => {
  for (const route of [
    "/",
    "/explore",
    "/artists",
    "/artists/a1",
    "/concerts/c6",
    "/about",
    "/login",
    "/register",
    "/forgot-password",
    "/dashboard",
    "/admin",
    "/checkout",
    "/ticket/missing",
    "/booking/c6/seats",
  ]) {
    await page.goto(route);
    await expect(page.getByTestId("navbar-logo-link")).toBeVisible();
    await expect(page.locator("main").first()).not.toBeEmpty();
    await expect(page.getByText(/^Loading page/)).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/prototype/i);
  }
  await page.goto("/");
  await expect(page.locator('[data-testid^="concert-card-"]').first()).toBeVisible();
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute(
    "content",
    /prototype/i,
  );
  await page.screenshot({ path: testInfo.outputPath("homepage-desktop.png"), fullPage: true });
});

test("mobile navigation and public pages fit the viewport", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/explore",
    "/artists",
    "/concerts/c6",
    "/about",
    "/login",
    "/register",
  ]) {
    await page.goto(route);
    await expect(page.getByTestId("navbar-logo-link")).toBeVisible();
    await expect(
      page.locator("main").first().getByRole("heading", { level: 1 }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
  }
  await page.getByTestId("navbar-mobile-menu").click();
  await page.getByRole("link", { name: "Explore Concerts", exact: true }).last().click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Explore Concerts", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("explore-mobile.png"), fullPage: true });
});

test("wishlist state survives reload and can be removed", async ({ page }) => {
  await login(page);
  await page.goto("/artists/a2");
  await page.getByTestId("artist-wishlist-button").click();
  await expect(page.getByTestId("artist-wishlist-button")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByTestId("artist-wishlist-button")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("artist-wishlist-button").click();
  await expect(page.getByTestId("artist-wishlist-button")).toHaveAttribute("aria-pressed", "false");
});

test("password reset and password change work through the forms", async ({ page }) => {
  const account = {
    full_name: "Recovery Fan",
    email: "recovery-fan@example.com",
    mobile: "9876543210",
    password: "Browser@123",
    confirm_password: "Browser@123",
  };
  expect((await page.request.post("/api/auth/register", { data: account })).ok()).toBeTruthy();
  await page.goto("/forgot-password");
  await page.getByTestId("forgot-email-input").fill(account.email);
  await page.getByTestId("forgot-send-code-button").click();
  const code = await page.getByTestId("forgot-code-hint").locator("span").innerText();
  await page.getByTestId("forgot-code-input").fill(code);
  await page.getByTestId("forgot-new-password-input").fill("Recovered@123");
  await page.getByTestId("forgot-reset-button").click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByTestId("login-email-input").fill(account.email);
  await page.getByTestId("login-password-input").fill("Recovered@123");
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByTestId("profile-current-password-input").fill("Recovered@123");
  await page.getByTestId("profile-new-password-input").fill("FinalBrowser@123");
  const changed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/change-password") &&
      response.request().method() === "POST",
  );
  await page.getByTestId("profile-password-save-button").click();
  expect((await changed).ok()).toBeTruthy();
});

test("admin can create an event, change inventory, and delete disposable records", async ({
  page,
}) => {
  await login(page, "admin");
  const artistResponse = await page.request.post("/api/admin/artists", {
    data: { name: "Inventory Test Artist", genre: "College" },
  });
  const artist = await artistResponse.json();
  await page.reload();
  await page.getByTestId("admin-add-concert-button").click();
  await page.getByTestId("admin-concert-title-input").fill("Browser Campus Festival");
  await page.getByTestId("admin-concert-artist-select").click();
  await page.getByRole("option", { name: artist.name, exact: true }).click();
  await page.getByTestId("admin-concert-venue-input").fill("College Auditorium");
  await page.getByTestId("admin-concert-city-input").fill("Pune");
  await page.getByTestId("admin-concert-date-input").fill("2099-06-10T18:30");
  await page.getByTestId("admin-concert-poster-input").fill("/demo-media/image-4a01e2406abe.jpg");
  await page.getByTestId("admin-concert-save-button").click();
  await expect(page.getByTestId("admin-concert-dialog")).toBeHidden();
  const concerts = await (await page.request.get("/api/admin/concerts")).json();
  const event = concerts.find(
    (concert: { title: string }) => concert.title === "Browser Campus Festival",
  );
  expect(event).toBeTruthy();
  await page.getByRole("tab", { name: "Concerts", exact: true }).click();
  await page.getByTestId("admin-price-input-c6-general").fill("649");
  await page.getByTestId("admin-price-save-c6-general").click();
  await expect
    .poll(
      async () => (await (await page.request.get("/api/concerts/c6")).json()).categories[0].price,
    )
    .toBe(649);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByTestId(`admin-delete-concert-${event.id}`).click();
  await expect(page.getByTestId(`admin-concert-row-${event.id}`)).toHaveCount(0);
  await page.getByRole("tab", { name: "Artists", exact: true }).click();
  await page.getByTestId(`admin-delete-artist-${artist.id}`).click();
  await expect(page.getByTestId(`admin-artist-${artist.id}`)).toHaveCount(0);
});

test("alerts and newsletter forms call the local demo API", async ({ page }) => {
  await login(page);
  const booking = await hold(page, "J12");
  expect((await page.request.post(`/api/bookings/${booking.id}/cancel`)).ok()).toBeTruthy();
  await page.goto("/dashboard?tab=notifications");
  await page.getByTestId("notifications-mark-read-button").click();
  await expect
    .poll(async () =>
      (await (await page.request.get("/api/notifications")).json()).every(
        (item: { read: boolean }) => item.read,
      ),
    )
    .toBeTruthy();
  await page.getByTestId("newsletter-email-input").fill("newsletter-browser@example.com");
  const subscribed = page.waitForResponse((response) => response.url().endsWith("/api/newsletter"));
  await page.getByTestId("newsletter-subscribe-button").click();
  expect((await subscribed).ok()).toBeTruthy();
});

test("a failed page bundle shows recovery controls instead of a blank website", async ({
  page,
}) => {
  await page.route("**/assets/ExploreConcerts-*.js", (route) => route.abort());
  await page.goto("/explore");
  await expect(page.getByRole("heading", { name: "This page could not be loaded" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload page", exact: true })).toBeVisible();
  await expect(page.getByTestId("navbar-logo-link")).toBeVisible();
});

test("search and filters return matching events and handle empty results", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-city-select")).toContainText("All cities");
  await page.getByTestId("hero-city-select").click();
  await page.getByRole("option", { name: "Mumbai", exact: true }).click();
  await page.getByTestId("hero-city-select").click();
  await page.getByRole("option", { name: "All cities", exact: true }).click();
  await page.getByTestId("hero-search-input").fill("Coldplay");
  await page.getByTestId("hero-search-submit").click();
  await expect(page.locator('[data-testid^="concert-card-"]')).toHaveCount(1);
  await expect(page.getByTestId("filter-city-select")).toContainText("Any city");
  await expect(page.getByTestId("filter-genre-select")).toContainText("Any genre");
  await expect(page.getByTestId("filter-date-select")).toContainText("Any date");
  await expect(page.getByTestId("explore-sort-select")).toContainText("Most popular");
  await expect(page.locator('[data-testid^="concert-card-"]').first()).toContainText("Coldplay");
  await page.getByTestId("explore-search-input").fill("no-such-concert-999");
  await expect(page.getByTestId("explore-empty-state")).toBeVisible();
  await page.getByTestId("explore-filters-reset").click();
  await expect(page.locator('[data-testid^="concert-card-"]').first()).toBeVisible();
});

test("register, profile editing, logout, and login preserve account boundaries", async ({
  page,
}) => {
  await page.goto("/register");
  for (const [field, value] of Object.entries({
    name: "Browser Fan",
    email: "browser-fan@example.com",
    mobile: "9876543210",
    password: "Browser@123",
    "confirm-password": "Browser@123",
  })) {
    await page.getByTestId(`register-${field}-input`).fill(value);
  }
  await page.getByTestId("register-submit-button").click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("browser-fan@example.com", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByTestId("profile-name-input").fill("Browser Updated");
  await page.getByTestId("profile-save-button").click();
  await expect(page.getByRole("heading", { name: /Hey, Browser/ })).toBeVisible();
  await page.getByTestId("dashboard-logout-button").click();
  await page.goto("/dashboard");
  await expect(page.getByText("Members only", { exact: true })).toBeVisible();
  await login(page);
  await expect(page.getByText("customer@showkart.in", { exact: true })).toBeVisible();
  await expect(page.getByText("browser-fan@example.com", { exact: true })).toHaveCount(0);
});

test("seat selection, coupon, UPI payment, QR ticket, print, and cancellation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/booking/c6/seats");
  await page.getByTestId("seat-dot-J1").click();
  await page.getByTestId("seat-dot-J2").click();
  await page.getByTestId("proceed-payment-button").click();
  await expect(page).toHaveURL(/\/checkout\?booking=/);
  await page.getByTestId("coupon-code-input").fill("SHOWCOLLEGE");
  await page.getByTestId("coupon-apply-button").click();
  await expect(page.getByTestId("coupon-applied")).toBeVisible();
  await page.getByTestId("checkout-pay-button").click();
  await page.getByTestId("upi-id-input").fill("demo@upi");
  await page.getByTestId("simulated-upi-pay-button").click();
  await expect(page).toHaveURL(/\/ticket\//);
  await expect(page.getByTestId("eticket-qr-code")).toHaveCount(2);
  const bookingId = page.url().split("/ticket/")[1];
  const booking = await (await page.request.get(`/api/bookings/${bookingId}`)).json();
  await page.evaluate(() => {
    window.print = () => {
      document.body.dataset.printed = "true";
    };
  });
  await page.getByTestId("download-ticket-pdf-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-printed", "true");
  await page.goto("/dashboard");
  await page.getByTestId(`booking-cancel-${booking.ref}`).click();
  await expect(page.getByTestId(`booking-row-${booking.ref}`)).toHaveCount(0);
  await page.goto(`/ticket/${bookingId}`);
  await expect(page.getByText("Ticket not found", { exact: true })).toBeVisible();
});

for (const method of ["card", "netbanking"] as const) {
  test(`simulated ${method} payment works`, async ({ page }) => {
    await login(page);
    const booking = await hold(page, method === "card" ? "J3" : "J4");
    await page.goto(`/checkout?booking=${booking.id}`);
    await page.getByTestId("checkout-pay-button").click();
    await page.getByTestId(`payment-tab-${method}`).click();
    if (method === "card") {
      await page.getByTestId("card-number-input").fill("4111111111111111");
      await page.getByTestId("card-name-input").fill("Demo Fan");
      await page.getByTestId("card-expiry-input").fill("12/30");
      await page.getByTestId("card-cvv-input").fill("123");
    } else {
      await page.getByTestId("bank-select").click();
      await page.getByRole("option", { name: "HDFC Bank", exact: true }).click();
    }
    await page.getByTestId(`simulated-${method}-pay-button`).click();
    await expect(page).toHaveURL(/\/ticket\//);
    await expect(page.getByTestId("eticket-qr-code")).toHaveCount(1);
  });
}

test("failed payment releases the hold and cannot display a valid ticket", async ({ page }) => {
  await login(page);
  const booking = await hold(page, "J5");
  await page.goto(`/checkout?booking=${booking.id}`);
  await page.getByTestId("checkout-pay-button").click();
  await page.getByTestId("simulate-payment-failure-button").click();
  await expect(page.getByTestId("payment-modal")).toBeHidden();
  await page.goto(`/ticket/${booking.id}`);
  await expect(page.getByText("Ticket not found", { exact: true })).toBeVisible();
  const result = await page.request.get(`/api/bookings/${booking.id}`);
  expect((await result.json()).status).toBe("failed");
});

test("admin edits preserve event time and administrator pages are guarded", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText("Admin access only", { exact: true })).toBeVisible();
  await login(page, "admin");
  const before = await (await page.request.get("/api/concerts/c6")).json();
  await page.getByRole("tab", { name: "Concerts", exact: true }).click();
  await page.getByTestId("admin-edit-concert-c6").click();
  await page.getByTestId("admin-concert-title-input").fill(before.title + " updated");
  await page.getByTestId("admin-concert-save-button").click();
  await expect(page.getByTestId("admin-concert-dialog")).toBeHidden();
  const after = await (await page.request.get("/api/concerts/c6")).json();
  expect(new Date(after.date).getTime()).toBe(new Date(before.date).getTime());
  await page.getByRole("tab", { name: "Artists", exact: true }).click();
  await page.getByTestId("admin-add-artist-button").click();
  await page.getByTestId("admin-artist-name-input").fill("Browser Artist");
  await page.getByTestId("admin-artist-genre-input").fill("College");
  await page.getByTestId("admin-artist-save-button").click();
  await expect(page.getByTestId("admin-artist-dialog")).toBeHidden();
  await expect(page.getByText("Browser Artist", { exact: true })).toBeVisible();
});

test("bad resource IDs show a useful state rather than a blank booking page", async ({ page }) => {
  await page.goto("/booking/no-such-event/seats");
  await expect(
    page.getByText(/Concert not found|Unable to load|Could not load/i).first(),
  ).toBeVisible();
});

test("changing seats releases the previous hold before returning to the map", async ({ page }) => {
  await login(page);
  const booking = await hold(page, "J6");
  await page.goto(`/checkout?booking=${booking.id}`);
  await page.getByRole("link", { name: /Change seats/ }).click();
  await expect(page).toHaveURL(/\/booking\/c6\/seats$/);
  await expect(page.getByTestId("seat-dot-J6")).toHaveAttribute("aria-label", "Seat J6 available");
  expect((await (await page.request.get(`/api/bookings/${booking.id}`)).json()).status).toBe(
    "cancelled",
  );
});

test("mobile checkout fits and signing out closes the menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const booking = await hold(page, "J9");
  await page.goto(`/checkout?booking=${booking.id}`);
  await expect(page.getByTestId("checkout-pay-button")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByTestId("navbar-mobile-menu").click();
  await page.getByTestId("mobile-logout-button").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/dashboard");
  await expect(page.getByText("Members only", { exact: true })).toBeVisible();
});
