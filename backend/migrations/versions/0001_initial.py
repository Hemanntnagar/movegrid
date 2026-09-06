from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None


def upgrade():
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("email", sa.String(255), nullable=False, unique=True), sa.Column("full_name", sa.String(120), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("move_points", sa.Integer(), server_default="0"), sa.Column("streak", sa.Integer(), server_default="0"))
    op.create_table("zones", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("description", sa.Text()), sa.Column("qr_secret", sa.String(255), nullable=False))
    op.create_table("challenges", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("title", sa.String(160), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("zone_id", sa.Integer(), sa.ForeignKey("zones.id")), sa.Column("move_reward", sa.Integer(), server_default="100"), sa.Column("minutes", sa.Integer(), server_default="15"), sa.Column("kind", sa.String(40), server_default="Walk"), sa.Column("active", sa.Boolean(), server_default=sa.true()))
    op.create_table("activities", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")), sa.Column("challenge_id", sa.Integer(), sa.ForeignKey("challenges.id")), sa.Column("status", sa.String(30)), sa.Column("move_awarded", sa.Integer()), sa.Column("created_at", sa.DateTime()))
    op.create_table("rewards", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("title", sa.String(160), nullable=False), sa.Column("description", sa.Text()), sa.Column("cost", sa.Integer(), nullable=False), sa.Column("inventory", sa.Integer(), server_default="0"))
    op.create_table("squads", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), nullable=False), sa.Column("invite_code", sa.String(20), unique=True))

def downgrade():
    for table in ("activities", "challenges", "zones", "rewards", "squads", "users"): op.drop_table(table)
