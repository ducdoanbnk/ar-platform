"""LIFF Server API — automates the LIFF app lifecycle (spec item 5,
"Automated LIFF App Management").

LINE has no API to create a CHANNEL (that step stays manual; checklist in
CUSTOM-DOMAIN.md), but LIFF apps inside an existing channel are fully
manageable via API — authenticated with a channel access token issued from
the Channel ID + Channel Secret of that same LINE Login channel.

Token: try the stateless v3 endpoint first, fall back to v2 (some older
channels/regions only accept v2). Every LINE-side failure is wrapped in an
ApiError 502 with details the console can show directly to the platform
admin.
"""

import httpx
import structlog

from app.core.errors import ApiError

logger = structlog.get_logger()

TOKEN_URL_V3 = "https://api.line.me/oauth2/v3/token"
TOKEN_URL_V2 = "https://api.line.me/v2/oauth/accessToken"
LIFF_APPS_URL = "https://api.line.me/liff/v1/apps"


async def issue_channel_token(channel_id: str, channel_secret: str) -> str:
    """Channel access token (client_credentials) for a LINE Login channel."""
    form = {
        "grant_type": "client_credentials",
        "client_id": channel_id,
        "client_secret": channel_secret,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        for url in (TOKEN_URL_V3, TOKEN_URL_V2):
            try:
                resp = await client.post(url, data=form)
            except httpx.HTTPError as exc:
                raise ApiError(502, "line_unreachable", "無法連線至 LINE。") from exc
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                if token:
                    return token
            logger.info("line_token_rejected", url=url, status=resp.status_code)
    raise ApiError(
        502,
        "line_channel_auth_failed",
        "LINE 拒絕了 Channel ID／Secret — 請到 LINE Login channel 的 Basic settings 分頁確認這兩個值。",
    )


def _liff_payload(endpoint_url: str, description: str) -> dict:
    return {
        "view": {"type": "full", "url": endpoint_url},
        "description": description[:100] or "AR 體驗",
        "features": {"qrCode": True},
        "scope": ["profile", "openid"],
        "botPrompt": "none",
    }


async def create_liff_app(token: str, endpoint_url: str, description: str) -> str:
    """Create a new LIFF app in the channel; returns the LIFF ID."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                LIFF_APPS_URL,
                json=_liff_payload(endpoint_url, description),
                headers={"authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as exc:
            raise ApiError(502, "line_unreachable", "無法連線至 LINE。") from exc
    if resp.status_code != 200:
        logger.warning("liff_create_failed", status=resp.status_code, body=resp.text[:300])
        raise ApiError(502, "liff_create_failed", f"建立 LIFF app 時 LINE 回傳錯誤：{resp.text[:200]}")
    liff_id = resp.json().get("liffId")
    if not liff_id:
        raise ApiError(502, "liff_create_failed", "LINE 未回傳 liffId。")
    return liff_id


async def update_liff_endpoint(token: str, liff_id: str, endpoint_url: str) -> None:
    """Point an existing LIFF app at a new endpoint URL (customer changed
    custom domain)."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.put(
                f"{LIFF_APPS_URL}/{liff_id}",
                json={"view": {"type": "full", "url": endpoint_url}},
                headers={"authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as exc:
            raise ApiError(502, "line_unreachable", "無法連線至 LINE。") from exc
    if resp.status_code != 200:
        logger.warning("liff_update_failed", status=resp.status_code, body=resp.text[:300])
        raise ApiError(502, "liff_update_failed", f"更新 LIFF app 時 LINE 回傳錯誤：{resp.text[:200]}")
