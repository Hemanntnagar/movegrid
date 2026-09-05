from alembic import op
import sqlalchemy as sa

revision = "0003_leaderboards"
down_revision = "0002_daily_fitness"


def upgrade():
    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("starts_at", sa.DateTime()),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
    )
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False, unique=True),
        sa.Column("avatar", sa.String(255), server_default="/avatars/team.png"),
        sa.Column("competition_id", sa.Integer(), sa.ForeignKey("competitions.id"), nullable=True),
        sa.Column("competition_points", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime()),
    )
    op.add_column("users", sa.Column("team_id", sa.Integer(), sa.ForeignKey("teams.id"), nullable=True))
    op.add_column("users", sa.Column("streak_score", sa.Integer(), server_default="0"))
    op.add_column("users", sa.Column("streak_month", sa.String(7), server_default=""))
    op.add_column("users", sa.Column("last_activity_date", sa.Date(), nullable=True))
    op.create_index("ix_users_team_id", "users", ["team_id"])
    op.create_table(
        "leaderboard_ranks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("board", sa.String(30), nullable=False),
        sa.Column("subject_type", sa.String(20), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("rank", sa.Integer(), server_default="0"),
        sa.Column("previous_rank", sa.Integer(), nullable=True),
        sa.Column("points", sa.Integer(), server_default="0"),
        sa.Column("updated_at", sa.DateTime()),
        sa.UniqueConstraint("board", "subject_type", "subject_id", name="uq_leaderboard_subject"),
    )
    op.create_index("ix_leaderboard_ranks_board", "leaderboard_ranks", ["board"])
    op.create_index("ix_leaderboard_ranks_subject_type", "leaderboard_ranks", ["subject_type"])
    op.create_index("ix_leaderboard_ranks_subject_id", "leaderboard_ranks", ["subject_id"])


def downgrade():
    op.drop_index("ix_leaderboard_ranks_subject_id", table_name="leaderboard_ranks")
    op.drop_index("ix_leaderboard_ranks_subject_type", table_name="leaderboard_ranks")
    op.drop_index("ix_leaderboard_ranks_board", table_name="leaderboard_ranks")
    op.drop_table("leaderboard_ranks")
    op.drop_index("ix_users_team_id", table_name="users")
    op.drop_column("users", "last_activity_date")
    op.drop_column("users", "streak_month")
    op.drop_column("users", "streak_score")
    op.drop_column("users", "team_id")
    op.drop_table("teams")
    op.drop_table("competitions")
