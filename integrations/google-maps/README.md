# Google Maps Integration

The platform uses the Google Maps Platform for:

| API | Usage |
|-----|-------|
| Directions API | ETA and route calculation for the matching service |
| Geocoding API | Address → coordinate resolution on ride request |
| Places API | Autocomplete for pickup/dropoff search |
| Maps JavaScript SDK | Interactive map in web-app and dispatcher-panel |
| Maps SDK for Android/iOS | Native map in passenger and driver apps |

## Configuration

Set the following environment variables:

```
GOOGLE_MAPS_API_KEY=<your-key>
GOOGLE_MAPS_DIRECTIONS_API_KEY=<your-server-side-key>
```

The client-side (JavaScript/Mobile) key must have HTTP referrer and bundle ID restrictions. The server-side key must have IP restrictions.

## Rate Limits

| API | Default QPS | Burst |
|-----|------------|-------|
| Directions | 50 | 500 |
| Geocoding | 50 | 500 |
| Places Autocomplete | 100 | 1000 |

Configure `GOOGLE_MAPS_CACHE_TTL_SECONDS` to cache geocoding results and avoid redundant API calls for repeated pickup addresses.

## Fallback

Set `MAP_PROVIDER=mapbox` in `tenant.config.json` to switch to MapBox for tenants where Google Maps is unavailable.
