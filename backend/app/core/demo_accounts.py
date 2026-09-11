"""Legacy seeded demo identities — hidden from leaderboards and similar public rankings."""

LEGACY_DEMO_EMAIL_SUFFIX = "@movegrid.demo"

LEGACY_DEMO_TEAM_NAMES = (
    "Late Night Legends",
    "Park Dashers",
    "Quad Dashers",
    "Stair Squad",
    "Green Loopers",
)


def is_legacy_demo_email(email: str) -> bool:
    return email.lower().endswith(LEGACY_DEMO_EMAIL_SUFFIX)
