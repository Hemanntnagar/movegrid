import secrets
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exercise_catalog import SEED_EXERCISES
from app.models.entities import (
    Challenge,
    ClassGroup,
    Competition,
    CompetitionParticipant,
    Exercise,
    Reward,
    Team,
    User,
    Zone,
)
from app.core.demo_competitions import LEGACY_DEMO_COMPETITION_NAMES
from app.services.leaderboard_service import refresh_all_leaderboard_ranks

def _avatar(initials: str, color: str) -> str:
    return f"initials:{initials}:{color}"


LEGACY_DEMO_QR = "movegrid-demo"

async def _remove_bootstrap_competitions(db: AsyncSession) -> None:
    """Drop legacy seeded cups so only user-created competitions remain."""
    for name in LEGACY_DEMO_COMPETITION_NAMES:
        comp = (await db.execute(select(Competition).where(Competition.name == name))).scalar_one_or_none()
        if not comp:
            continue
        for team in (await db.execute(select(Team).where(Team.competition_id == comp.id))).scalars():
            team.competition_id = None
        for participant in (
            await db.execute(select(CompetitionParticipant).where(CompetitionParticipant.competition_id == comp.id))
        ).scalars():
            await db.delete(participant)
        await db.delete(comp)
    await db.flush()


async def seed_bootstrap_data(db: AsyncSession) -> None:
    for demo_user in (await db.execute(select(User).where(User.email.like("%@movegrid.demo")))).scalars().all():
        await db.delete(demo_user)
    await db.flush()

    cohort = (await db.execute(select(ClassGroup).where(ClassGroup.name == "City Movers"))).scalar_one_or_none()
    if not cohort:
        # Prefer renamed community group; fall back to older campus seed name.
        cohort = (await db.execute(select(ClassGroup).where(ClassGroup.name == "Campus Movers"))).scalar_one_or_none()
        if cohort:
            cohort.name = "City Movers"
            cohort.department = "Community"
        else:
            cohort = ClassGroup(name="City Movers", department="Community")
            db.add(cohort)
            await db.flush()

    await _remove_bootstrap_competitions(db)

    team_specs = [
        ("Late Night Legends", 6120, "LL", "#ffd447"),
        ("Park Dashers", 5480, "PD", "#8bd4f4"),
        ("Stair Squad", 4710, "SS", "#ff9a61"),
        ("Green Loopers", 3920, "GL", "#b7e88f"),
    ]
    teams: list[Team] = []
    for name, points, initials, color in team_specs:
        team = (await db.execute(select(Team).where(Team.name == name))).scalar_one_or_none()
        if not team and name == "Park Dashers":
            team = (await db.execute(select(Team).where(Team.name == "Quad Dashers"))).scalar_one_or_none()
            if team:
                team.name = "Park Dashers"
                team.avatar = _avatar(initials, color)
        if not team:
            team = Team(
                name=name,
                avatar=_avatar(initials, color),
                competition_points=points,
            )
            db.add(team)
            await db.flush()
        else:
            team.competition_points = max(team.competition_points, points)
        teams.append(team)

    zone = (await db.execute(select(Zone).limit(1))).scalar_one_or_none()
    if not zone:
        zone = Zone(
            name="Central Green",
            description="The neighborhood movement hub",
            latitude=40.7128,
            longitude=-74.006,
            qr_token=secrets.token_urlsafe(24),
        )
        db.add(zone)
        await db.flush()
        db.add_all(
            [
                Challenge(
                    title="Loop the Green",
                    description="Complete one lap around Central Green.",
                    type="Walk",
                    difficulty="Easy",
                    duration_minutes=12,
                    reward_points=120,
                    zone_id=zone.id,
                ),
                Challenge(
                    title="Stair Sprint",
                    description="Take the stairs to the top of a nearby public building.",
                    type="Stairs",
                    difficulty="Medium",
                    duration_minutes=8,
                    reward_points=180,
                    zone_id=zone.id,
                ),
            ]
        )
    else:
        if zone.description and "campus" in zone.description.lower():
            zone.description = "The neighborhood movement hub"
        if zone.qr_token == LEGACY_DEMO_QR:
            zone.qr_token = secrets.token_urlsafe(24)

    extra_missions = [
        (
            "10,000 Daily Steps Goal",
            "Hit 10,000 steps today to keep your daily movement streak alive.",
            "Walk",
            45,
            150,
        ),
        (
            "Hydration Hero: Drink 2L Water",
            "Track and drink 2 liters of water throughout the day.",
            "Hydration",
            5,
            100,
        ),
        (
            "City Park 5K Trail Run",
            "Sprint or jog through the main park trail circuit.",
            "Run",
            28,
            200,
        ),
    ]
    for title, description, ctype, duration, reward in extra_missions:
        existing = (
            await db.execute(select(Challenge).where(Challenge.title == title))
        ).scalar_one_or_none()
        if not existing:
            db.add(
                Challenge(
                    title=title,
                    description=description,
                    type=ctype,
                    duration_minutes=duration,
                    reward_points=reward,
                    zone_id=zone.id,
                )
            )
    await db.flush()

    desired_rewards = [
        {
            "title": "Cafe Voucher",
            "description": "Redeem for a drink or snack at a partner cafe.",
            "category": "Food",
            "points_required": 400,
            "stock": 40,
            "image": "/rewards/canteen.png",
        },
        {
            "title": "MOVEGRID Merch",
            "description": "Pick a MOVEGRID tee, tote, or sticker pack from the shop.",
            "category": "Merch",
            "points_required": 1200,
            "stock": 18,
            "image": "/rewards/college-merch.png",
        },
        {
            "title": "Event Pass",
            "description": "Priority entry to the next community fitness night.",
            "category": "Events",
            "points_required": 800,
            "stock": 25,
            "image": "/rewards/event-pass.png",
        },
        {
            "title": "Sports Merchandise",
            "description": "Training socks, water bottle, or gym towel from athletics partners.",
            "category": "Sports",
            "points_required": 950,
            "stock": 15,
            "image": "/rewards/sports-merch.png",
        },
        {
            "title": "Sponsor Gift",
            "description": "A surprise gift bag from a MOVEGRID partner.",
            "category": "Sponsors",
            "points_required": 1500,
            "stock": 10,
            "image": "/rewards/sponsor-gift.png",
        },
    ]
    existing_titles = {
        title
        for title in (
            await db.execute(select(Reward.title))
        ).scalars().all()
    }
    db.add_all(
        [
            Reward(**item, active=True)
            for item in desired_rewards
            if item["title"] not in existing_titles
        ]
    )

    exercise_count = (await db.execute(select(Exercise.id).limit(1))).scalar_one_or_none()
    if exercise_count is None:
        db.add_all(
            [
                Exercise(
                    name=item["name"],
                    description=item["description"],
                    category=item["category"],
                    difficulty=item["difficulty"],
                    duration_minutes=item["duration_minutes"],
                    target_reps=item["target_reps"],
                    instructions=item["instructions"],
                    points=item["points"],
                    requires_equipment=False,
                    is_active=True,
                )
                for item in SEED_EXERCISES
            ]
        )

    await db.flush()
    await refresh_all_leaderboard_ranks(db)

    # Seed previous ranks so movement arrows show on first load.
    from app.models.entities import LeaderboardRank

    ranks = (await db.execute(select(LeaderboardRank))).scalars().all()
    for row in ranks:
        if row.previous_rank is None:
            bump = ((row.subject_id + row.rank) % 5) - 2
            if bump == 0:
                bump = 1
            row.previous_rank = max(1, row.rank + bump)

    await db.commit()
