"""Local concert booking API. Payments and reset emails are simulations."""

import hashlib
import hmac
import json
import math
import os
import secrets
import sqlite3
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any, Literal, NoReturn, overload

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, StringConstraints

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("SHOWKART_DB", str(ROOT / "backend" / "showkart.sqlite3")))
app = FastAPI(title="ShowKart college demo", version="1.0.0")
MEDIA_PATH = ROOT / "frontend" / "public" / "demo-media" / "map.json"
MEDIA_MAP = json.loads(MEDIA_PATH.read_text(encoding="utf-8")) if MEDIA_PATH.exists() else {}
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv(
        "SHOWKART_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8001,http://127.0.0.1:8001",
    ).split(",")
    if origin.strip()
}


DisplayName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError):
    # Never echo rejected passwords or non-JSON numeric values such as infinity.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {key: item[key] for key in ("loc", "msg", "type")} for item in error.errors()
            ]
        },
    )


def now():
    return datetime.now(timezone.utc)


def stamp():
    return now().isoformat()


def uid(prefix=""):
    return prefix + secrets.token_hex(8)


def fail(message: str, status: int = 400) -> NoReturn:
    raise HTTPException(status, message)


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180000).hex()
    return salt + ":" + digest


def password_ok(password, stored):
    return hmac.compare_digest(password_hash(password, stored.split(":")[0]), stored)


def public_user(u):
    return {k: v for k, v in u.items() if k != "password_hash"}


def seed() -> dict[str, Any]:
    data = ROOT / "backend" / "data"
    concerts = json.loads((data / "concerts.json").read_text(encoding="utf-8-sig"))
    artists = json.loads((data / "artists.json").read_text(encoding="utf-8-sig"))
    meta = json.loads((data / "meta.json").read_text(encoding="utf-8-sig"))
    for i, c in enumerate(concerts):
        # Relative dates keep the sample events usable on presentation day.
        c["date"] = (
            (now() + timedelta(days=7 + i * 3))
            .replace(hour=13, minute=30, second=0, microsecond=0)
            .isoformat()
        )
        c["reviews"] = []
        c["is_sample"] = True
    users = {}
    for name, email, password, role in [
        ("Demo Fan", "customer@showkart.in", "Customer@123", "customer"),
        ("Demo Administrator", "admin@showkart.in", "Admin@123", "admin"),
    ]:
        u = dict(
            id=uid("u"),
            full_name=name,
            email=email,
            mobile="9999999999",
            role=role,
            created_at=stamp(),
            password_hash=password_hash(password),
        )
        users[u["id"]] = u
    return dict(
        users=users,
        concerts={c["id"]: c for c in concerts},
        artists={a["id"]: a for a in artists},
        coupons=meta["coupons"],
        bookings={},
        sessions={},
        resets={},
        wishlist=[],
        notifications=[],
        newsletter=[],
    )


@contextmanager
def store():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=20, check_same_thread=False)
    try:
        db.execute(
            "CREATE TABLE IF NOT EXISTS demo_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)"
        )
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT data FROM demo_state WHERE id=1").fetchone()
        s = json.loads(row[0]) if row else seed()
        for b in s["bookings"].values():
            c = s["concerts"].get(b["concert_id"])
            if b["status"] == "pending" and (
                datetime.fromisoformat(b["hold_expires_at"]) <= now()
                or not c
                or datetime.fromisoformat(c["date"]) <= now()
            ):
                b["status"] = "failed"
                b["hold_expires_at"] = None
        yield s
        db.execute("INSERT OR REPLACE INTO demo_state(id,data) VALUES(1,?)", (json.dumps(s),))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def state_dep():
    with store() as s:
        yield s


State = Depends(state_dep, scope="function")


@overload
def current(
    request: Request, s: dict[str, Any], required: Literal[True] = True, admin: bool = False
) -> dict[str, Any]: ...


@overload
def current(
    request: Request, s: dict[str, Any], required: Literal[False], admin: bool = False
) -> dict[str, Any] | None: ...


