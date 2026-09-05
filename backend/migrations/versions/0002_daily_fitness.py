from alembic import op
import sqlalchemy as sa

revision = "0002_daily_fitness"
down_revision = "0001_initial"


def upgrade():
    op.add_column("users", sa.Column("fitness_level", sa.String(30), server_default="Beginner"))
    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("difficulty", sa.String(30), server_default="Beginner"),
        sa.Column("duration_minutes", sa.Integer(), server_default="0"),
        sa.Column("target_reps", sa.Integer(), server_default="0"),
        sa.Column("instructions", sa.Text()),
        sa.Column("points", sa.Integer(), server_default="15"),
        sa.Column("requires_equipment", sa.Boolean(), server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
    )
    op.create_table(
        "daily_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("status", sa.String(20), server_default="ASSIGNED"),
        sa.Column("points", sa.Integer(), server_default="0"),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_daily_assignments_user_id", "daily_assignments", ["user_id"])
    op.create_index("ix_daily_assignments_assigned_at", "daily_assignments", ["assigned_at"])
    op.create_index("ix_daily_assignments_expires_at", "daily_assignments", ["expires_at"])
    op.create_index("ix_daily_assignments_status", "daily_assignments", ["status"])


def downgrade():
    op.drop_index("ix_daily_assignments_status", table_name="daily_assignments")
    op.drop_index("ix_daily_assignments_expires_at", table_name="daily_assignments")
    op.drop_index("ix_daily_assignments_assigned_at", table_name="daily_assignments")
    op.drop_index("ix_daily_assignments_user_id", table_name="daily_assignments")
    op.drop_table("daily_assignments")
    op.drop_table("exercises")
    op.drop_column("users", "fitness_level")
