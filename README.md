# Mit-BE: Dating Application API

A Tinder-like backend REST API built with [Bun](https://bun.sh), [Hono](https://hono.dev/), PostgreSQL, and [Drizzle ORM](https://orm.drizzle.team/).

## Features
- Scalable Clean Architecture design
- User authentication via JWT
- Swipe history mechanism with match detection capabilities
- Recommendation engine algorithms to filter previously swiped profiles
- Role-based Access Control (Admin vs User) and Dynamic Admin CRUD capabilities
- Fully containerized with Docker and Docker Compose

## Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose
- [Bun](https://bun.sh) (for local installation/development)

## Installation & Running

1. **Install Dependencies (Local dev only)**:
   ```bash
   bun install
   ```

2. **Run via Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```
   > By default, the API will be exposed on your host's port **3001**, and PostgreSQL on port **5433**.

3. **Database Schema Push & Seeding**:
   Because a newly initialized Docker volume starts completely bare, you must first push the raw database schemas and subsequently run the seeder script. To simplify this, the `db:setup` command executes both tasks synchronously!
   ```bash
   docker-compose exec api bun run db:setup
   ```

4. **Clean Reset (Optional)**:
   If you want to remove all containers, images, and **volumes** (wiping the database completely), run:
   ```bash
   docker-compose down -v
   ```
   Then follow step 2 and 3 again for a fresh start.

## Applying Code Changes in Docker

If you modify files locally while running Docker:
1. **Source Code changes (`src/`):** Since the `src/` folder is mounted as a volume, you can simply restart the API container to run the fresh code:
   ```bash
   docker-compose restart api
   ```
2. **Dependency or Config changes (`package.json`, `Dockerfile`, `.env`):** You must rebuild the images from scratch:
   ```bash
   docker-compose up -d --build
   ```

## Development

If you prefer to run the application natively utilizing a local Bun runtime while simply orchestrating the DB through Docker:

```bash
# Start just the database
docker-compose up -d db

# Run bun locally in watch mode
bun run --hot src/index.ts
```

## Available Scripts

- `bun run db:push`: Synchronizes table schemas against postgres instances natively.
- `bun run db:seed`: Seeds `roles` and initial structural database entities statically.
- `bun run db:setup`: **Combines push + seed sequentially!** (Use this for new setups).
- `bun run index.ts`: Start production server

## Default Administrator
When you invoke the seeding script, it constructs an initial Admin profile to manage your application domains:
- **Email**: `admin@datingapp.com`
- **Password**: `admin123`

## Admin CRUD Sub-routes
Accessible only using JWT tokens verifying an `admin` role designation.
- Database entries for app configuration generic mappings:
  - `GET /api/admin/genders`
  - `POST /api/admin/interests`
  - `PUT /api/admin/relations/:id`
  - `DELETE /api/admin/languages/:id`