def current(
    request: Request, s: dict[str, Any], required: bool = True, admin: bool = False
) -> dict[str, Any] | None:
    token = request.cookies.get("showkart_session", "")
    session = s["sessions"].get(hashlib.sha256(token.encode()).hexdigest())
    u = (
        s["users"].get(session["user_id"])
        if session and datetime.fromisoformat(session["expires"]) > now()
        else None
    )
    if required and not u:
        fail("Please log in to continue", 401)
    if admin and (not u or u["role"] != "admin"):
        fail("Administrator access required", 403)
    return u


def login_cookie(response, s, u):
    token = secrets.token_urlsafe(32)
    s["sessions"][hashlib.sha256(token.encode()).hexdigest()] = dict(
        user_id=u["id"], expires=(now() + timedelta(days=2)).isoformat()
    )
    response.set_cookie(
        "showkart_session",
        token,
        httponly=True,
        samesite="lax",
        max_age=172800,
        path="/",
    )


def find(s, kind, key):
    value = s[kind].get(key)
    if not value:
        fail("Not found", 404)
    return value


def seats_for(c: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for cat in c["categories"]:
        layout = [(row, i) for row in cat["rows"] for i in range(1, cat["seats_per_row"] + 1)]
        for row, i in layout[: cat["quantity"]]:
            result.append(
                dict(
                    seat_id=f"{row}{i}",
                    category_key=cat["key"],
                    category_name=cat["name"],
                    price=cat["price"],
                    row=row,
                )
            )
    return result


def occupied(s, concert_id, exclude=None):
    return {
        x["seat_id"]
        for b in s["bookings"].values()
        if b["concert_id"] == concert_id
        and b["id"] != exclude
        and b["status"] in ("pending", "confirmed")
        for x in b["seats"]
    }


def concert_view(s, c):
    result = deepcopy(c)
    result["poster_url"] = MEDIA_MAP.get(c.get("poster_url"), c.get("poster_url", ""))
    seats = seats_for(c)
    result.update(
        total_seats=len(seats),
        available_count=len(seats) - len(occupied(s, c["id"])),
        booked=sum(
            len(b["seats"])
            for b in s["bookings"].values()
            if b["concert_id"] == c["id"] and b["status"] == "confirmed"
        ),
        min_price=min((cat["price"] for cat in c["categories"]), default=0),
        is_past=datetime.fromisoformat(c["date"]) <= now(),
    )
    result["artist_name"] = (
        s["artists"].get(c["artist_id"], {}).get("name", c.get("artist_name", "Artist"))
    )
    reviews = c.get("reviews", [])
    result["rating_avg"] = (
        round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else None
    )
    return result


def artist_view(s, a, detail=False):
    result = deepcopy(a)
    result["image_url"] = MEDIA_MAP.get(a.get("image_url"), a.get("image_url", ""))
    concerts = [concert_view(s, c) for c in s["concerts"].values() if c["artist_id"] == a["id"]]
    result["concert_count"] = sum(not c["is_past"] for c in concerts)
    if detail:
        result["concerts"] = concerts
    return result


def notification(s, user_id, title, message, kind="booking"):
    s["notifications"].append(
        dict(
            id=uid("n"),
            user_id=user_id,
            type=kind,
            title=title,
            message=message,
            read=False,
            created_at=stamp(),
        )
    )


def sync_event_bookings(s, c):
    """Keep active tickets aligned with event details without changing paid prices."""
    view = concert_view(s, c)
    details = {
        "concert_title": c["title"],
        "artist_name": view["artist_name"],
        "poster_url": view["poster_url"],
        "venue_name": c["venue_name"],
        "city": c["city"],
        "date": c["date"],
    }
    for b in s["bookings"].values():
        if b["concert_id"] == c["id"] and b["status"] in ("pending", "confirmed"):
            if any(b.get(key) != value for key, value in details.items()):
                b.update(details)
                notification(
                    s,
                    b["user_id"],
                    "Event details updated",
                    f"Details for {b['ref']} changed. Open your booking for the latest time and venue.",
                    kind="event_update",
                )


def booking_for(request, s, booking_id):
    u = current(request, s)
    b = find(s, "bookings", booking_id)
    if b["user_id"] != u["id"] and u["role"] != "admin":
        fail("Not found", 404)
    return b


def pending(b):
    if b["status"] != "pending":
        fail("This booking is no longer pending", 409)


def round_money(n):
    return math.floor(n + 0.5)


def totals(b):
    b["fee"] = round_money(b["subtotal"] * 0.03)
    b["tax"] = round_money((b["subtotal"] - b["discount"] + b["fee"]) * 0.18)
    b["total"] = b["subtotal"] - b["discount"] + b["fee"] + b["tax"]


def coupon_check(s, code, subtotal):
    c = next((c for c in s["coupons"] if c["code"] == code.strip().upper()), None)
    if not c or subtotal < c["min_amount"]:
        fail("Invalid coupon or minimum ticket amount not met")
    discount = round_money(subtotal * c["value"] / 100) if c["type"] == "percent" else c["value"]
    discount = min(subtotal, discount, c.get("cap") or subtotal)
    return dict(
        valid=True,
        code=c["code"],
        discount=discount,
        message=f"Coupon applied: save INR {discount}",
    )


@app.middleware("http")
async def local_write_guard(request: Request, call_next):
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin and origin not in ALLOWED_ORIGINS:
            return JSONResponse({"detail": "Untrusted request origin"}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


class Login(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=1, max_length=256)


class Register(Login):
    full_name: DisplayName
    mobile: str = Field(min_length=8, max_length=20)
    confirm_password: str


class Profile(BaseModel):
    full_name: DisplayName
    mobile: str = Field(min_length=8, max_length=20)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=256)


class EmailInput(BaseModel):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class Reset(EmailInput):
    code: str = Field(pattern=r"^[0-9]{6}$")
    new_password: str = Field(min_length=8, max_length=256)


@app.get("/api/health")
def health(s=State):
    return {"status": "ok", "mode": "college-demo", "database": "sqlite"}


@app.get("/api/auth/me")
def me(request: Request, s=State):
    u = current(request, s, required=False)
    return public_user(u) if u else None


@app.post("/api/auth/login")
def login(body: Login, response: Response, s=State):
    u = next(
        (u for u in s["users"].values() if u["email"] == body.email.strip().lower()),
        None,
    )
    if not u or not password_ok(body.password, u["password_hash"]):
        fail("Email or password is incorrect", 401)
    login_cookie(response, s, u)
    return public_user(u)


@app.post("/api/auth/register")
def register(body: Register, response: Response, s=State):
    if len(body.password) < 8 or body.password != body.confirm_password:
        fail("Use a password of at least 8 characters and match both passwords")
    email = body.email.strip().lower()
    if any(u["email"] == email for u in s["users"].values()):
        fail("That email is already registered", 409)
    u = dict(
        id=uid("u"),
        full_name=body.full_name.strip(),
        email=email,
        mobile=body.mobile,
        role="customer",
        created_at=stamp(),
        password_hash=password_hash(body.password),
    )
    s["users"][u["id"]] = u
    login_cookie(response, s, u)
    return public_user(u)


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, s=State):
    key = hashlib.sha256(request.cookies.get("showkart_session", "").encode()).hexdigest()
    s["sessions"].pop(key, None)
    response.delete_cookie("showkart_session", path="/")
    return {"message": "Logged out"}


