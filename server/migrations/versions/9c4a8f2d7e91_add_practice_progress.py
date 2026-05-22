"""add_practice_progress

Revision ID: 9c4a8f2d7e91
Revises: 347d13afbfbd
Create Date: 2026-05-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "9c4a8f2d7e91"
down_revision: Union[str, None] = "347d13afbfbd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


gesturecomplexity = postgresql.ENUM("EASY", "MEDIUM", "HARD", name="gesturecomplexity")
gestureprogressstatus = postgresql.ENUM(
    "NOT_STARTED",
    "IN_PROGRESS",
    "MASTERED",
    name="gestureprogressstatus",
)
gestureprogressstatus_existing = postgresql.ENUM(
    "NOT_STARTED",
    "IN_PROGRESS",
    "MASTERED",
    name="gestureprogressstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    gesturecomplexity.create(bind, checkfirst=True)
    gestureprogressstatus.create(bind, checkfirst=True)

    op.execute("ALTER TYPE lessonstatus ADD VALUE IF NOT EXISTS 'SKIPPED'")
    op.alter_column(
        "gestures",
        "complexity",
        existing_type=sa.Integer(),
        type_=gesturecomplexity,
        existing_nullable=False,
        postgresql_using=(
            "CASE complexity "
            "WHEN 1 THEN 'EASY'::gesturecomplexity "
            "WHEN 2 THEN 'MEDIUM'::gesturecomplexity "
            "ELSE 'HARD'::gesturecomplexity END"
        ),
    )

    op.create_table(
        "user_gesture_progress",
        sa.Column("progress_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("gesture_id", sa.Integer(), nullable=False),
        sa.Column("successful_attempts", sa.Integer(), nullable=False),
        sa.Column("status", gestureprogressstatus_existing, nullable=False),
        sa.Column("last_practiced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["gesture_id"], ["gestures.gesture_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.lesson_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("progress_id"),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_user_gesture_progress_lesson"),
    )


def downgrade() -> None:
    op.drop_table("user_gesture_progress")
    op.alter_column(
        "gestures",
        "complexity",
        existing_type=gesturecomplexity,
        type_=sa.Integer(),
        existing_nullable=False,
        postgresql_using=(
            "CASE complexity "
            "WHEN 'EASY'::gesturecomplexity THEN 1 "
            "WHEN 'MEDIUM'::gesturecomplexity THEN 2 "
            "ELSE 3 END"
        ),
    )

    bind = op.get_bind()
    gestureprogressstatus.drop(bind, checkfirst=True)
    gesturecomplexity.drop(bind, checkfirst=True)
