# Mit-BE: Dating Application API

A Tinder-like backend REST API built with [Bun](https://bun.sh), [Hono](https://hono.dev/), PostgreSQL, and [Drizzle ORM](https://orm.drizzle.team/).

## Features
- Scalable Clean Architecture design
- User authentication via JWT (register returns `{user, token}`; login returns `{user, token}`)
- Swipe history mechanism with mutual match detection
- Recommendation engine that filters previously swiped profiles, scores by shared interests/relations, and enriches profiles with languages, photos, and social media
- Meets system: create meetups, explore others' meets, send/accept requests
- Messaging: send and receive messages between matched users
- User reporting
- User preference settings (age range, gender preference, distance)
- Role-based Access Control (Admin vs User) with dynamic Admin CRUD
- Fully containerized with Docker and Docker Compose

## Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [Bun](https://bun.sh) (for local development)

## Installation & Running

1. **Install Dependencies (local dev only)**:
   ```bash
   bun install
   ```

2. **Run via Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```
   > API on port **3001**, PostgreSQL on port **5433**.

3. **Database Schema Push & Seeding**:
   ```bash
   docker-compose exec api bun run db:setup
   ```

4. **Clean Reset (Optional)**:
   ```bash
   docker-compose down -v
   # then repeat steps 2 and 3
   ```

## Applying Code Changes in Docker

- **Source code changes (`src/`)** — restart container:
  ```bash
  docker-compose restart api
  ```
- **Dependency / config changes** — rebuild:
  ```bash
  docker-compose up -d --build
  ```

## Local Development (native Bun + Docker DB)

```bash
docker-compose up -d db
bun run --hot src/index.ts
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run db:push` | Push schema to Postgres |
| `bun run db:seed` | Seed roles and initial data |
| `bun run db:setup` | Push + seed (use for fresh installs) |
| `bun run index.ts` | Start production server |

## Default Administrator
Seeded automatically by `db:setup`:
- **Email**: `admin@datingapp.com`
- **Password**: `admin123`

---

## API Reference

All responses follow this envelope:
```json
{ "ok": true, "message": "...", "data": { ... } }
```

### Public Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | `{email, password, name}` | Register — returns `{user, token}` |
| POST | `/auth/login` | `{email, password}` | Login — returns `{user, token}` |

---

### Protected Endpoints (Bearer JWT required)

#### Profile — `/api/me`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/me` | — | Get current user's full profile (with interests, languages, relations, photos, preferences) |
| PUT | `/api/me` | `{name?, age?, job_title?, zodiac?, about_me?, looking_for?, social_medias?, profile_picture_url?, gender_id?, location_id?, interests?:uuid[], languages?:uuid[], relations?:uuid[]}` | Update profile fields (all optional) |
| PUT | `/api/me/preferences` | `{age_min?, age_max?, gender_preference?, looking_for?, max_distance_km?}` | Upsert user preferences |

#### Recommendation — `/api/profiles`

| Method | Path | Query | Description |
|--------|------|-------|-------------|
| GET | `/api/profiles` | `limit`, `offset` | Get unswiped profiles, scored by shared interests/relations, enriched with languages, photos, social_medias |

#### Swipes — `/api/swipes`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/swipes` | `{targetId, isLiked}` | Record swipe. Returns `{success, isMatch}` |

> Body accepts both camelCase (`targetId/isLiked`) and snake_case (`target_id/is_liked`).

#### Matches — `/api/matches`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/matches` | Get all mutual matches with last message preview |

#### Messages — `/api/messages`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/messages/:matchId` | — | Get conversation with a matched user (oldest first) |
| POST | `/api/messages/:matchId` | `{content}` | Send message to matched user (requires mutual match) |

#### Meets — `/api/meets`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/meets` | — | Explore open meets created by others |
| GET | `/api/meets/mine` | — | Get meets created by current user |
| POST | `/api/meets` | `{title, description?, meet_date?, location_id?, interest_ids?:uuid[]}` | Create a new meet |
| PUT | `/api/meets/:id` | `{status}` | Update meet status (`OPEN`, `DONE`, `CANCELLED`) — owner only |
| GET | `/api/meets/:id/requests` | — | List requests for a meet — owner only |
| POST | `/api/meets/:id/requests` | `{message?}` | Request to join a meet |
| PUT | `/api/meets/:id/requests/:requestId` | `{status}` | Accept or reject a request (`ACCEPTED`, `REJECTED`) — owner only |

#### Locations — `/api/locations`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/locations` | — | List all locations |
| POST | `/api/locations` | `{name, parent_id?, latitude?, longitude?}` | Create location |

#### Reports — `/api/reports`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/reports` | `{reported_id, reason, description?}` | Report a user |

---

### Admin Endpoints (Admin JWT required)

Generic CRUD for lookup tables. Valid `table` values: `genders`, `interests`, `relations`, `languages`.

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/admin/:table` | — | List all entries |
| POST | `/api/admin/:table` | `{name}` | Create entry |
| PUT | `/api/admin/:table/:id` | `{name}` | Update entry |
| DELETE | `/api/admin/:table/:id` | — | Delete entry |

---

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts with profile fields |
| `roles` | `user` / `admin` |
| `genders` | Gender lookup |
| `locations` | Hierarchical location data |
| `photos` | User photo gallery |
| `interests` | Interest tags |
| `user_interests` | User ↔ interest join |
| `relations` | Relationship-type tags |
| `user_relations` | User ↔ relation join |
| `languages` | Language tags |
| `user_languages` | User ↔ language join |
| `swipe_history` | Swipe records (`is_liked`, `is_swiped`) |
| `meets` | Meetup posts |
| `meet_interests` | Meet ↔ interest tags |
| `meet_requests` | Join requests for meets |
| `messages` | Direct messages between matched users |
| `reports` | User reports |
| `user_preferences` | Per-user filter preferences |