@app.patch("/api/auth/profile")
def profile(body: Profile, request: Request, s=State):
    u = current(request, s)
    u.update(body.model_dump())
    return public_user(u)


@app.post("/api/auth/change-password")
def change_password(body: PasswordChange, request: Request, s=State):
    u = current(request, s)
    if not password_ok(body.current_password, u["password_hash"]):
        fail("Current password is incorrect")
    u["password_hash"] = password_hash(body.new_password)
    s["sessions"] = {
        k: v
        for k, v in s["sessions"].items()
        if v["user_id"] != u["id"]
        or k == hashlib.sha256(request.cookies.get("showkart_session", "").encode()).hexdigest()
    }
    return {"message": "Password changed"}


@app.post("/api/auth/forgot-password")
def forgot(body: EmailInput, s=State):
    email = body.email.strip().lower()
    code = f"{secrets.randbelow(1000000):06}"
    exists = any(u["email"] == email for u in s["users"].values())
    if exists:
        s["resets"][email] = dict(
            code=code, expires=(now() + timedelta(minutes=10)).isoformat(), attempts=0
        )
    return {
        "message": "Demo only: reset code is displayed here, no email is sent.",
        "simulated_code": code if exists else None,
    }


@app.post("/api/auth/reset-password")
def reset(body: Reset, s=State):
    email = body.email.strip().lower()
    r = s["resets"].get(email)
    if (
        not r
        or datetime.fromisoformat(r["expires"]) <= now()
        or not hmac.compare_digest(r["code"], body.code)
    ):
        fail("Invalid or expired reset code")
    u = next(u for u in s["users"].values() if u["email"] == email)
    u["password_hash"] = password_hash(body.new_password)
    s["sessions"] = {k: v for k, v in s["sessions"].items() if v["user_id"] != u["id"]}
    del s["resets"][email]
    return {"message": "Password reset. Please log in."}


