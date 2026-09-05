from alembic import op
import sqlalchemy as sa

revision = "0005_user_presence"
down_revision = "0004_reward_store"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "user_presence" in tables:
        return

    op.create_table(
        "user_presence",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("latitude", sa.Float(), server_default="0"),
        sa.Column("longitude", sa.Float(), server_default="0"),
        sa.Column("is_sharing", sa.Boolean(), server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_user_presence_user_id", "user_presence", ["user_id"], unique=True)
    op.create_index("ix_user_presence_updated_at", "user_presence", ["updated_at"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "user_presence" not in set(inspector.get_table_names()):
        return
    op.drop_index("ix_user_presence_updated_at", table_name="user_presence")
    op.drop_index("ix_user_presence_user_id", table_name="user_presence")
    op.drop_table("user_presence")
