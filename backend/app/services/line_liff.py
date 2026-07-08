"""LIFF Server API — tự động hóa vòng đời LIFF app (spec mục 5 "Quản lý Tự
động LIFF App").

LINE không có API tạo CHANNEL (bước đó thủ công, checklist trong
CUSTOM-DOMAIN.md), nhưng LIFF app trong một channel có sẵn thì quản lý được
trọn vẹn qua API — auth bằng channel access token phát hành từ Channel ID +
Channel Secret của chính channel LINE Login đó.

Token: thử endpoint stateless v3 trước, fallback v2 (một số channel/region
cũ chỉ nhận v2). Mọi lỗi từ LINE được gói thành ApiError 502 kèm chi tiết
để console hiển thị thẳng cho platform admin.
"""

import httpx
import structlog

from app.core.errors import ApiError

logger = structlog.get_logger()

TOKEN_URL_V3 = "https://api.line.me/oauth2/v3/token"
TOKEN_URL_V2 = "https://api.line.me/v2/oauth/accessToken"
LIFF_APPS_URL = "https://api.line.me/liff/v1/apps"


async def issue_channel_token(channel_id: str, channel_secret: str) -> str:
    """Channel access token (client_credentials) của channel LINE Login."""
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
                raise ApiError(502, "line_unreachable", "Không kết nối được LINE.") from exc
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                if token:
                    return token
            logger.info("line_token_rejected", url=url, status=resp.status_code)
    raise ApiError(
        502,
        "line_channel_auth_failed",
        "LINE từ chối Channel ID/Secret — kiểm tra lại 2 giá trị trong tab Basic settings.",
    )


def _liff_payload(endpoint_url: str, description: str) -> dict:
    return {
        "view": {"type": "full", "url": endpoint_url},
        "description": description[:100] or "AR experience",
        "features": {"qrCode": True},
        "scope": ["profile", "openid"],
        "botPrompt": "none",
    }


async def create_liff_app(token: str, endpoint_url: str, description: str) -> str:
    """Tạo LIFF app mới trong channel → trả về LIFF ID."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                LIFF_APPS_URL,
                json=_liff_payload(endpoint_url, description),
                headers={"authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as exc:
            raise ApiError(502, "line_unreachable", "Không kết nối được LINE.") from exc
    if resp.status_code != 200:
        logger.warning("liff_create_failed", status=resp.status_code, body=resp.text[:300])
        raise ApiError(502, "liff_create_failed", f"LINE trả lỗi khi tạo LIFF app: {resp.text[:200]}")
    liff_id = resp.json().get("liffId")
    if not liff_id:
        raise ApiError(502, "liff_create_failed", "LINE không trả về liffId.")
    return liff_id


async def update_liff_endpoint(token: str, liff_id: str, endpoint_url: str) -> None:
    """Đổi endpoint URL của LIFF app có sẵn (khách đổi custom domain)."""
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.put(
                f"{LIFF_APPS_URL}/{liff_id}",
                json={"view": {"type": "full", "url": endpoint_url}},
                headers={"authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as exc:
            raise ApiError(502, "line_unreachable", "Không kết nối được LINE.") from exc
    if resp.status_code != 200:
        logger.warning("liff_update_failed", status=resp.status_code, body=resp.text[:300])
        raise ApiError(502, "liff_update_failed", f"LINE trả lỗi khi cập nhật LIFF app: {resp.text[:200]}")