@app.get("/api/concerts/meta")
def meta(s=State):
    return dict(
        cities=sorted({c["city"] for c in s["concerts"].values()}),
        genres=sorted({c["genre"] for c in s["concerts"].values()}),
        coupons=s["coupons"],
    )


@app.get("/api/concerts")
def concerts(
    q: str = "",
    city: str = "",
    genre: str = "",
    max_price: float | None = Query(default=None, ge=0, allow_inf_nan=False),
    available_only: bool = False,
    sort: str = "popularity",
    s=State,
):
    values = [concert_view(s, c) for c in s["concerts"].values()]
    values = [
        c
        for c in values
        if not c["is_past"]
        and (
            not q
            or q.lower()
            in " ".join(
                str(c.get(k, "")) for k in ("title", "artist_name", "city", "venue_name")
            ).lower()
        )
        and (not city or c["city"] == city)
        and (not genre or c["genre"] == genre)
        and (max_price is None or c["min_price"] <= max_price)
        and (not available_only or c["available_count"] > 0)
    ]
    if sort in ("price", "price_asc", "price_low"):
        values.sort(key=lambda c: c["min_price"])
    elif sort in ("price_desc", "price_high"):
        values.sort(key=lambda c: c["min_price"], reverse=True)
    elif sort in ("date", "date_asc"):
        values.sort(key=lambda c: c["date"])
    else:
        values.sort(key=lambda c: c["popularity"], reverse=True)
    return values


@app.get("/api/concerts/{concert_id}")
def concert(concert_id: str, s=State):
    return concert_view(s, find(s, "concerts", concert_id))


@app.get("/api/concerts/{concert_id}/seats")
def seat_map(concert_id: str, s=State):
    c = find(s, "concerts", concert_id)
    taken = occupied(s, concert_id)
    all_seats = seats_for(c)
    zones = []
    for cat in c["categories"]:
        rows = []
        for row in cat["rows"]:
            seats = [
                dict(
                    id=x["seat_id"],
                    state="booked" if x["seat_id"] in taken else "available",
                    category_key=cat["key"],
                    price=x["price"],
                )
                for x in all_seats
                if x["category_key"] == cat["key"] and x["row"] == row
            ]
            if seats:
                rows.append(dict(row=row, seats=seats))
        zones.append({**cat, "rows": rows})
    return dict(concert_id=concert_id, zones=zones)


class Review(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=2000)


