from alembic import op
import sqlalchemy as sa

revision = "0008_user_steps"
down_revision = "0007_company_competition_rewards"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" in tables:
        columns = {col["name"] for col in inspector.get_columns("users")}
        if "steps" not in columns:
            op.add_column("users", sa.Column("steps", sa.Integer(), server_default="0"))

    if "activities" in tables:
        columns = {col["name"] for col in inspector.get_columns("activities")}
        if "steps_count" not in columns:
            op.add_column("activities", sa.Column("steps_count", sa.Integer(), server_default="0"))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "users" in tables:
        columns = {col["name"] for col in inspector.get_columns("users")}
        if "steps" in columns:
            op.drop_column("users", "steps")

    if "activities" in tables:
        columns = {col["name"] for col in inspector.get_columns("activities")}
        if "steps_count" in columns:
            op.drop_column("activities", "steps_count")
