"""LINE ID token verification (OIDC) — spec §4.1, §5.6.

Real mode: POST the ID token to LINE's official verify endpoint
(https://api.line.me/oauth2/v2.1/verify) with our channel ID. LINE checks the
signature, expiry, audience and returns the payload (sub = LINE userId).

Dev mode (AUTH_DEV_MODE=true): accept tokens of the form
    dev::{line_user_id}::{display_name}
so the whole flow runs without a LINE channel. Never enable in production.
"""

from dataclasses import dataclass

import httpx
import structlog

from app.core.config import get_settings
from app.core.errors import ApiError

logger = structlog.get_logger()


@dataclass(frozen=True)
class LineIdentity:
    line_user_id: str
    display_name: str
    picture_url: str | None = None


async def verify_line_id_token(id_token: str, channel_id: str | None = None) -> LineIdentity:
    """Verify against `channel_id` (a tenant's own LINE channel — white-label
    plan) or the platform's shared channel when omitted. LINE rejects tokens
    whose audience doesn't match client_id, so per-tenant channels isolate
    logins for free."""
    settings = get_settings()

    if settings.auth_dev_mode and id_token.startswith("dev::"):
        parts = id_token.split("::")
        if len(parts) < 2 or not parts[1]:
            raise ApiError(401, "invalid_line_token", "Malformed dev token.")
        return LineIdentity(
            line_user_id=parts[1],
            display_name=parts[2] if len(parts) > 2 else parts[1],
        )

    client_id = channel_id or settings.line_channel_id
    if not client_id:
        raise ApiError(
            503,
            "line_not_configured",
            "LINE channel is not configured on this environment.",
        )

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                settings.line_verify_url,
                data={"id_token": id_token, "client_id": client_id},
            )
        except httpx.HTTPError as exc:
            logger.warning("line_verify_unreachable", error=str(exc))
            raise ApiError(502, "line_unreachable", "Could not reach LINE to verify the token.") from exc

    if resp.status_code != 200:
        # LINE returns 400 with error details for invalid/expired tokens.
        logger.info("line_verify_rejected", status=resp.status_code)
        raise ApiError(401, "invalid_line_token", "LINE ID token is invalid or expired.")

    payload = resp.json()
    sub = payload.get("sub")
    if not sub:
        raise ApiError(401, "invalid_line_token", "LINE ID token payload is missing sub.")

    return LineIdentity(
        line_user_id=sub,
        display_name=payload.get("name") or "",
        picture_url=payload.get("picture"),
    )