@app.post("/api/concerts/{concert_id}/reviews")
def review(concert_id: str, body: Review, request: Request, s=State):
    u = current(request, s)
    c = find(s, "concerts", concert_id)
    c.setdefault("reviews", []).append(
        dict(
            id=uid("r"),
            user_name=u["full_name"],
            **body.model_dump(),
            created_at=stamp(),
        )
    )
    return {"message": "Review posted"}


@app.get("/api/artists")
def artists(s=State):
    return [artist_view(s, a) for a in s["artists"].values()]


@app.get("/api/artists/{artist_id}")
def artist(artist_id: str, s=State):
    return artist_view(s, find(s, "artists", artist_id), detail=True)


class Hold(BaseModel):
    concert_id: str
    seats: list[str] = Field(min_length=1, max_length=10)


@app.post("/api/bookings/hold")
def hold(body: Hold, request: Request, s=State):
    u = current(request, s)
    c = find(s, "concerts", body.concert_id)
    if datetime.fromisoformat(c["date"]) <= now():
        fail("This concert has already started", 409)
    if len(set(body.seats)) != len(body.seats):
        fail("Select each seat only once")
    layout = {x["seat_id"]: x for x in seats_for(c)}
    if any(x not in layout for x in body.seats):
        fail("Invalid seat selection")
    if occupied(s, c["id"]).intersection(body.seats):
        fail("Some seats were just taken. Please select available seats.", 409)
    chosen = [{k: v for k, v in layout[x].items() if k != "row"} for x in body.seats]
    b = dict(
        id=uid("b"),
        ref="SK-" + secrets.token_hex(4).upper(),
        user_id=u["id"],
        customer_name=u["full_name"],
        concert_id=c["id"],
        concert_title=c["title"],
        artist_name=concert_view(s, c)["artist_name"],
        poster_url=MEDIA_MAP.get(c["poster_url"], c["poster_url"]),
        venue_name=c["venue_name"],
        city=c["city"],
        date=c["date"],
        seats=chosen,
        subtotal=sum(x["price"] for x in chosen),
        fee=0,
        tax=0,
        discount=0,
        coupon_code=None,
        total=0,
        status="pending",
        hold_expires_at=(now() + timedelta(minutes=10)).isoformat(),
        created_at=stamp(),
        paid_at=None,
        tickets=[],
        payment_method=None,
        payment_txn=None,
        refund_status=None,
    )
    totals(b)
    s["bookings"][b["id"]] = b
    return b


@app.get("/api/bookings/mine")
def mine(request: Request, s=State):
    u = current(request, s)
    return sorted(
        [b for b in s["bookings"].values() if b["user_id"] == u["id"]],
        key=lambda b: b["created_at"],
        reverse=True,
    )


@app.get("/api/bookings/{booking_id}")
def booking(booking_id: str, request: Request, s=State):
    return booking_for(request, s, booking_id)


class Coupon(BaseModel):
    code: str | None = None


class CouponValidation(BaseModel):
    code: str
    subtotal: float = Field(ge=0, allow_inf_nan=False)


@app.post("/api/coupons/validate")
def validate_coupon(body: CouponValidation, s=State):
    return coupon_check(s, body.code, body.subtotal)


@app.post("/api/bookings/{booking_id}/coupon")
def apply_coupon(booking_id: str, body: Coupon, request: Request, s=State):
    b = booking_for(request, s, booking_id)
    pending(b)
    result = (
        coupon_check(s, body.code, b["subtotal"]) if body.code else {"code": None, "discount": 0}
    )
    b.update(coupon_code=result["code"], discount=result["discount"])
    totals(b)
    return b


class Payment(BaseModel):
    method: Literal["upi", "card", "netbanking"]
    simulate_failure: bool = False


