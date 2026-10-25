from alembic import op
import sqlalchemy as sa

revision = "0012_territory_trails"
down_revision = "0011_territory_cells"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "territory_trails" in set(inspector.get_table_names()):
        return
    op.create_table(
        "territory_trails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True, index=True),
        sa.Column("cells_json", sa.Text(), server_default="[]", nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), index=True),
    )


def downgrade():
    op.drop_table("territory_trails")
