from alembic import op
import sqlalchemy as sa

revision = "0007_company_competition_rewards"
down_revision = "0006_competition_eligibility"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "competitions" in tables:
        columns = {col["name"] for col in inspector.get_columns("competitions")}
        if "company_name" not in columns:
            op.add_column("competitions", sa.Column("company_name", sa.String(160), server_default=""))
        if "reward" not in columns:
            op.add_column("competitions", sa.Column("reward", sa.String(255), server_default=""))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "competitions" in tables:
        columns = {col["name"] for col in inspector.get_columns("competitions")}
        if "reward" in columns:
            op.drop_column("competitions", "reward")
        if "company_name" in columns:
            op.drop_column("competitions", "company_name")