@app.post("/api/bookings/{booking_id}/pay")
def pay(booking_id: str, body: Payment, request: Request, response: Response, s=State):
    b = booking_for(request, s, booking_id)
    if b["status"] == "confirmed":
        return {"booking": b}
    pending(b)
    concert = find(s, "concerts", b["concert_id"])
    if datetime.fromisoformat(concert["date"]) <= now():
        b.update(status="failed", hold_expires_at=None)
        response.status_code = 409
        return {"detail": "This concert has already started. Your seats were released."}
    if body.simulate_failure:
        b.update(status="failed", hold_expires_at=None)
        notification(
            s,
            b["user_id"],
            "Payment failed (demo)",
            "Your seats have been released. No money was charged.",
        )
        response.status_code = 402
        return {"detail": "Simulated payment failed. Your seats were released."}
    b.update(
        status="confirmed",
        hold_expires_at=None,
        paid_at=stamp(),
        payment_method=body.method,
        payment_txn="DEMO-" + secrets.token_hex(6).upper(),
    )
    b["tickets"] = [
        dict(**seat, ticket_id=uid("T"), qr_token=secrets.token_urlsafe(24)) for seat in b["seats"]
    ]
    notification(
        s,
        b["user_id"],
        "Booking confirmed",
        f"{b['ref']} is confirmed. Your QR tickets are ready.",
    )
    return {"booking": b}


def cancel_booking(s, b):
    if b["status"] not in ("pending", "confirmed"):
        fail("This booking cannot be cancelled", 409)
    b["refund_status"] = "Simulated refund completed" if b["status"] == "confirmed" else None
    b.update(status="cancelled", hold_expires_at=None, tickets=[])
    notification(s, b["user_id"], "Booking cancelled", f"{b['ref']} cancelled; seats released.")
    return b


@app.post("/api/bookings/{booking_id}/cancel")
def cancel(booking_id: str, request: Request, s=State):
    return cancel_booking(s, booking_for(request, s, booking_id))


class Wishlist(BaseModel):
    item_type: Literal["artist", "concert"]
    item_id: str


@app.get("/api/wishlist")
def wishlist(request: Request, s=State):
    u = current(request, s)
    result = []
    for w in s["wishlist"]:
        if w["user_id"] != u["id"]:
            continue
        item = s[w["item_type"] + "s"].get(w["item_id"])
        if item:
            result.append(
                {
                    **w,
                    w["item_type"]: artist_view(s, item)
                    if w["item_type"] == "artist"
                    else concert_view(s, item),
                }
            )
    return result


@app.post("/api/wishlist")
def toggle_wishlist(body: Wishlist, request: Request, s=State):
    u = current(request, s)
    find(s, body.item_type + "s", body.item_id)
    w = next(
        (
            w
            for w in s["wishlist"]
            if w["user_id"] == u["id"]
            and w["item_type"] == body.item_type
            and w["item_id"] == body.item_id
        ),
        None,
    )
    if w:
        s["wishlist"].remove(w)
    else:
        s["wishlist"].append(
            dict(id=uid("w"), user_id=u["id"], **body.model_dump(), created_at=stamp())
        )
    return {
        "in_wishlist": not bool(w),
        "message": "Removed from favourites" if w else "Saved to favourites",
    }


@app.get("/api/notifications")
def notifications(request: Request, s=State):
    u = current(request, s)
    return list(reversed([n for n in s["notifications"] if n["user_id"] == u["id"]]))


@app.post("/api/notifications/mark-read")
def mark_read(request: Request, s=State):
    u = current(request, s)
    for n in s["notifications"]:
        if n["user_id"] == u["id"]:
            n["read"] = True
    return {"message": "Notifications marked read"}


@app.post("/api/newsletter")
def newsletter(body: EmailInput, s=State):
    email = body.email.strip().lower()
    if email not in s["newsletter"]:
        s["newsletter"].append(email)
    return {"message": "Subscribed for this demo. No emails are sent."}


@app.get("/api/admin/concerts")
def admin_concerts(request: Request, s=State):
    current(request, s, admin=True)
    return [concert_view(s, c) for c in s["concerts"].values()]


