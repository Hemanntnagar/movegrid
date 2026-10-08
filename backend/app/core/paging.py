"""Shared limit/offset paging helpers for space-efficient DB reads."""

from __future__ import annotations


DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def clamp_limit(limit: int | None, *, default: int = DEFAULT_PAGE_SIZE, maximum: int = MAX_PAGE_SIZE) -> int:
    if limit is None:
        return default
    return max(1, min(int(limit), maximum))


def clamp_offset(offset: int | None) -> int:
    if offset is None:
        return 0
    return max(0, int(offset))


def page_from_offset(offset: int, limit: int) -> int:
    if limit <= 0:
        return 1
    return (offset // limit) + 1


def paging_meta(*, total: int, limit: int, offset: int) -> dict:
    """Build standard paging metadata for API responses."""
    total = max(0, int(total))
    limit = clamp_limit(limit)
    offset = clamp_offset(offset)
    has_more = offset + limit < total
    return {
        "page": page_from_offset(offset, limit),
        "page_size": limit,
        "offset": offset,
        "limit": limit,
        "total": total,
        "has_more": has_more,
    }
