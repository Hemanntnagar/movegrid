from alembic import op
import sqlalchemy as sa

revision = "0004_reward_store"
down_revision = "0003_leaderboards"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    reward_cols = {col["name"] for col in inspector.get_columns("rewards")}

    if "category" not in reward_cols:
        op.add_column("rewards", sa.Column("category", sa.String(60), server_default="General"))
    if "active" not in reward_cols:
        op.add_column("rewards", sa.Column("active", sa.Boolean(), server_default=sa.true()))
    if "image" not in reward_cols:
        op.add_column("rewards", sa.Column("image", sa.String(255), server_default="/rewards/default.png"))

    tables = set(inspector.get_table_names())
    if "reward_redemptions" not in tables:
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
    else:
        redemption_cols = {col["name"] for col in inspector.get_columns("reward_redemptions")}
        if "status" not in redemption_cols:
            op.add_column(
                "reward_redemptions",
                sa.Column("status", sa.String(30), server_default="COMPLETED"),
            )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "reward_redemptions" in tables:
        redemption_cols = {col["name"] for col in inspector.get_columns("reward_redemptions")}
        if "status" in redemption_cols:
            op.drop_column("reward_redemptions", "status")
        # Only drop the table if this migration created the baseline shape; keep data otherwise.
    reward_cols = {col["name"] for col in inspector.get_columns("rewards")}
    if "active" in reward_cols:
        op.drop_column("rewards", "active")
    if "category" in reward_cols:
        op.drop_column("rewards", "category")
