"""Channel Secret của tenant — cần cho tự động hóa LIFF app (spec mục 5).

PoC lưu thẳng (Neon đã mã hóa at-rest); khi thương mại hóa cân nhắc mã hóa
application-level + ghi việc lưu secret vào điều khoản dịch vụ.

Idempotent (IF NOT EXISTS) per project convention from 0002 onward.
"""

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS line_channel_secret VARCHAR(128)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE tenants DROP COLUMN IF EXISTS line_channel_secret")
