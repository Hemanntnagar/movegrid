from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exercise_catalog import SEED_EXERCISES
from app.core.security import hash_password
from app.models.entities import Challenge, ClassGroup, Competition, Exercise, Reward, Team, User, UserPresence, Zone
from app.services.leaderboard_service import refresh_all_leaderboard_ranks
from app.services.presence_service import DEMO_NEIGHBOR_EMAILS, DEMO_OFFSETS_M, offset_lat_lng

AVATAR_COLORS = [
    "#ffd447",
    "#ff9a61",
    "#8bd4f4",
    "#f3a8c7",
    "#b7e88f",
    "#c7b6f5",
    "#ffb36f",
    "#7fd4c2",
]


def _avatar(initials: str, color: str) -> str:
    return f"initials:{initials}:{color}"


SEED_MOVERS = [
    # name, email, move, streak, streak_score, minutes, level, team_index, avatar initials
    ("Maya Chen", "maya@movegrid.demo", 2840, 14, 420, 210, "Advanced", 0, "MC"),
    ("Jordan Lee", "jordan@movegrid.demo", 2690, 11, 365, 188, "Intermediate", 0, "JL"),
    ("Sam Rivera", "sam@movegrid.demo", 2210, 9, 290, 154, "Intermediate", 1, "SR"),
    ("Priya Nair", "priya@movegrid.demo", 1985, 12, 340, 142, "Advanced", 1, "PN"),
    ("Chris Park", "chris@movegrid.demo", 1760, 6, 180, 120, "Beginner", 2, "CP"),
    ("Taylor Brooks", "taylor@movegrid.demo", 1640, 8, 250, 116, "Intermediate", 2, "TB"),
    ("Riley Quinn", "riley@movegrid.demo", 1525, 5, 140, 98, "Beginner", 3, "RQ"),
    ("Casey Nguyen", "casey@movegrid.demo", 1410, 7, 210, 104, "Intermediate", 3, "CN"),
    ("Avery Kim", "avery@movegrid.demo", 1330, 4, 95, 86, "Beginner", 0, "AK"),
    ("Morgan Diaz", "morgan@movegrid.demo", 1285, 10, 310, 132, "Advanced", 1, "MD"),
    ("Jamie Ortiz", "jamie@movegrid.demo", 1190, 3, 70, 74, "Beginner", 2, "JO"),
    ("Harper Ellis", "harper@movegrid.demo", 1120, 6, 165, 90, "Intermediate", 3, "HE"),
    ("Drew Patel", "drew@movegrid.demo", 980, 2, 40, 58, "Beginner", 0, "DP"),
    ("Sky Alvarez", "sky@movegrid.demo", 860, 5, 125, 66, "Beginner", 1, "SA"),
]


