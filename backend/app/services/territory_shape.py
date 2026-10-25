from __future__ import annotations

MIN_LOOP_CELLS = 8
MIN_FILL_CELLS = 6
MAX_FILL_CELLS = 900
MAX_TRAIL_CELLS = 240
CLOSE_GAP = 1


def line_cells(start: tuple[int, int], end: tuple[int, int]) -> list[tuple[int, int]]:
    """Bresenham cells from start to end, inclusive."""
    x0, y0 = start
    x1, y1 = end
    cells: list[tuple[int, int]] = []
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy
    x, y = x0, y0
    while True:
        cells.append((x, y))
        if x == x1 and y == y1:
            return cells
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy


def append_cells(trail: list[tuple[int, int]], incoming: list[tuple[int, int]]) -> list[tuple[int, int]]:
    merged = list(trail)
    for cell in incoming:
        if not merged:
            merged.append(cell)
            continue
        if cell == merged[-1]:
            continue
        gap = line_cells(merged[-1], cell)
        merged.extend(gap[1:])
        if len(merged) > MAX_TRAIL_CELLS:
            merged = merged[-MAX_TRAIL_CELLS:]
    return merged


def _segments_intersect(
    a: tuple[int, int],
    b: tuple[int, int],
    c: tuple[int, int],
    d: tuple[int, int],
) -> bool:
    def orient(p: tuple[int, int], q: tuple[int, int], r: tuple[int, int]) -> int:
        value = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
        if value == 0:
            return 0
        return 1 if value > 0 else 2

    def on_segment(p: tuple[int, int], q: tuple[int, int], r: tuple[int, int]) -> bool:
        return min(p[0], r[0]) <= q[0] <= max(p[0], r[0]) and min(p[1], r[1]) <= q[1] <= max(p[1], r[1])

    o1, o2, o3, o4 = orient(a, b, c), orient(a, b, d), orient(c, d, a), orient(c, d, b)
    if o1 != o2 and o3 != o4:
        return True
    if o1 == 0 and on_segment(a, c, b):
        return True
    if o2 == 0 and on_segment(a, d, b):
        return True
    if o3 == 0 and on_segment(c, a, d):
        return True
    if o4 == 0 and on_segment(c, b, d):
        return True
    return False


def find_closed_loop(trail: list[tuple[int, int]]) -> list[tuple[int, int]] | None:
    """Return the ring if the snake path closed a circle, square, or any shape."""
    if len(trail) < MIN_LOOP_CELLS:
        return None

    last = trail[-1]
    for index, cell in enumerate(trail[:-MIN_LOOP_CELLS + 1]):
        if max(abs(cell[0] - last[0]), abs(cell[1] - last[1])) <= CLOSE_GAP:
            ring = trail[index:]
            if len(fill_loop(ring)) >= MIN_FILL_CELLS:
                return ring

    if len(trail) >= 4:
        tail_a, tail_b = trail[-2], trail[-1]
        for index in range(0, len(trail) - 3):
            if _segments_intersect(trail[index], trail[index + 1], tail_a, tail_b):
                ring = trail[index:]
                if len(ring) >= MIN_LOOP_CELLS and len(fill_loop(ring)) >= MIN_FILL_CELLS:
                    return ring
    return None


def point_in_ring(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        intersects = (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
        if intersects:
            inside = not inside
        j = i
    return inside


def fill_loop(ring_cells: list[tuple[int, int]]) -> set[tuple[int, int]]:
    if len(ring_cells) < 3:
        return set(ring_cells)
    filled = set(ring_cells)
    xs = [x for x, _ in ring_cells]
    ys = [y for _, y in ring_cells]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    if (max_x - min_x + 1) * (max_y - min_y + 1) > MAX_FILL_CELLS * 2:
        return filled
    vertices = [(x + 0.5, y + 0.5) for x, y in ring_cells]
    if vertices[0] != vertices[-1]:
        vertices.append(vertices[0])
    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            if (x, y) in filled:
                continue
            if point_in_ring(x + 0.5, y + 0.5, vertices):
                filled.add((x, y))
            if len(filled) >= MAX_FILL_CELLS:
                return filled
    return filled
