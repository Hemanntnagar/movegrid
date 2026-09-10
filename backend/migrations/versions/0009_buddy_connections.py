from alembic import op
import sqlalchemy as sa

revision = "0009_buddy_connections"
down_revision = "0008_user_steps"


def upgrade():
    op.create_table(
        "buddy_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("message", sa.Text(), server_default=""),
        sa.Column("status", sa.String(20), server_default="pending", index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("from_user_id", "to_user_id", name="uq_buddy_invite_pair"),
    )
    op.create_table(
        "buddy_connections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_a_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("user_b_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("connected_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("user_a_id", "user_b_id", name="uq_buddy_connection_pair"),
    )


def downgrade():
    op.drop_table("buddy_connections")
    op.drop_table("buddy_invites")
