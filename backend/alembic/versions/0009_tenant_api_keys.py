"""Tenant-wide API keys (headless).

export_keys.event_id becomes nullable: NULL = the key reads EVERY event of
its tenant (issued from the Zoustec console when onboarding a customer, for
their self-hosted Next.js site); non-NULL keeps the original per-event scope
(minted by the project/bundle export buttons).

Idempotent (IF NOT EXISTS / exception-safe) per project convention.
"""

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE export_keys ALTER COLUMN event_id DROP NOT NULL")


def downgrade() -> None:
    op.execute("DELETE FROM export_keys WHERE event_id IS NULL")
    op.execute("ALTER TABLE export_keys ALTER COLUMN event_id SET NOT NULL")
