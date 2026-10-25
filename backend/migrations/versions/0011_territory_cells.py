from alembic import op
import sqlalchemy as sa

revision = "0011_territory_cells"
down_revision = "0010_exercise_tracking"


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "territory_cells" in tables:
        return
    op.create_table(
        "territory_cells",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cell_x", sa.Integer(), nullable=False, index=True),
        sa.Column("cell_y", sa.Integer(), nullable=False, index=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("claimed_at", sa.DateTime(), server_default=sa.func.now(), index=True),
        sa.UniqueConstraint("cell_x", "cell_y", name="uq_territory_cell"),
    )


def downgrade():
    op.drop_table("territory_cells")
