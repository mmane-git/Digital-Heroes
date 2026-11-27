import hashlib
import hmac
import json
import logging
import os
from typing import Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("digital-heroes")

app = FastAPI(title="Digital Heroes API")

app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://digital-heroes-ten-eta.vercel.app",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SubscriptionRequest(BaseModel):
    plan: Literal["monthly", "yearly"]


class VerifySubscriptionRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(
            status_code=500,
            detail=f"Backend configuration missing: {name}",
        )
    return value


def get_supabase_user(access_token: str) -> dict:
    supabase_url = required_env("SUPABASE_URL").rstrip("/")
    anon_key = required_env("SUPABASE_SERVICE_ROLE_KEY")

    try:
        response = requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {access_token}",
            },
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Supabase auth request failed")
        raise HTTPException(
            status_code=502,
            detail="Could not verify your login with Supabase.",
        )

    
    if response.status_code != 200:
        logger.error(
            "Supabase auth rejected token: status=%s body=%s",
            response.status_code,
            response.text[:500],
        )
        raise HTTPException(
            status_code=401,
            detail="Your login session is invalid or expired.",
        )


    return response.json()


def get_bearer_user(authorization: str | None) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in first.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in first.")
    return get_supabase_user(token)


def supabase_headers(service_key: str) -> dict:
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def response_error(response: requests.Response) -> str:
    try:
        payload = response.json()
        return json.dumps(payload, ensure_ascii=False)
    except (ValueError, json.JSONDecodeError):
        return response.text[:1500]


def cancel_razorpay_subscription(subscription_id: str, key_id: str, key_secret: str) -> None:
    """Best-effort cancellation to avoid leaving an orphan subscription."""
    try:
        response = requests.post(
            f"https://api.razorpay.com/v1/subscriptions/{subscription_id}/cancel",
            auth=(key_id, key_secret),
            json={"cancel_at_cycle_end": 0},
            timeout=20,
        )
        if response.status_code not in (200, 201):
            logger.error(
                "Could not cancel orphan Razorpay subscription %s: %s %s",
                subscription_id,
                response.status_code,
                response.text[:1000],
            )
    except requests.RequestException:
        logger.exception("Failed to cancel orphan Razorpay subscription %s", subscription_id)


