from alembic import op
import sqlalchemy as sa

revision = "0006_competition_eligibility"
down_revision = "0005_user_presence"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "competitions" in tables:
        columns = {col["name"] for col in inspector.get_columns("competitions")}
        if "eligibility" not in columns:
            op.add_column(
                "competitions",
                sa.Column("eligibility", sa.String(255), server_default="Open to all members"),
            )
        if "min_points" not in columns:
            op.add_column("competitions", sa.Column("min_points", sa.Integer(), server_default="0"))
        if "min_streak" not in columns:
            op.add_column("competitions", sa.Column("min_streak", sa.Integer(), server_default="0"))

    if "competition_participants" not in tables:
        op.create_table(
            "competition_participants",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("competition_id", sa.Integer(), sa.ForeignKey("competitions.id"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("joined_at", sa.DateTime()),
            sa.UniqueConstraint("competition_id", "user_id", name="uq_competition_participant"),
        )
        op.create_index("ix_competition_participants_competition_id", "competition_participants", ["competition_id"])
        op.create_index("ix_competition_participants_user_id", "competition_participants", ["user_id"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "competition_participants" in tables:
        op.drop_index("ix_competition_participants_user_id", table_name="competition_participants")
        op.drop_index("ix_competition_participants_competition_id", table_name="competition_participants")
        op.drop_table("competition_participants")

    if "competitions" in tables:
        columns = {col["name"] for col in inspector.get_columns("competitions")}
        if "min_streak" in columns:
            op.drop_column("competitions", "min_streak")
        if "min_points" in columns:
            op.drop_column("competitions", "min_points")
        if "eligibility" in columns:
            op.drop_column("competitions", "eligibility")
