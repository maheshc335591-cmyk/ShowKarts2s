# GitHub Pages demo

Public URL: https://showkarts2s.github.io/

The Pages workflow builds the frontend with `VITE_DEMO_MODE=true`. The Python backend remains available for local use; Pages uses a separate browser adapter. Accounts, password verifiers, event edits, wishlists, and bookings are stored in this browser's local storage. The active demo session is stored in session storage. Clearing site data resets the sample catalogue and demo accounts. Data is not shared between visitors, devices, or browser profiles. Client-side administrator controls are presentation controls, not a security boundary. Use sample personal details and disposable passwords. Payments and QR entry are simulations.

Hash routes keep refreshed links working on static hosting, for example `/ShowKarts2s/#/explore`. All bundled images and the favicon support project subpaths. The workflow obtains the base path from GitHub Pages settings, so a configured custom domain can use the root path.

Every push to main triggers `.github/workflows/pages.yml`. Check the repository Actions tab for deployment progress. GitHub Pages is not a 30-day trial; availability follows GitHub's current plan and usage limits.

To use a custom domain, first purchase or otherwise own the exact domain. Verify it in GitHub account settings, add it under repository Settings > Pages > Custom domain, and configure the DNS records shown in GitHub's official instructions. Do not add an unowned or placeholder domain. A custom domain is optional; the github.io URL already uses HTTPS.

For a local Pages build in PowerShell:

```powershell
$env:VITE_DEMO_MODE='true'
$env:VITE_BASE_PATH='/ShowKarts2s/'
npm run build
$env:PAGES_TEST='true'
npm run test:e2e
```

Unset those environment variables before building the Python-backed version. The Pages tests run against a static preview without a backend. They check route reloads, assets, fan booking/payment/tickets/cancellation, and administrator navigation.
