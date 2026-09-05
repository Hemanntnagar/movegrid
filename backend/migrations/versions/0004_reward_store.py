from alembic import op
import sqlalchemy as sa

revision = "0004_reward_store"
down_revision = "0003_leaderboards"


def upgrade():
    op.add_column("rewards", sa.Column("category", sa.String(60), server_default="General"))
    op.add_column("rewards", sa.Column("active", sa.Boolean(), server_default=sa.true()))
    op.add_column("rewards", sa.Column("image", sa.String(255), server_default="/rewards/default.png"))
    op.create_table(
        "reward_redemptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reward_id", sa.Integer(), sa.ForeignKey("rewards.id"), nullable=False),
        sa.Column("points_spent", sa.Integer(), nullable=False),
        sa.Column("redeemed_at", sa.DateTime()),
        sa.Column("status", sa.String(30), server_default="COMPLETED"),
    )
    op.create_index("ix_reward_redemptions_user_id", "reward_redemptions", ["user_id"])


def downgrade():
    op.drop_index("ix_reward_redemptions_user_id", table_name="reward_redemptions")
    op.drop_table("reward_redemptions")
    op.drop_column("rewards", "image")
    op.drop_column("rewards", "active")
    op.drop_column("rewards", "category")
