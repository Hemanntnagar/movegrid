import math

from app.services.presence_service import format_distance, haversine_m, offset_lat_lng


def test_haversine_roughly_100m_north():
    lat, lng = 40.7128, -74.006
    nlat, nlng = offset_lat_lng(lat, lng, 100, 0)
    distance = haversine_m(lat, lng, nlat, nlng)
    assert 95 <= distance <= 105


def test_format_distance():
    assert format_distance(42) == "42 m"
    assert format_distance(1500).endswith("km")


def test_offset_east_moves_longitude():
    lat, lng = 12.97, 77.59
    _, nlng = offset_lat_lng(lat, lng, 0, 50)
    assert nlng > lng
    assert math.isclose(haversine_m(lat, lng, lat, nlng), 50, abs_tol=2)
