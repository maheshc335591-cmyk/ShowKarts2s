# ShowKart website QA

Date: 4 November 2026. Scope: the local college prototype, using disposable test data.

## High-severity booking bugs fixed

| Finding | Reproduction before the fix | Result after the fix |
| --- | --- | --- |
| Payment accepted after an event had started | Hold a seat, advance the event into the past, then submit payment: the API returned a confirmed ticket. | Started events invalidate pending holds and checkout rejects payment. Admins cannot reschedule an event into the past. |
| Active tickets showed outdated event details | Change the title, venue, city, date, or performer name after a booking. Tickets retained the old values. | Event and performer edits synchronize active bookings in the same transaction and create customer notifications. Existing prices and payment references remain unchanged. |
| Changing seats kept the previous reservation locked | Click Change seats at checkout: the old seats remained booked until the ten-minute hold expired. | The old pending booking is cancelled before returning to seat selection, releasing the seats immediately. |

## Additional defects fixed

- Invalid event URLs produced a blank seat-selection screen. The page now shows an error, retry button, and link to explore concerts.
- Unicode reset codes caused HTTP 500 errors. Reset codes now require six ASCII digits and invalid input returns a validation response.
- Non-finite coupon amounts caused HTTP 500 errors. Non-finite numbers are rejected, and validation responses omit raw rejected input so they remain valid JSON and do not echo passwords.
- Missing JavaScript/image URLs returned the SPA HTML with status 200. Missing assets now return 404, while client-side page routes still serve the application.
- A failed lazy-loaded page could remove the website UI. A route error boundary now preserves navigation and offers reload/home recovery controls.
- Wishlist state reset visually after reloading an artist profile. The button now derives its state from the saved wishlist and prevents duplicate submissions while pending.
- Mobile sign-out left the navigation drawer open. Signing out now closes it.
- Whitespace-only names passed validation. Names are stripped and validated before storing them.
- Choosing All cities on the home page sent that label as an actual city filter and returned no events. It now clears the filter. Select controls also show readable labels instead of internal values such as any, popularity, or artist IDs.

## Regression coverage

Final result: all 19 API regression tests, all 22 Chromium browser scenarios, and the existing API smoke check pass. Lint, TypeScript/Pyrefly type checks, formatting checks, and the production build also pass. These tests were added for this review and include regressions for the reproduced defects.

Follow-up account navigation checks reproduced a desktop account-menu crash for both demo roles. The menu label now sits inside the required menu group, preventing the Base UI context error. Both roles can navigate to their dashboard and sign out through the account menu. Failed sign-out requests show an error and preserve the signed-in state. Responsive checks cover widths of 390, 768, 1024, and 1280 pixels. Public pages, metadata, and sample catalogue descriptions no longer use the word prototype; simulated-payment disclosures remain visible.

API coverage includes customer/admin permissions, booking ownership, registration role tampering, client-side price tampering, invalid/duplicate/over-limit seats, expired and started-event holds, concurrent seat allocation, idempotent concurrent payment retries, ticket updates, protected inventory changes, password-session invalidation, malformed input, static-file traversal, and untrusted request origins.

Browser coverage includes all main public/guarded routes; desktop and 390×844 mobile layouts; search and empty results; registration, profile editing, login/logout, password reset/change; saved wishlists; seat selection; coupon application; UPI/card/netbanking simulations; QR display and the print-button trigger; cancellation; payment failure; admin event/artist/inventory editing; notifications; newsletter submission; invalid event URLs; failed page-bundle recovery; changing seats; and mobile checkout/sign-out.

## Running the checks

GitHub Pages follow-up: four additional static-preview Chromium scenarios pass without a backend. They cover the project subpath, refreshed hash routes, logo/favicon loading, fan seat booking and simulated payment, retained QR tickets, cancellation, all administrator tabs, event edits retained after reload, registration, saved wishlists, and simulated password recovery. Frontend lint, types, formatting and the Pages production build pass. These checks validate browser-local demo behavior; they do not imply shared inventory or secure server authentication. See DEPLOYMENT.md.

Install the requirements in backend/requirements-dev.txt and run npm ci --prefix frontend. Install Chromium once with:

    npm --prefix frontend exec -- playwright install chromium

Then run:

    npm run check
    npm test
    npm run smoke

The API and browser suites use temporary databases, preserving the presentation database. Browser testing uses port 8011, screenshots/traces stay in ignored test-results directories, and the production frontend is rebuilt before the full npm test command.

## Limits

This validates the college-demo flows listed above, not every possible input or browser. Firefox, Safari, real devices, sustained load testing, and a production security audit were not run. Payments, refunds, reset-email delivery, and QR entry scanning remain intentionally simulated or absent. The PDF check verifies the print-button action; it does not certify PDF layout or printer output. No critical defect was reproduced in the checked scope; the high-severity findings above are covered by regression tests.

After pulling in backend changes, stop an already-running presentation server with Ctrl+C and restart it with npm start so the new API code is loaded. Refresh the browser to use the rebuilt frontend.
