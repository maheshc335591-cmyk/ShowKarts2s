"""API regressions run against disposable SQLite data, never the demo database."""

import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import server


class APIRegressionTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        folder = self.stack.enter_context(tempfile.TemporaryDirectory(prefix="showkart-api-"))
        self.stack.enter_context(patch.object(server, "DB_PATH", Path(folder) / "api.sqlite3"))
        self.customer = self.client()
        self.admin = self.client()
        self.other = self.client()
        self.login(self.customer, "customer@showkart.in", "Customer@123")
        self.login(self.admin, "admin@showkart.in", "Admin@123")
        response = self.other.post(
            "/api/auth/register",
            json={
                "full_name": "Other Fan",
                "email": "other@example.com",
                "mobile": "9876543210",
                "password": "Other@123",
                "confirm_password": "Other@123",
                "role": "admin",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "customer")

    def client(self):
        return self.stack.enter_context(TestClient(server.app, raise_server_exceptions=False))

    def login(self, client, email, password):
        response = client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)

    def hold(self, client=None, seats=None):
        response = (client or self.customer).post(
            "/api/bookings/hold", json={"concert_id": "c6", "seats": seats or ["J1"]}
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_checkout_rejects_event_started_after_hold(self):
        booking = self.hold()
        with server.store() as state:
            state["concerts"]["c6"]["date"] = (server.now() - timedelta(seconds=1)).isoformat()
        response = self.customer.post(f"/api/bookings/{booking['id']}/pay", json={"method": "upi"})
        self.assertEqual(response.status_code, 409, response.text)
        result = self.customer.get(f"/api/bookings/{booking['id']}").json()
        self.assertNotEqual(result["status"], "confirmed")
        self.assertEqual(result["tickets"], [])

    def test_rescheduling_updates_active_booking_details(self):
        booking = self.hold()
        self.customer.post(f"/api/bookings/{booking['id']}/pay", json={"method": "upi"})
        concert = self.admin.get("/api/concerts/c6").json()
        concert.update(
            title="Rescheduled show",
            venue_name="New auditorium",
            city="Pune",
            date=(server.now() + timedelta(days=50)).isoformat(),
        )
        response = self.admin.patch("/api/admin/concerts/c6", json=concert)
        self.assertEqual(response.status_code, 200, response.text)
        result = self.customer.get(f"/api/bookings/{booking['id']}").json()
        for booking_key, concert_key in [
            ("concert_title", "title"),
            ("venue_name", "venue_name"),
            ("city", "city"),
            ("date", "date"),
        ]:
            self.assertEqual(result[booking_key], response.json()[concert_key])
        self.assertTrue(
            any(n["type"] == "event_update" for n in self.customer.get("/api/notifications").json())
        )

    def test_admin_cannot_move_an_active_event_into_the_past(self):
        self.hold()
        concert = self.admin.get("/api/concerts/c6").json()
        concert["date"] = (server.now() - timedelta(days=1)).isoformat()
        response = self.admin.patch("/api/admin/concerts/c6", json=concert)
        self.assertGreaterEqual(response.status_code, 400, response.text)
        self.assertLess(response.status_code, 500)

    def test_booking_ownership_for_read_pay_coupon_and_cancel(self):
        booking = self.hold()
        path = f"/api/bookings/{booking['id']}"
        self.assertEqual(self.other.get(path).status_code, 404)
        for suffix, body in [
            ("pay", {"method": "upi"}),
            ("coupon", {"code": "SHOWCOLLEGE"}),
            ("cancel", None),
        ]:
            self.assertEqual(self.other.post(path + "/" + suffix, json=body).status_code, 404)
        self.assertEqual(self.customer.get(path).json()["status"], "pending")

    def test_admin_routes_are_protected(self):
        anonymous = self.client()
        for path in ["stats", "concerts", "bookings", "customers"]:
            self.assertEqual(anonymous.get("/api/admin/" + path).status_code, 401)
            self.assertEqual(self.customer.get("/api/admin/" + path).status_code, 403)
        artist = {"name": "Forbidden artist", "genre": "College"}
        self.assertEqual(self.customer.post("/api/admin/artists", json=artist).status_code, 403)
        self.assertEqual(self.customer.delete("/api/admin/concerts/c6").status_code, 403)

    def test_concurrent_holds_allocate_a_seat_once(self):
        def reserve(index):
            client = self.customer if index % 2 else self.other
            return client.post(
                "/api/bookings/hold", json={"concert_id": "c6", "seats": ["J1"]}
            ).status_code

        with ThreadPoolExecutor(max_workers=8) as pool:
            statuses = list(pool.map(reserve, range(8)))
        self.assertEqual(statuses.count(200), 1, statuses)
        self.assertEqual(statuses.count(409), 7, statuses)

    def test_concurrent_payment_retries_do_not_duplicate_tickets_or_revenue(self):
        booking = self.hold(seats=["J1", "J2"])

        def pay(_):
            response = self.customer.post(
                f"/api/bookings/{booking['id']}/pay", json={"method": "upi"}
            )
            self.assertEqual(response.status_code, 200)
            return response.json()["booking"]

        with ThreadPoolExecutor(max_workers=6) as pool:
            results = list(pool.map(pay, range(6)))
        self.assertEqual(len({b["payment_txn"] for b in results}), 1)
        self.assertTrue(all(b["tickets"] == results[0]["tickets"] for b in results))
        stats = self.admin.get("/api/admin/stats").json()
        self.assertEqual(stats["payments_count"], 1)
        self.assertEqual(stats["tickets_sold"], 2)

    def test_expired_holds_cannot_be_paid(self):
        booking = self.hold()
        with server.store() as state:
            state["bookings"][booking["id"]]["hold_expires_at"] = "2000-01-01T00:00:00+00:00"
        response = self.customer.post(f"/api/bookings/{booking['id']}/pay", json={"method": "upi"})
        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            self.customer.get(f"/api/bookings/{booking['id']}").json()["status"], "failed"
        )
        self.hold(self.other)

    def test_client_cannot_override_prices(self):
        response = self.customer.post(
            "/api/bookings/hold",
            json={
                "concert_id": "c6",
                "seats": ["J1"],
                "subtotal": 0,
                "total": 0,
                "discount": 999999,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["subtotal"], 499)
        self.assertGreater(response.json()["total"], 499)
        self.assertEqual(response.json()["discount"], 0)

    def test_invalid_seats_and_over_limit_bookings(self):
        for seats, status in [
            (["no-seat"], 400),
            (["J1", "J1"], 400),
            ([], 422),
            ([f"J{i}" for i in range(1, 12)], 422),
        ]:
            response = self.customer.post(
                "/api/bookings/hold", json={"concert_id": "c6", "seats": seats}
            )
            self.assertEqual(response.status_code, status)

    def test_cannot_remove_active_inventory_or_delete_booked_event(self):
        self.hold()
        before = self.admin.get("/api/concerts/c6").json()
        response = self.admin.patch(
            "/api/admin/concerts/c6/categories",
            json=[{"key": "general", "price": 499, "quantity": 0}],
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            self.admin.get("/api/concerts/c6").json()["categories"], before["categories"]
        )
        self.assertEqual(self.admin.delete("/api/admin/concerts/c6").status_code, 409)

    def test_unicode_reset_code_is_a_validation_error_not_server_crash(self):
        response = self.customer.post(
            "/api/auth/forgot-password", json={"email": "customer@showkart.in"}
        )
        self.assertEqual(response.status_code, 200)
        response = self.customer.post(
            "/api/auth/reset-password",
            json={"email": "customer@showkart.in", "code": "éééééé", "new_password": "Changed@123"},
        )
        self.assertGreaterEqual(response.status_code, 400)
        self.assertLess(response.status_code, 500, response.text)

    def test_nonfinite_coupon_amount_is_rejected_without_server_crash(self):
        response = self.customer.post(
            "/api/coupons/validate",
            content='{"code":"SHOWCOLLEGE","subtotal":1e400}',
            headers={"Content-Type": "application/json"},
        )
        self.assertGreaterEqual(response.status_code, 400)
        self.assertLess(response.status_code, 500, response.text)

    def test_blank_names_are_rejected(self):
        response = self.customer.patch(
            "/api/auth/profile", json={"full_name": "   ", "mobile": "9876543210"}
        )
        self.assertGreaterEqual(response.status_code, 400, response.text)
        self.assertLess(response.status_code, 500)

    def test_missing_static_assets_return_404_not_html(self):
        for path in ["/assets/no-such-build.js", "/demo-media/missing.jpg"]:
            response = self.customer.get(path)
            self.assertEqual(response.status_code, 404, (path, response.text[:100]))
        self.assertEqual(self.customer.get("/explore").status_code, 200)

    def test_static_traversal_cannot_read_backend_source(self):
        response = self.customer.get("/%2E%2E/backend/server.py")
        self.assertNotIn("from fastapi import", response.text)

    def test_password_change_revokes_other_sessions(self):
        second = self.client()
        self.login(second, "customer@showkart.in", "Customer@123")
        response = self.customer.post(
            "/api/auth/change-password",
            json={"current_password": "Customer@123", "new_password": "Updated@123"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(second.get("/api/auth/me").json())
        self.assertIsNotNone(self.customer.get("/api/auth/me").json())

    def test_artist_rename_updates_active_ticket_details(self):
        booking = self.hold()
        self.customer.post(f"/api/bookings/{booking['id']}/pay", json={"method": "upi"})
        artist = self.admin.get("/api/artists/a9").json()
        artist["name"] = "Renamed performer"
        result = self.admin.patch("/api/admin/artists/a9", json=artist)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(
            self.customer.get(f"/api/bookings/{booking['id']}").json()["artist_name"],
            "Renamed performer",
        )

    def test_untrusted_origins_cannot_change_state(self):
        response = self.customer.post(
            "/api/auth/logout", headers={"Origin": "https://untrusted.example"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIsNotNone(self.customer.get("/api/auth/me").json())


if __name__ == "__main__":
    unittest.main()