@app.get("/api/admin/bookings")
def admin_bookings(request: Request, s=State):
    current(request, s, admin=True)
    return [
        {
            **b,
            "user_name": s["users"][b["user_id"]]["full_name"],
            "user_email": s["users"][b["user_id"]]["email"],
            "seats": [x["seat_id"] for x in b["seats"]],
            "seat_count": len(b["seats"]),
        }
        for b in reversed(list(s["bookings"].values()))
    ]


@app.get("/api/admin/customers")
def customers(request: Request, s=State):
    current(request, s, admin=True)
    return [
        {
            **public_user(u),
            "bookings_count": sum(b["user_id"] == u["id"] for b in s["bookings"].values()),
            "total_spent": sum(
                b["total"]
                for b in s["bookings"].values()
                if b["user_id"] == u["id"] and b["status"] == "confirmed"
            ),
        }
        for u in s["users"].values()
        if u["role"] == "customer"
    ]


@app.get("/api/admin/stats")
def stats(request: Request, s=State):
    current(request, s, admin=True)
    paid = [b for b in s["bookings"].values() if b["status"] == "confirmed"]
    cs = [concert_view(s, c) for c in s["concerts"].values()]
    category = {}
    for b in paid:
        for x in b["seats"]:
            category[x["category_name"]] = category.get(x["category_name"], 0) + 1
    return dict(
        revenue=sum(b["total"] for b in paid),
        payments_count=len(paid),
        tickets_sold=sum(len(b["seats"]) for b in paid),
        customers=sum(u["role"] == "customer" for u in s["users"].values()),
        total_bookings=len(s["bookings"]),
        upcoming_concerts=sum(not c["is_past"] for c in cs),
        popular_concerts=sorted(
            [dict(title=c["title"], tickets=c["booked"]) for c in cs],
            key=lambda c: c["tickets"],
            reverse=True,
        )[:5],
        category_sales=[dict(category=k, tickets=v) for k, v in category.items()],
        upcoming_events=[
            dict(
                id=c["id"],
                title=c["title"],
                city=c["city"],
                date=c["date"],
                sold=c["booked"],
                total=c["total_seats"],
            )
            for c in cs
            if not c["is_past"]
        ],
    )


class ArtistInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    genre: str = Field(min_length=1, max_length=100)
    bio: str = ""
    image_url: str = ""
    followers: str = "0"
    popular_songs: list[str] = Field(default_factory=list)
    albums: list[str] = Field(default_factory=list)
    instagram: str = ""
    spotify: str = ""
    youtube: str = ""


@app.post("/api/admin/artists")
def create_artist(body: ArtistInput, request: Request, s=State):
    current(request, s, admin=True)
    a = dict(id=uid("a"), **body.model_dump())
    s["artists"][a["id"]] = a
    return artist_view(s, a)


@app.patch("/api/admin/artists/{artist_id}")
def edit_artist(artist_id: str, body: ArtistInput, request: Request, s=State):
    current(request, s, admin=True)
    a = find(s, "artists", artist_id)
    a.update(body.model_dump())
    for c in s["concerts"].values():
        if c["artist_id"] == artist_id:
            sync_event_bookings(s, c)
    return artist_view(s, a)


@app.delete("/api/admin/artists/{artist_id}")
def delete_artist(artist_id: str, request: Request, s=State):
    current(request, s, admin=True)
    find(s, "artists", artist_id)
    if any(c["artist_id"] == artist_id for c in s["concerts"].values()):
        fail("Remove this artist's concerts first", 409)
    del s["artists"][artist_id]
    return {"message": "Artist deleted"}


class ConcertInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    artist_id: str | None = None
    venue_name: str = Field(min_length=1)
    city: str = Field(min_length=1)
    address: str = ""
    description: str = ""
    date: datetime
    genre: str = ""
    poster_url: str = ""
    popularity: int = Field(default=50, ge=0, le=100)


