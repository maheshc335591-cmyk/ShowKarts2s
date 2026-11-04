# ShowKart college demonstration

## Start the prototype

Double-click **Start-ShowKart.cmd** in this folder. It opens http://127.0.0.1:8001 in your browser. Keep the server terminal open while presenting. Press Ctrl+C in that terminal when finished.

The frontend, API, fonts, and ten sample images are local. No payment, database, hosting, or email account is required. Maps and external social/artist links still need internet. Payments, refunds, and email verification are simulations.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@showkart.in | Customer@123 |
| Administrator | admin@showkart.in | Admin@123 |

The login page also has **Fan demo** and **Admin demo** buttons. You can register a new local customer account. Use fictional information for your demonstration.

## Suggested 5-minute presentation

1. Explain: "ShowKart is a concert discovery and ticket booking college prototype. It demonstrates the customer journey and event administration. Payments are simulated."
2. Open **Explore Concerts**. Search for an artist and filter by city, genre, date, or price.
3. Open an event and explain the five seat categories. Sign in using **Fan demo**.
4. Select two seats, then **Hold seats & proceed**. The hold lasts ten minutes and prevents another booking from claiming those seats.
5. Apply **SHOWCOLLEGE** (15% off, subject to the displayed minimum and cap). Show the price summary.
6. Choose UPI, enter a fictional value such as demo@upi, and pay. No external payment service is contacted.
7. Show the QR e-ticket. **Download PDF** opens the browser print dialog; choose **Save as PDF** if needed. This prototype displays QR tickets; it does not include an entrance scanner or one-time redemption system.
8. Open **My Dashboard** to show bookings, notifications, favourites, and profile. Cancellation demonstrates a simulated refund and releases the seats.
9. Log out, use **Admin demo**, and show sales statistics, bookings, customers, and event/artist editing.
10. Optional: start another booking and use **Simulate a failed payment (demo)**. Explain that seats are released and no money moves.

Sample dates are set in the future when the database is first created. Changes persist in backend/showkart.sqlite3 between restarts. Keep a copy of that file if moving the project after entering demonstration data.

## What to say about the tools

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Query.
- Backend: Python, FastAPI, Uvicorn.
- Storage: local SQLite; no cloud database account.
- QR display: qrcode.react.
- Limitations: fictional listings, simulated financial/email flows, no entrance scanner, and local single-computer hosting.

## Validation completed

Production frontend compilation and backend syntax checks pass. An isolated API smoke check covers authentication, booking ownership, concurrent seat conflicts, expired holds, coupons, payment success/failure, QR creation, cancellation, admin changes, and SQLite storage.