"""Tenant Channel Secret — needed for LIFF app automation (spec item 5).

The PoC stores it as-is (Neon encrypts at rest); when commercializing,
consider application-level encryption and disclose the secret storage in the
terms of service.

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
