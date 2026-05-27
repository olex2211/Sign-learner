"""add_gesture_media

Revision ID: c4f2a1d8e3b7
Revises: 9c4a8f2d7e91
Create Date: 2026-05-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c4f2a1d8e3b7"
down_revision: Union[str, None] = "9c4a8f2d7e91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


gesturemediarole = postgresql.ENUM("ICON", "DEMO_IMAGE", name="gesturemediarole")
gesturemediarole_existing = postgresql.ENUM(
    "ICON",
    "DEMO_IMAGE",
    name="gesturemediarole",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    gesturemediarole.create(bind, checkfirst=True)

    op.create_table(
        "gesture_media",
        sa.Column("gesture_media_id", sa.Integer(), nullable=False),
        sa.Column("gesture_id", sa.Integer(), nullable=False),
        sa.Column("media_role", gesturemediarole_existing, nullable=False),
        sa.Column("file_path", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["gesture_id"], ["gestures.gesture_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("gesture_media_id"),
        sa.UniqueConstraint("gesture_id", "media_role", name="uq_gesture_media_role"),
    )


def downgrade() -> None:
    op.drop_table("gesture_media")

    bind = op.get_bind()
    gesturemediarole.drop(bind, checkfirst=True)