def concert_values(body):
    d = body.model_dump(exclude_none=True)
    d["date"] = body.date.replace(tzinfo=body.date.tzinfo or timezone.utc).isoformat()
    return d


@app.post("/api/admin/concerts")
def create_concert(body: ConcertInput, request: Request, s=State):
    current(request, s, admin=True)
    find(s, "artists", body.artist_id)
    values = concert_values(body)
    if datetime.fromisoformat(values["date"]) <= now():
        fail("Schedule new concerts in the future")
    categories = (
        deepcopy(next(iter(s["concerts"].values()))["categories"])
        if s["concerts"]
        else deepcopy(seed()["concerts"]["c6"]["categories"])
    )
    c = dict(
        id=uid("c"),
        **values,
        categories=categories,
        is_sample=True,
        reviews=[],
    )
    s["concerts"][c["id"]] = c
    return concert_view(s, c)


@app.patch("/api/admin/concerts/{concert_id}")
def edit_concert(concert_id: str, body: ConcertInput, request: Request, s=State):
    current(request, s, admin=True)
    c = find(s, "concerts", concert_id)
    if body.artist_id:
        find(s, "artists", body.artist_id)
    values = concert_values(body)
    if (
        datetime.fromisoformat(values["date"]) != datetime.fromisoformat(c["date"])
        and datetime.fromisoformat(values["date"]) <= now()
    ):
        fail("An event cannot be rescheduled into the past", 409)
    c.update(values)
    sync_event_bookings(s, c)
    return concert_view(s, c)


@app.delete("/api/admin/concerts/{concert_id}")
def delete_concert(concert_id: str, request: Request, s=State):
    current(request, s, admin=True)
    find(s, "concerts", concert_id)
    if any(
        b["concert_id"] == concert_id and b["status"] in ("confirmed", "pending")
        for b in s["bookings"].values()
    ):
        fail("Cancel active bookings before deleting the concert", 409)
    del s["concerts"][concert_id]
    return {"message": "Concert deleted"}


class CategoryInput(BaseModel):
    key: str
    price: int = Field(ge=0, le=1000000)
    quantity: int = Field(ge=0, le=1000)


@app.patch("/api/admin/concerts/{concert_id}/categories")
def categories(concert_id: str, body: list[CategoryInput], request: Request, s=State):
    current(request, s, admin=True)
    c = find(s, "concerts", concert_id)
    original = deepcopy(c)
    for change in body:
        cat = next((x for x in c["categories"] if x["key"] == change.key), None)
        if not cat:
            fail("Unknown ticket category")
        cat.update(price=change.price, quantity=change.quantity)
        required = math.ceil(change.quantity / cat["seats_per_row"])
        if required > len(cat["rows"]):
            cat["rows"].extend(
                f"{cat['key'].upper()}-{i}-" for i in range(len(cat["rows"]), required)
            )
    remaining = {x["seat_id"] for x in seats_for(c)}
    if not occupied(s, concert_id).issubset(remaining):
        c.update(original)
        fail("Inventory cannot remove booked or held seats", 409)
    return concert_view(s, c)


class StatusInput(BaseModel):
    status: Literal["cancelled"]


@app.patch("/api/admin/bookings/{booking_id}/status")
def admin_cancel(booking_id: str, body: StatusInput, request: Request, s=State):
    current(request, s, admin=True)
    return cancel_booking(s, find(s, "bookings", booking_id))


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path == "api" or path.startswith("api/"):
        fail("API route not found", 404)
    dist = (ROOT / "frontend" / "dist").resolve()
    target = (dist / path).resolve()
    if target.is_relative_to(dist) and target.is_file():
        return FileResponse(target)
    if (
        not target.is_relative_to(dist)
        or path.startswith(("assets/", "demo-media/"))
        or Path(path).suffix
    ):
        fail("File not found", 404)
    index = dist / "index.html"
    if index.is_file():
        return FileResponse(index)
    return JSONResponse(
        {"detail": "Frontend build missing. Run npm run build in frontend."},
        status_code=503,
    )
