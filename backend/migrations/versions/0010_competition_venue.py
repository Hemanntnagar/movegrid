from alembic import op
import sqlalchemy as sa

revision = "0010_competition_venue"
down_revision = "0009_buddy_connections"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "competitions" in tables:
        columns = {col["name"] for col in inspector.get_columns("competitions")}
        if "venue" not in columns:
            op.add_column("competitions", sa.Column("venue", sa.String(255), server_default=""))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "competitions" in tables:
        columns = {col["name"] for col in inspector.get_columns("competitions")}
        if "venue" in columns:
            op.drop_column("competitions", "venue")
