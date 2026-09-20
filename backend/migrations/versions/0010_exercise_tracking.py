from alembic import op
import sqlalchemy as sa

revision = "0010_exercise_tracking"
down_revision = "0009_buddy_connections"


def upgrade():
    op.add_column(
        "exercises",
        sa.Column("tracking_mode", sa.String(40), server_default="manual", nullable=False),
    )
    op.add_column("daily_assignments", sa.Column("reps_completed", sa.Integer(), nullable=True))
    op.add_column("daily_assignments", sa.Column("form_score", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'squat'
        WHERE name IN ('Squats', 'Advanced Squats')
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'pushup'
        WHERE name IN ('Wall Push-ups', 'Push-ups', 'Pike Push-ups')
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'lunge'
        WHERE name = 'Lunges'
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'jumping_jack'
        WHERE name = 'Jumping Jacks'
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'mountain_climber'
        WHERE name = 'Mountain Climbers'
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'plank_hold'
        WHERE name IN ('Plank', 'Hollow Hold')
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'timed'
        WHERE duration_minutes > 0 AND target_reps = 0
        """
    )
    op.execute(
        """
        UPDATE exercises SET tracking_mode = 'burpee'
        WHERE name = 'Burpees'
        """
    )


def downgrade():
    op.drop_column("daily_assignments", "form_score")
    op.drop_column("daily_assignments", "reps_completed")
    op.drop_column("exercises", "tracking_mode")
