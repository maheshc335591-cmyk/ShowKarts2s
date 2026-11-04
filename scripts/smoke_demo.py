"""API smoke checks using a temporary database, separate from presentation data."""

import json
import os
import socket
import sqlite3
import sys
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

import uvicorn

ROOT = Path(__file__).resolve().parent.parent


def check():
    with tempfile.TemporaryDirectory(prefix="showkart-smoke-") as tmp:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        dbpath = str(Path(tmp) / "smoke.sqlite3")
        os.environ["SHOWKART_DB"] = dbpath
        sys.path.insert(0, str(ROOT))
        from backend.server import app

        server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="error"))
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{port}"

        def client():
            opener = build_opener(HTTPCookieProcessor(CookieJar()))

            def call(method, path, body=None, expected=200, headers=None) -> Any:
                req = Request(
                    base + path,
                    data=json.dumps(body).encode() if body is not None else None,
                    method=method,
                    headers={"Content-Type": "application/json", **(headers or {})},
                )
                try:
                    with opener.open(req, timeout=20) as r:
                        status = r.status
                        raw = r.read()
                except HTTPError as e:
                    status = e.code
                    raw = e.read()
                assert status == expected, (method, path, status, raw[:500])
                return json.loads(raw) if raw else None

            return call

        try:
            anon = client()
            for _ in range(100):
                try:
                    anon("GET", "/api/health")
                    break
                except URLError:
                    if not thread.is_alive():
                        raise RuntimeError("Smoke server exited")
                    time.sleep(0.1)
            else:
                raise RuntimeError("Smoke server did not start")
            assert anon("GET", "/api/auth/me") is None
            anon("GET", "/api/bookings/mine", expected=401)
            anon(
                "POST",
                "/api/auth/login",
                {"email": "customer@showkart.in", "password": "wrong"},
                401,
            )
            catalogue = anon("GET", "/api/concerts")
            assert len(catalogue) == 11
            c = catalogue[0]
            assert len(anon("GET", "/api/artists")) == 10
            anon("GET", "/api/concerts/meta")
            assert all(
                x["city"] == c["city"] for x in anon("GET", "/api/concerts?city=" + c["city"])
            )
            alice, bob, admin = client(), client(), client()
            alice(
                "POST",
                "/api/auth/login",
                {"email": "customer@showkart.in", "password": "Customer@123"},
            )
            bob(
                "POST",
                "/api/auth/register",
                {
                    "email": "smoke@example.com",
                    "full_name": "Smoke Fan",
                    "mobile": "9876543210",
                    "password": "Smoke@123",
                    "confirm_password": "Smoke@123",
                },
            )
            admin(
                "POST",
                "/api/auth/login",
                {"email": "admin@showkart.in", "password": "Admin@123"},
            )
            alice("GET", "/api/admin/stats", expected=403)
            alice("POST", "/api/newsletter", {"email": "invalid"}, 422)
            anon(
                "POST",
                "/api/auth/logout",
                expected=403,
                headers={"Origin": "https://untrusted.example"},
            )
            seatmap = alice("GET", f"/api/concerts/{c['id']}/seats")
            seats = [x["id"] for z in seatmap["zones"] for row in z["rows"] for x in row["seats"]]
            alice(
                "POST",
                "/api/bookings/hold",
                {"concert_id": c["id"], "seats": [seats[0], seats[0]]},
                400,
            )
            b = alice(
                "POST",
                "/api/bookings/hold",
                {"concert_id": c["id"], "seats": seats[:2]},
            )
            bob("GET", f"/api/bookings/{b['id']}", expected=404)
            bob(
                "POST",
                "/api/bookings/hold",
                {"concert_id": c["id"], "seats": [seats[0]]},
                409,
            )
            discounted = alice("POST", f"/api/bookings/{b['id']}/coupon", {"code": "SHOWCOLLEGE"})
            assert discounted["discount"] > 0 and discounted["total"] < b["total"]
            paid = alice("POST", f"/api/bookings/{b['id']}/pay", {"method": "upi"})["booking"]
            assert paid["status"] == "confirmed" and len(paid["tickets"]) == 2
            assert len({t["qr_token"] for t in paid["tickets"]}) == 2
            repeat = alice("POST", f"/api/bookings/{b['id']}/pay", {"method": "upi"})["booking"]
            assert repeat["payment_txn"] == paid["payment_txn"]
            assert admin("GET", "/api/admin/stats")["tickets_sold"] == 2
            assert alice("GET", "/api/notifications")
            alice("POST", "/api/notifications/mark-read")
            assert all(n["read"] for n in alice("GET", "/api/notifications"))
            a = anon("GET", "/api/artists")[0]
            alice("POST", "/api/wishlist", {"item_type": "artist", "item_id": a["id"]})
            assert len(alice("GET", "/api/wishlist")) == 1
            assert not alice("POST", "/api/wishlist", {"item_type": "artist", "item_id": a["id"]})[
                "in_wishlist"
            ]
            cancelled = alice("POST", f"/api/bookings/{b['id']}/cancel")
            assert cancelled["status"] == "cancelled" and not cancelled["tickets"]
            freed = bob(
                "POST",
                "/api/bookings/hold",
                {"concert_id": c["id"], "seats": [seats[0]]},
            )
            bob(
                "POST",
                f"/api/bookings/{freed['id']}/pay",
                {"method": "upi", "simulate_failure": True},
                402,
            )
            assert bob("GET", f"/api/bookings/{freed['id']}")["status"] == "failed"
            expired = alice(
                "POST",
                "/api/bookings/hold",
                {"concert_id": c["id"], "seats": [seats[0]]},
            )
            with closing(sqlite3.connect(dbpath)) as db:
                s = json.loads(db.execute("SELECT data FROM demo_state WHERE id=1").fetchone()[0])
                s["bookings"][expired["id"]]["hold_expires_at"] = "2000-01-01T00:00:00+00:00"
                db.execute("UPDATE demo_state SET data=? WHERE id=1", (json.dumps(s),))
                db.commit()
            alice("POST", f"/api/bookings/{expired['id']}/pay", {"method": "upi"}, 409)
            assert alice("GET", f"/api/bookings/{expired['id']}")["status"] == "failed"

            def race(call):
                try:
                    call(
                        "POST",
                        "/api/bookings/hold",
                        {"concert_id": c["id"], "seats": [seats[0]]},
                    )
                    return "won"
                except AssertionError as e:
                    assert e.args[0][2] == 409, e
                    return "conflict"

            with ThreadPoolExecutor(max_workers=2) as pool:
                assert sorted(pool.map(race, [alice, bob])) == ["conflict", "won"]
            artist = admin(
                "POST",
                "/api/admin/artists",
                {"name": "Demo Artist", "genre": "College"},
            )
            new = admin(
                "POST",
                "/api/admin/concerts",
                {
                    "title": "Campus Demo Show",
                    "artist_id": artist["id"],
                    "venue_name": "College Auditorium",
                    "city": "Bengaluru",
                    "date": "2099-01-01T12:30:00Z",
                },
            )
            cat = new["categories"][0]
            admin(
                "PATCH",
                f"/api/admin/concerts/{new['id']}/categories",
                [{"key": cat["key"], "price": 799, "quantity": cat["quantity"]}],
            )
            admin("DELETE", f"/api/admin/concerts/{new['id']}")
            admin("DELETE", f"/api/admin/artists/{artist['id']}")
            assert len(admin("GET", "/api/admin/bookings")) >= 3
            assert len(admin("GET", "/api/admin/customers")) == 2
            bob(
                "PATCH",
                "/api/auth/profile",
                {"full_name": "Updated Fan", "mobile": "9876543210"},
            )
            code = bob("POST", "/api/auth/forgot-password", {"email": "smoke@example.com"})[
                "simulated_code"
            ]
            bob(
                "POST",
                "/api/auth/reset-password",
                {
                    "email": "smoke@example.com",
                    "code": code,
                    "new_password": "Updated@123",
                },
            )
            assert bob("GET", "/api/auth/me") is None
            bob(
                "POST",
                "/api/auth/login",
                {"email": "smoke@example.com", "password": "Updated@123"},
            )
            bob(
                "POST",
                "/api/auth/change-password",
                {"current_password": "Updated@123", "new_password": "Final@123"},
            )
            bob("POST", "/api/auth/logout")
            assert bob("GET", "/api/auth/me") is None
            with closing(sqlite3.connect(dbpath)) as db:
                saved = json.loads(
                    db.execute("SELECT data FROM demo_state WHERE id=1").fetchone()[0]
                )
                assert saved["bookings"][paid["id"]]["status"] == "cancelled"
            print(
                "PASS: catalogue, login/register, roles, ownership, validation, coupons, double-booking/race protection, expiry, simulated payments, QR tickets, cancellation/refund, wishlist, notifications, admin CRUD, profile, password reset/change, logout, SQLite persistence."
            )
            print("Smoke checks used a temporary isolated database; presentation data unchanged.")
        finally:
            server.should_exit = True
            thread.join(timeout=10)


if __name__ == "__main__":
    check()