@app.get("/")
def home():
    return {"message": "Digital Heroes API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}




@app.get("/api/subscriptions/status")
def subscription_status(authorization: str | None = Header(default=None)):
    """Return membership for the signed-in user and reconcile with Razorpay."""
    user = get_bearer_user(authorization)
    user_id = user["id"]

    supabase_url = required_env("SUPABASE_URL").rstrip("/")
    service_key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    key_id = required_env("RAZORPAY_KEY_ID")
    key_secret = required_env("RAZORPAY_KEY_SECRET")

    try:
        db_response = requests.get(
            f"{supabase_url}/rest/v1/subscriptions",
            headers=supabase_headers(service_key),
            params={
                "select": "plan,status,provider_subscription_id",
                "user_id": f"eq.{user_id}",
                "limit": "10",
            },
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Membership status lookup failed")
        raise HTTPException(status_code=502, detail="Could not load membership from Supabase.")

    if db_response.status_code != 200:
        logger.error("Membership status lookup error: %s", response_error(db_response))
        raise HTTPException(status_code=502, detail="Could not load membership status.")

    rows = db_response.json()
    for row in rows:
        subscription_id = row.get("provider_subscription_id")
        if not subscription_id:
            continue
        try:
            rp_response = requests.get(
                f"https://api.razorpay.com/v1/subscriptions/{subscription_id}",
                auth=(key_id, key_secret),
                timeout=20,
            )
        except requests.RequestException:
            logger.exception("Razorpay membership reconciliation failed")
            continue

        if rp_response.status_code != 200:
            logger.warning(
                "Razorpay status lookup failed for %s: %s",
                subscription_id,
                rp_response.status_code,
            )
            continue

        rp_status = rp_response.json().get("status")
        status_map = {
            "active": "active",
            "halted": "past_due",
            "cancelled": "cancelled",
            "completed": "expired",
            "created": "inactive",
            "authenticated": "inactive",
            "pending": "inactive",
        }
        mapped = status_map.get(rp_status)
        if mapped and mapped != row.get("status"):
            try:
                patch_response = requests.patch(
                    f"{supabase_url}/rest/v1/subscriptions",
                    headers=supabase_headers(service_key),
                    params={
                        "user_id": f"eq.{user_id}",
                        "provider_subscription_id": f"eq.{subscription_id}",
                    },
                    json={"status": mapped},
                    timeout=20,
                )
            except requests.RequestException:
                logger.exception("Could not synchronize membership status")
                continue

            if patch_response.status_code not in (200, 204):
                logger.error(
                    "Membership synchronization failed: %s",
                    response_error(patch_response),
                )
                continue
            row["status"] = mapped

    active = next((row for row in rows if row.get("status") == "active"), None)
    return {
        "active": active is not None,
        "plan": active.get("plan") if active else None,
        "status": active.get("status") if active else None,
    }


@app.post("/api/subscriptions/create")
def create_subscription(
    request: SubscriptionRequest,
    authorization: str | None = Header(default=None),
):
    user = get_bearer_user(authorization)
    user_id = user["id"]
    user_email = user.get("email", "")

    supabase_url = required_env("SUPABASE_URL").rstrip("/")
    service_key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    key_id = required_env("RAZORPAY_KEY_ID")
    key_secret = required_env("RAZORPAY_KEY_SECRET")

    if request.plan == "monthly":
        plan_id = required_env("RAZORPAY_MONTHLY_PLAN_ID")
        total_count = 120
    else:
        plan_id = required_env("RAZORPAY_YEARLY_PLAN_ID")
        total_count = 10

    if not plan_id.startswith("plan_"):
        raise HTTPException(status_code=500, detail="The configured Razorpay Plan ID is invalid.")

    # Create the subscription in Razorpay.
    try:
        razorpay_response = requests.post(
            "https://api.razorpay.com/v1/subscriptions",
            auth=(key_id, key_secret),
            json={
                "plan_id": plan_id,
                "total_count": total_count,
                "quantity": 1,
                "customer_notify": False,
                "notes": {
                    "user_id": user_id,
                    "product": "Digital Heroes",
                },
            },
            timeout=30,
        )
    except requests.RequestException:
        logger.exception("Razorpay create subscription request failed")
        raise HTTPException(status_code=502, detail="Could not connect to Razorpay.")

    if razorpay_response.status_code not in (200, 201):
        logger.error(
            "Razorpay create subscription failed (%s): %s",
            razorpay_response.status_code,
            razorpay_response.text[:1500],
        )
        raise HTTPException(
            status_code=502,
            detail=f"Razorpay rejected subscription creation: {response_error(razorpay_response)}",
        )

    try:
        razorpay_subscription = razorpay_response.json()
        subscription_id = razorpay_subscription["id"]
    except (ValueError, KeyError):
        logger.error("Unexpected Razorpay response: %s", razorpay_response.text[:1500])
        raise HTTPException(status_code=502, detail="Razorpay returned an unexpected response.")

    # Save the subscription. If the DB rejects it, log the real PostgREST error.
    try:
        database_response = requests.post(
            f"{supabase_url}/rest/v1/subscriptions",
            headers={
                **supabase_headers(service_key),
                "Prefer": "return=minimal",
            },
            json={
                "user_id": user_id,
                "plan": request.plan,
                "status": "inactive",
                "payment_provider": "razorpay",
                "provider_subscription_id": subscription_id,
            },
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Supabase subscription insert request failed")
        cancel_razorpay_subscription(subscription_id, key_id, key_secret)
        raise HTTPException(
            status_code=502,
            detail="Razorpay created a subscription, but Supabase could not be reached. Check Razorpay before retrying.",
        )

    if database_response.status_code not in (200, 201, 204):
        db_error = response_error(database_response)
        logger.error(
            "Supabase subscription insert failed (%s): %s",
            database_response.status_code,
            db_error,
        )
        cancel_razorpay_subscription(subscription_id, key_id, key_secret)
        raise HTTPException(
            status_code=500,
            detail=(
                "Supabase rejected the subscription row. "
                f"Database response: {db_error}"
            ),
        )

    return {
        "subscription_id": subscription_id,
        "key_id": key_id,
        "plan": request.plan,
        "email": user_email,
    }


@app.post("/api/subscriptions/verify")
def verify_subscription(
    request: VerifySubscriptionRequest,
    authorization: str | None = Header(default=None),
):
    # Verify the signed-in user and ensure this subscription belongs to them.
    user = get_bearer_user(authorization)
    user_id = user["id"]

    supabase_url = required_env("SUPABASE_URL").rstrip("/")
    service_key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    key_id = required_env("RAZORPAY_KEY_ID")
    key_secret = required_env("RAZORPAY_KEY_SECRET")

    try:
        database_response = requests.get(
            f"{supabase_url}/rest/v1/subscriptions",
            headers=supabase_headers(service_key),
            params={
                "select": "id,status,plan",
                "user_id": f"eq.{user_id}",
                "provider_subscription_id": f"eq.{request.razorpay_subscription_id}",
            },
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Supabase subscription ownership check failed")
        raise HTTPException(status_code=502, detail="Could not verify subscription ownership.")

    if database_response.status_code != 200:
        logger.error("Supabase ownership check error: %s", response_error(database_response))
        raise HTTPException(status_code=502, detail="Could not check the subscription in Supabase.")

    rows = database_response.json()
    if not rows:
        raise HTTPException(status_code=403, detail="This subscription does not belong to your account.")

    # Validate Razorpay Checkout signature.
    signature_data = (
        request.razorpay_payment_id + "|" + request.razorpay_subscription_id
    )
    expected_signature = hmac.new(
        key_secret.encode("utf-8"),
        signature_data.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, request.razorpay_signature):
        raise HTTPException(status_code=400, detail="Razorpay payment signature is invalid.")

    # Confirm the current subscription status directly with Razorpay.
    try:
        razorpay_response = requests.get(
            f"https://api.razorpay.com/v1/subscriptions/{request.razorpay_subscription_id}",
            auth=(key_id, key_secret),
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Razorpay subscription status check failed")
        raise HTTPException(status_code=502, detail="Could not confirm subscription status with Razorpay.")

    if razorpay_response.status_code != 200:
        logger.error("Razorpay subscription status error: %s", razorpay_response.text[:1500])
        raise HTTPException(status_code=502, detail="Razorpay could not confirm the subscription status.")

    razorpay_subscription = razorpay_response.json()
    razorpay_status = razorpay_subscription.get("status")

    # Grant access only when Razorpay reports the subscription as active.
    if razorpay_status == "active":
        try:
            update_response = requests.patch(
                f"{supabase_url}/rest/v1/subscriptions",
                headers=supabase_headers(service_key),
                params={
                    "user_id": f"eq.{user_id}",
                    "provider_subscription_id": f"eq.{request.razorpay_subscription_id}",
                },
                json={
                    "status": "active",
                },
                timeout=20,
            )
        except requests.RequestException:
            logger.exception("Supabase activation update failed")
            raise HTTPException(status_code=502, detail="Payment verified, but membership could not be activated.")

        if update_response.status_code not in (200, 204):
            logger.error("Supabase activation update error: %s", response_error(update_response))
            raise HTTPException(status_code=502, detail="Payment verified, but membership could not be activated.")

        return {
            "verified": True,
            "active": True,
            "plan": rows[0].get("plan"),
            "message": "Payment verified. Membership is active.",
        }

    # A webhook will activate it when Razorpay moves it to active.
    logger.info(
        "Checkout signature verified for %s; Razorpay subscription status is %s",
        request.razorpay_subscription_id,
        razorpay_status,
    )
    return {
        "verified": True,
        "active": False,
        "razorpay_status": razorpay_status,
        "message": "Checkout verified. Membership will activate when Razorpay confirms the subscription is active.",
    }


@app.post("/api/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    razorpay_signature: str | None = Header(default=None, alias="X-Razorpay-Signature"),
    event_id: str | None = Header(default=None, alias="x-razorpay-event-id"),
):
    raw_body = await request.body()

    if not razorpay_signature or not event_id:
        raise HTTPException(status_code=400, detail="Missing webhook headers")

    webhook_secret = required_env("RAZORPAY_WEBHOOK_SECRET")
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event_data = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event_data.get("event", "")
    payload = event_data.get("payload", {})
    subscription_entity = payload.get("subscription", {}).get("entity", {})
    subscription_id = subscription_entity.get("id")

    supabase_url = required_env("SUPABASE_URL").rstrip("/")
    service_key = required_env("SUPABASE_SERVICE_ROLE_KEY")
    db_headers = supabase_headers(service_key)

    # Idempotency check. razorpay_webhook_events.event_id should be UNIQUE.
    try:
        existing = requests.get(
            f"{supabase_url}/rest/v1/razorpay_webhook_events",
            headers=db_headers,
            params={
                "select": "event_id",
                "event_id": f"eq.{event_id}",
            },
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Webhook idempotency lookup failed")
        raise HTTPException(status_code=502, detail="Could not check webhook event")

    if existing.status_code != 200:
        logger.error("Webhook event lookup error: %s", response_error(existing))
        raise HTTPException(status_code=502, detail="Could not check webhook event")

    if existing.json():
        return {"received": True, "duplicate": True}

    if event_type.startswith("subscription.") and subscription_id:
        try:
            razorpay_response = requests.get(
                f"https://api.razorpay.com/v1/subscriptions/{subscription_id}",
                auth=(
                    required_env("RAZORPAY_KEY_ID"),
                    required_env("RAZORPAY_KEY_SECRET"),
                ),
                timeout=20,
            )
        except requests.RequestException:
            logger.exception("Could not fetch Razorpay subscription")
            raise HTTPException(status_code=502, detail="Could not fetch subscription status from Razorpay")

        if razorpay_response.status_code != 200:
            logger.error("Razorpay subscription fetch error: %s", razorpay_response.text[:1500])
            raise HTTPException(status_code=502, detail="Could not fetch subscription status from Razorpay")

        subscription = razorpay_response.json()
        razorpay_status = subscription.get("status")
        status_map = {
            "active": "active",
            "halted": "past_due",
            "cancelled": "cancelled",
            "completed": "expired",
            "created": "inactive",
            "authenticated": "inactive",
            "pending": "inactive",
        }

        if razorpay_status in status_map:
            update_data = {
                "status": status_map[razorpay_status],
            }


            try:
                update_response = requests.patch(
                    f"{supabase_url}/rest/v1/subscriptions",
                    headers=db_headers,
                    params={"provider_subscription_id": f"eq.{subscription_id}"},
                    json=update_data,
                    timeout=20,
                )
            except requests.RequestException:
                logger.exception("Supabase subscription status update failed")
                raise HTTPException(status_code=502, detail="Could not update membership in Supabase")

            if update_response.status_code not in (200, 204):
                logger.error("Supabase status update error: %s", response_error(update_response))
                raise HTTPException(status_code=502, detail="Could not update membership in Supabase")

    # Store the event only after successful processing. event_id must be UNIQUE.
    try:
        save_event = requests.post(
            f"{supabase_url}/rest/v1/razorpay_webhook_events",
            headers={**db_headers, "Prefer": "return=minimal"},
            json={"event_id": event_id, "event_type": event_type},
            timeout=20,
        )
    except requests.RequestException:
        logger.exception("Could not save webhook event")
        raise HTTPException(status_code=502, detail="Could not save webhook event")

    if save_event.status_code not in (200, 201, 204, 409):
        logger.error("Webhook event insert error: %s", response_error(save_event))
        raise HTTPException(status_code=502, detail="Could not save webhook event")

    return {"received": True}