async def seed_demo_data(db: AsyncSession) -> None:
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

    competition = (
        await db.execute(select(Competition).where(Competition.name == "Monthly Move Cup"))
    ).scalar_one_or_none()
    if not competition:
        competition = (
            await db.execute(select(Competition).where(Competition.name == "Fall Campus Cup"))
        ).scalar_one_or_none()
        if competition:
            competition.name = "Monthly Move Cup"
            competition.description = "Team competition for MOVE earned this month."
        else:
            competition = Competition(
                name="Monthly Move Cup",
                description="Team competition for MOVE earned this month. Stack points with your squad.",
                eligibility="Open to all members",
                min_points=0,
                min_streak=0,
                starts_at=datetime.utcnow() - timedelta(days=10),
                ends_at=datetime.utcnow() + timedelta(days=20),
                is_active=True,
            )
            db.add(competition)
            await db.flush()

    competition.eligibility = competition.eligibility or "Open to all members"
    competition.description = competition.description or "Team competition for MOVE earned this month."
    if not competition.ends_at:
        competition.ends_at = datetime.utcnow() + timedelta(days=20)

    extra_competitions = [
        {
            "name": "Weekend Step Sprint",
            "description": "Hit your step goals all weekend and climb the live standings.",
            "eligibility": "500+ MOVE points",
            "min_points": 500,
            "min_streak": 0,
            "starts_at": datetime.utcnow() + timedelta(days=2),
            "ends_at": datetime.utcnow() + timedelta(days=4),
            "is_active": True,
        },
        {
            "name": "Streak Keepers Challenge",
            "description": "Protect a multi-day streak while completing daily missions.",
            "eligibility": "3+ day streak",
            "min_points": 0,
            "min_streak": 3,
            "starts_at": datetime.utcnow() - timedelta(days=1),
            "ends_at": datetime.utcnow() + timedelta(days=13),
            "is_active": True,
        },
        {
            "name": "Sunrise 5K Relay",
            "description": "Early-bird relay — run or walk a 5K window before noon.",
            "eligibility": "Open to all members",
            "min_points": 0,
            "min_streak": 0,
            "starts_at": datetime.utcnow() + timedelta(days=7),
            "ends_at": datetime.utcnow() + timedelta(days=8),
            "is_active": True,
        },
    ]
    for spec in extra_competitions:
        existing = (
            await db.execute(select(Competition).where(Competition.name == spec["name"]))
        ).scalar_one_or_none()
        if existing:
            for key, value in spec.items():
                setattr(existing, key, value)
        else:
            db.add(Competition(**spec))
    await db.flush()

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
                competition_id=competition.id,
                competition_points=points,
            )
            db.add(team)
            await db.flush()
        else:
            team.competition_points = max(team.competition_points, points)
            team.competition_id = competition.id
        teams.append(team)

    month_key = f"{date.today().year:04d}-{date.today().month:02d}"
    password = hash_password("movegrid-demo")

    demo = (await db.execute(select(User).where(User.email == "demo@movegrid.demo"))).scalar_one_or_none()
    if not demo:
        demo = (await db.execute(select(User).where(User.email == "student@movegrid.demo"))).scalar_one_or_none()
        if demo:
            demo.email = "demo@movegrid.demo"
            demo.role = "member"
    if not demo:
        demo = User(
            email="demo@movegrid.demo",
            name="Alex Morgan",
            password_hash=password,
            role="member",
            class_id=cohort.id,
            team_id=teams[0].id,
            fitness_level="Beginner",
            total_points=2480,
            streak=7,
            streak_score=225,
            streak_month=month_key,
            last_activity_date=date.today() - timedelta(days=1),
            active_minutes=86,
            avatar=_avatar("AM", "#f3a8c7"),
        )
        db.add(demo)
    else:
        demo.class_id = demo.class_id or cohort.id
        demo.team_id = demo.team_id or teams[0].id
        demo.role = "member"
        if not demo.streak_month:
            demo.streak_month = month_key
        if demo.streak_score == 0:
            demo.streak_score = 225
        if not demo.avatar or demo.avatar == "/avatars/student.png":
            demo.avatar = _avatar("AM", "#f3a8c7")

    for index, (name, email, move, streak, streak_score, minutes, level, team_index, initials) in enumerate(SEED_MOVERS):
        existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if existing:
            existing.role = "member"
            continue
        db.add(
            User(
                email=email,
                name=name,
                password_hash=password,
                role="member",
                class_id=cohort.id,
                team_id=teams[team_index].id,
                fitness_level=level,
                total_points=move,
                streak=streak,
                streak_score=streak_score,
                streak_month=month_key,
                last_activity_date=date.today() - timedelta(days=(index % 3)),
                active_minutes=minutes,
                avatar=_avatar(initials, AVATAR_COLORS[index % len(AVATAR_COLORS)]),
            )
        )

    zone = (await db.execute(select(Zone).limit(1))).scalar_one_or_none()
    if not zone:
        zone = Zone(
            name="Central Green",
            description="The neighborhood movement hub",
            latitude=40.7128,
            longitude=-74.006,
            qr_token="movegrid-demo",
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

    # Seed live presence around Central Green for demo neighbors.
    hub_lat = zone.latitude if zone else 40.7128
    hub_lng = zone.longitude if zone else -74.006
    now = datetime.utcnow()
    for index, email in enumerate(DEMO_NEIGHBOR_EMAILS):
        neighbor = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if not neighbor:
            continue
        existing_presence = (
            await db.execute(select(UserPresence).where(UserPresence.user_id == neighbor.id))
        ).scalar_one_or_none()
        north, east = DEMO_OFFSETS_M[index % len(DEMO_OFFSETS_M)]
        lat, lng = offset_lat_lng(hub_lat, hub_lng, north, east)
        if existing_presence:
            existing_presence.latitude = lat
            existing_presence.longitude = lng
            existing_presence.is_sharing = True
            existing_presence.updated_at = now
        else:
            db.add(
                UserPresence(
                    user_id=neighbor.id,
                    latitude=lat,
                    longitude=lng,
                    is_sharing=True,
                    updated_at=now,
                )
            )

    await db.commit()
