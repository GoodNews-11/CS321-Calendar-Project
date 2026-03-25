# SICS — Smart Integrated Calendar System
### Backend API Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack & Justifications](#2-technology-stack--justifications)
3. [Assumptions](#3-assumptions)
4. [Requirement & Architecture Changes](#4-requirement--architecture-changes)
5. [Design Patterns Used](#5-design-patterns-used)
6. [Standards & Compliance](#6-standards--compliance)
7. [Project Structure](#7-project-structure)
8. [Getting Started](#8-getting-started)
9. [Environment Variables](#9-environment-variables)
10. [How to Seed Data](#10-how-to-seed-data)
11. [API Reference](#11-api-reference)
12. [Class Diagram](#12-class-diagram)
13. [Dynamic Analysis Diagrams](#13-dynamic-analysis-diagrams)
14. [User Experience Design Considerations](#14-user-experience-design-considerations)
15. [Non-Functional Requirements](#15-non-functional-requirements)

---

## 1. System Overview

The **Smart Integrated Calendar System (SICS)** is a backend REST API that powers a unified personal productivity platform. It combines scheduling, weather forecasting, reminder notifications, Google Calendar synchronization, and holiday tracking into a single centralized service.

**Target Users:** Students, professionals, and general users who need to efficiently organize tasks and events across multiple devices.

**Core Capabilities:**

- User registration, JWT authentication, and profile management
- Full CRUD for calendar events with color coding and completion tracking
- Reminder scheduling with priority levels and repeat patterns (daily, weekly, custom)
- Real-time weather data from OpenWeather API 2.5 with MongoDB caching (1-hour TTL)
- Bidirectional Google Calendar sync via OAuth 2.0
- Holiday data for Bangladesh and global regions
- Cross-device synchronization via MongoDB Atlas cloud database

---

## 2. Technology Stack & Justifications

### Runtime & Framework

| Technology | Version | Justification |
|---|---|---|
| **Node.js** | 18+ | Non-blocking I/O ideal for concurrent API requests and async operations like weather fetching and reminder scheduling. Single language across stack reduces cognitive overhead |
| **Express.js** | 4.x | Minimal, unopinionated framework mapping directly to the MVC architecture defined in requirements. Widely documented with large ecosystem of compatible middleware |

### Database

| Technology | Justification |
|---|---|
| **MongoDB Atlas** | Document-oriented storage fits the flexible, nested nature of event and weather data. Atlas provides managed cloud hosting, built-in replication, automatic TTL index expiry (used for weather cache), and cross-device sync without additional infrastructure |
| **Mongoose** | Schema validation, model relationships via ObjectId references, index management, and query abstraction. Keeps data integrity in a multi-user system without writing raw MongoDB queries |

### Authentication & Security

| Technology | Justification |
|---|---|
| **jsonwebtoken (JWT)** | Stateless token-based auth eliminates server-side session storage, making the system horizontally scalable and naturally supporting cross-device sync |
| **bcryptjs** | Industry-standard adaptive password hashing with configurable salt rounds. Protects credentials at rest against brute-force and rainbow table attacks |
| **helmet** | Automatically sets secure HTTP headers — XSS protection, content-type sniffing prevention, clickjacking protection — with zero configuration |
| **express-rate-limit** | Enforces the NFR of supporting concurrent users by preventing API abuse and DDoS attacks on a per-IP basis |
| **cors** | Controls which frontend origins can access the API, preventing unauthorized cross-origin requests |

### External APIs & Integrations

| Technology | Justification |
|---|---|
| **OpenWeather API 2.5** | Free tier providing current weather and 5-day/3-hour forecasts. No billing setup required. Sufficient for FR7 (weather type + temperature display) |
| **Google Calendar API + googleapis** | Official Node.js client for bidirectional calendar sync. OAuth 2.0 refresh token flow enables persistent sync without requiring repeated user login (FR9) |

### Scheduling

| Technology | Justification |
|---|---|
| **node-cron** | Lightweight in-process scheduler for reminder notifications. Avoids overhead of a separate message queue (RabbitMQ, Redis) for a system of this scale |

### Validation & Utilities

| Technology | Justification |
|---|---|
| **express-validator** | Declarative input validation within route definitions. Keeps controllers clean and provides structured error arrays for clean frontend integration |
| **axios** | Promise-based HTTP client for OpenWeather and Google API calls. Supports interceptors, timeout configuration, and structured error handling |
| **nodemon** | Development-only: auto-restarts server on file changes, accelerating the development cycle |

---

## 3. Assumptions

1. **Frontend is a separate application.** This repository is backend-only. The frontend (web or mobile) communicates exclusively via the REST API documented here.

2. **OpenWeather free tier (2.5) is sufficient.** True hourly forecasts from One Call API 3.0 require billing. The 2.5 API covers all FR7 requirements. The system compensates by grouping 3-hour forecast intervals into daily summaries using the midday (12:00) entry as representative.

3. **Reminders are server-logged only in v1.** Push notifications via FCM or APNs are outside scope for this deliverable. The reminder service logs trigger events server-side. WebSocket or polling integration is deferred to a future phase.

4. **Google Calendar sync is optional per user.** Users without a Google account can use all core scheduling features. The `googleRefreshToken` field on the User model is nullable. Auto-sync on event CRUD silently skips if the user has not connected Google.

5. **All timestamps are stored and transmitted in UTC.** The frontend is responsible for local timezone conversion and display formatting.

6. **Passwords are never returned in API responses.** All User queries use `.select('-password')` to exclude the password field from every response.

7. **MongoDB Atlas free tier (M0) is used for development and testing.** A production deployment would require an M10+ dedicated cluster for the performance guarantees stated in the NFRs.

8. **Single-region deployment for MVP.** The system is initially scoped for Bangladesh-based users. Weather defaults to Dhaka coordinates. Holiday seed data prioritizes BD national holidays.

9. **Google OAuth callback is tested manually in v1.** A production frontend would handle the OAuth redirect flow transparently. In development, the authorization code is manually copied from the browser redirect and submitted via Postman.

---

## 4. Requirement & Architecture Changes

### Changes from Original Requirements

| Original Requirement | Change Made | Reason |
|---|---|---|
| OpenWeather One Call API 3.0 | Downgraded to 2.5 free API | 3.0 requires billing account setup. 2.5 API is fully free and satisfies all FR7 weather display requirements |
| True 48-hour hourly forecast | Replaced with 8 × 3-hour entries (24h window) | Limitation of the 2.5 free API endpoint structure |
| Push notifications for reminders | Server-side scheduling + console logging only | Push infrastructure (Firebase, APNs) is out of scope for the backend MVP deliverable |
| Cross-device sync via dedicated sync service | Centralized MongoDB Atlas serves as sync layer | Atlas replication and cloud hosting eliminates the need for a separate sync microservice |
| Estimated sync effort: 10 working days | Reduced scope: OAuth + bidirectional sync only, no conflict resolution | Full conflict resolution (e.g., last-write-wins vs. merge strategies) deferred to a post-MVP phase |

### Architectural Style Refinements

The original MVC + Client-Server + Observer architecture is preserved and extended with **Three-Tier Architecture** as the overarching structural pattern:

```
Tier 1 — Presentation:  Frontend client + External APIs (OpenWeather, Google Calendar)
Tier 2 — Application:   Express.js — Routes → Middleware → Controllers → Services
Tier 3 — Data:          MongoDB Atlas — 5 collections with indexes and TTL
```

The **Observer pattern** is concretely implemented in `services/reminder.service.js`. When a reminder is created or updated, a job observer is registered via `scheduleReminderJob()`. Observers fire asynchronously without blocking the main request thread. On server restart, `loadAndScheduleAll()` reloads all active observers from the database.

The **Cache-Aside pattern** is implemented in `services/weather.service.js` to reduce OpenWeather API calls and enforce the ≤2s response time NFR.

---

## 5. Design Patterns Used

### 1. MVC (Model-View-Controller)
The primary architectural pattern separating concerns across three layers:
- **Model** — `/models/`: Mongoose schemas define structure, validation, and indexes
- **Controller** — `/controllers/`: Business logic, request handling, response formatting
- **View** — JSON REST API responses (the frontend renders the view layer)

### 2. Repository Pattern (via Mongoose)
Mongoose models act as repositories abstracting all database operations. Controllers never write raw MongoDB queries — they use model methods (`find`, `findOneAndUpdate`, `create`, `deleteMany`). This decouples business logic from the persistence layer.

### 3. Observer Pattern
`services/reminder.service.js` implements Observer. When a reminder is created (`createReminder` in controller), a job observer is registered via `scheduleReminderJob()`. When event state changes (update or delete), observers are cancelled (`cancelReminderJob`) and re-registered. `loadAndScheduleAll()` on startup re-attaches all persisted observers.

### 4. Middleware Chain — Chain of Responsibility
Every protected route passes through an ordered chain of handlers:
```
Request → CORS → Helmet → RateLimit → JSON Parser → Auth Middleware → Validator → Controller → Error Handler
```
Each middleware either calls `next()` to continue the chain or short-circuits with an error response.

### 5. Cache-Aside Pattern
`services/weather.service.js`:
1. Check `WeatherCache` collection for a non-expired entry matching `{lat, lon}`
2. Cache hit → return cached data immediately (no API call)
3. Cache miss → fetch from OpenWeather → store with TTL `expiresAt` → return data
MongoDB TTL index automatically deletes stale entries when `expiresAt` is reached.

### 6. Singleton Pattern
`config/db.js` exports a single `connectDB()` function. Mongoose maintains one shared connection pool across all modules — there is only ever one active database connection per server process.

### 7. Factory Pattern
`generateToken()` in `auth.controller.js` is a factory function that consistently produces JWT tokens with a defined payload shape, algorithm, and expiry from any `userId` input.

### 8. Facade Pattern
`services/calendar.service.js` acts as a facade over the Google Calendar API complexity. Controllers call simple methods (`pushEventToGoogle`, `pullEventsFromGoogle`, `syncAll`) without knowing anything about OAuth token refreshing, Google event format mapping, or API pagination.

---

## 6. Standards & Compliance

### REST API Standards
- Noun-based URLs, correct HTTP verbs (GET / POST / PUT / PATCH / DELETE)
- Standard HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 429 Too Many Requests, 500 Internal Server Error
- Consistent JSON response envelope: `{ message, data }` on success, `{ message, errors[] }` on validation failure

### Security Standards (OWASP Top 10)
- **Injection** — Mongoose schema validation and type coercion prevent NoSQL injection
- **Broken Authentication** — JWT with expiry + bcrypt (salt rounds = 10) + rate limiting on auth routes
- **Sensitive Data Exposure** — Passwords excluded from all responses; HTTPS enforced in production; Atlas encrypts data at rest
- **XSS** — Helmet sets `X-XSS-Protection` and `Content-Security-Policy` headers
- **CSRF** — Stateless JWT eliminates session-based CSRF vectors
- **Rate Limiting** — `express-rate-limit` caps at 100 requests per 15 minutes per IP

### Data Standards
- **ISO 8601** date/time format for all timestamps in API input and output
- **UTC storage** — all dates stored in UTC in MongoDB; frontend handles timezone display
- **Hex color validation** — `isHexColor()` validator enforces valid CSS hex codes for event colors (FR6)

### OAuth 2.0 Standard
Google Calendar integration follows the **Authorization Code Flow with PKCE** via the `googleapis` library:
- Offline access type to obtain refresh tokens
- Refresh tokens stored encrypted at rest in MongoDB Atlas
- Access tokens are never persisted — refreshed on demand per request

### Environment Standards
- All secrets stored in `.env`, never hardcoded
- `.env` excluded from version control via `.gitignore`
- Environment config centralized and exported from `config/env.js`
- Production deployments must set `NODE_ENV=production`

### HTTP Standards
- `Authorization: Bearer <token>` header standard for all protected routes
- `Content-Type: application/json` on all responses
- CORS configured to allowlist trusted frontend origins only in production

---

## 7. Project Structure

```
sics-backend/
├── server.js                    Entry point: middleware stack, route mounting, server start
├── .env                         Environment variables (never committed)
├── .gitignore
├── package.json
│
├── config/
│   ├── db.js                    MongoDB Atlas connection — Singleton pattern
│   └── env.js                   Centralized environment variable exports
│
├── models/                      Mongoose schemas — Model layer of MVC
│   ├── User.js                  Auth credentials, location, theme, Google refresh token
│   ├── Event.js                 Title, times, color, completion status, Google event ID
│   ├── Reminder.js              Priority, repeat pattern, next trigger time
│   ├── WeatherCache.js          Cached API response with TTL expiry index
│   └── Holiday.js               Holiday name, date, region (BD / US / global)
│
├── routes/                      Express routers — URL to controller mapping
│   ├── auth.routes.js           /api/auth/*
│   ├── event.routes.js          /api/events/*
│   ├── reminder.routes.js       /api/reminders/*
│   ├── weather.routes.js        /api/weather/*
│   ├── user.routes.js           /api/users/*
│   └── calendar.routes.js       /api/calendar/*
│
├── controllers/                 Business logic — Controller layer of MVC
│   ├── auth.controller.js       register, login, getMe
│   ├── event.controller.js      CRUD + toggleComplete + auto Google sync
│   ├── reminder.controller.js   CRUD + scheduleReminderJob integration
│   ├── weather.controller.js    getWeather, getForecast, saveLocation
│   ├── user.controller.js       getProfile, updateProfile, changePassword
│   └── calendar.controller.js   OAuth flow, sync, push, pull, disconnect
│
├── middleware/
│   ├── auth.middleware.js       JWT verification → attaches req.userId
│   ├── validate.middleware.js   express-validator error formatter
│   └── error.middleware.js      Global error handler (last in chain)
│
├── services/                    External integrations and complex business logic
│   ├── reminder.service.js      Observer pattern: schedule/cancel/reload jobs
│   ├── weather.service.js       Cache-Aside: OpenWeather fetch + MongoDB cache
│   └── calendar.service.js      Facade: Google OAuth, push, pull, bidirectional sync
│
└── seed/                        Database population scripts
    ├── seedUsers.js             3 sample users with bcrypt-hashed passwords
    ├── seedEvents.js            14 events distributed across 3 users
    ├── seedReminders.js         Reminders linked to future events
    ├── seedHolidays.js          BD national + global holidays for current year
    └── seedWeather.js           Pre-cached weather for Dhaka and Chittagong
```

---

## 8. Getting Started

### Prerequisites

- Node.js 18 or higher (`node --version`)
- npm 9 or higher (`npm --version`)
- MongoDB Atlas account — free M0 cluster
- OpenWeather account — free API key from openweathermap.org
- Google Cloud Console project with Calendar API enabled (for sync feature)
- Postman or any REST client for testing

### Installation

**Step 1 — Clone the repository:**
```powershell
git clone https://github.com/yourusername/sics-backend.git
cd sics-backend
```

**Step 2 — Install all dependencies:**
```powershell
npm install
```

**Step 3 — Create your environment file:**
```powershell
New-Item .env
```
Fill in all required variables (see [Environment Variables](#9-environment-variables) section below).

**Step 4 — Start the development server:**
```powershell
npm run dev
```

**Step 5 — Verify the server is running:**

Open Postman or your browser and visit `http://localhost:5000/`

Expected response:
```json
{ "message": "SICS API running" }
```

Expected terminal output:
```
MongoDB connected: sics.oo4f5rt.mongodb.net
Scheduled 0 reminders
Server running on port 5000
```

### Available Scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Runs with Nodemon — auto-restarts on file changes |
| Production | `npm start` | Runs directly with Node.js |
| Seed all | `npm run seed` | Runs all 5 seed files in correct dependency order |
| Seed users | `npm run seed:users` | Seeds 3 sample users only |
| Seed events | `npm run seed:events` | Seeds 14 sample events (requires users) |
| Seed reminders | `npm run seed:reminders` | Seeds reminders (requires users + events) |
| Seed holidays | `npm run seed:holidays` | Seeds BD + global holidays |
| Seed weather | `npm run seed:weather` | Pre-caches weather for Dhaka + Chittagong |

---

## 9. Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
MONGO_URI=mongodb+srv://root:12345@sics.oo4f5rt.mongodb.net/sics?retryWrites=true&w=majority
JWT_SECRET=sics_super_secret_jwt_key_2025
JWT_EXPIRES_IN=7d
OPENWEATHER_API_KEY=f3955af4bc9cf5f087010e03052a6d61
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NODE_ENV=development
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port. Defaults to 5000 |
| `NODE_ENV` | Yes | `development` or `production` |
| `MONGO_URI` | Yes | Full MongoDB Atlas connection string including database name |
| `JWT_SECRET` | Yes | Long random string for signing tokens. Never share this |
| `JWT_EXPIRES_IN` | No | Token expiry. Defaults to `7d` |
| `OPENWEATHER_API_KEY` | Yes | From openweathermap.org → API keys tab |
| `GOOGLE_CLIENT_ID` | For sync | From Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | For sync | From Google Cloud Console → Credentials |
| `GOOGLE_REDIRECT_URI` | For sync | Must match exactly what is set in Google Cloud Console |

---

## 10. How to Seed Data

Seed files populate MongoDB with realistic sample data for development and testing.

> **Order matters.** Events depend on Users. Reminders depend on both.

### Run all seeds at once (recommended):
```powershell
npm run seed
```

### Run individual seeds in order:
```powershell
# 1. Users first — always run this first
node seed/seedUsers.js

# 2. Events — requires users to exist
node seed/seedEvents.js

# 3. Reminders — requires users and events
node seed/seedReminders.js

# 4. Holidays — independent, any order
node seed/seedHolidays.js

# 5. Weather — independent, requires valid API key
node seed/seedWeather.js
```

### Seeded users (all passwords: `123456`):

| Name | Email | Location | Theme |
|---|---|---|---|
| Alice Rahman | alice@gmail.com | Dhaka | Light |
| Bob Hasan | bob@gmail.com | Dhaka | Dark |
| Carol Islam | carol@gmail.com | Chittagong | Light |

### Seeded data summary:

| Collection | Count | Description |
|---|---|---|
| `users` | 3 | Hashed passwords, saved locations, theme preferences |
| `events` | 14 | Mix of academic, professional, personal events with colors |
| `reminders` | ~10 | One per future event + one weekly repeating reminder |
| `holidays` | 11 | BD national holidays + global holidays for current year |
| `weathercaches` | 2 | Pre-fetched weather for Dhaka and Chittagong |

> Seeds are **idempotent** — each file clears its collection before inserting. Safe to re-run at any time.

---

## 11. API Reference

**Base URL:** `http://localhost:5000/api`

All protected routes `(🔒)` require:
```
Authorization: Bearer <your_jwt_token>
```

---

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login and receive JWT |
| GET | `/auth/me` | 🔒 | Get current user profile |

**Register request body:**
```json
{
  "name": "Alice Rahman",
  "email": "alice@gmail.com",
  "password": "123456"
}
```

**Login response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1f...",
    "name": "Alice Rahman",
    "email": "alice@gmail.com",
    "theme": "light",
    "location": { "lat": 23.8103, "lon": 90.4125, "city": "Dhaka" }
  }
}
```

---

### Events — `/api/events` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/events?month=6&year=2025` | Get events filtered by month and year |
| GET | `/events/:id` | Get single event |
| POST | `/events` | Create event (auto-syncs to Google if connected) |
| PUT | `/events/:id` | Update event (auto-syncs to Google if connected) |
| DELETE | `/events/:id` | Delete event (auto-removes from Google if connected) |
| PATCH | `/events/:id/complete` | Toggle completion status |

**Create event request body:**
```json
{
  "title": "Math Exam",
  "description": "Chapter 1 to 5",
  "startTime": "2025-06-15T09:00:00.000Z",
  "endTime": "2025-06-15T11:00:00.000Z",
  "isAllDay": false,
  "color": "#EF4444"
}
```

---

### Reminders — `/api/reminders` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reminders` | Get all reminders with populated event titles |
| GET | `/reminders/:id` | Get single reminder |
| POST | `/reminders` | Create and schedule reminder |
| PUT | `/reminders/:id` | Update and reschedule reminder |
| DELETE | `/reminders/:id` | Delete and cancel reminder job |

**Create reminder request body:**
```json
{
  "eventId": "64a1f3b2c...",
  "minutesBefore": 30,
  "priority": "high",
  "repeatPattern": "none"
}
```

`priority`: `low` | `medium` | `high`

`repeatPattern`: `none` | `daily` | `weekly` | `custom`

---

### Weather — `/api/weather` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/weather` | Current weather (saved location or `?lat=&lon=`) |
| GET | `/weather/forecast` | 5-day daily forecast |
| PUT | `/weather/location` | Save user location for auto weather lookup |

**Save location request body:**
```json
{
  "lat": 23.8103,
  "lon": 90.4125,
  "city": "Dhaka"
}
```

**Weather response:**
```json
{
  "location": { "lat": 23.81, "lon": 90.41 },
  "weather": {
    "current": {
      "temp": 31,
      "feelsLike": 36,
      "humidity": 78,
      "description": "light rain",
      "main": "Rain",
      "cityName": "Dhaka",
      "country": "BD"
    },
    "hourly": [...],
    "daily": [...]
  }
}
```

---

### Users — `/api/users` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/profile` | Get user profile |
| PUT | `/users/profile` | Update name, location, theme |
| PUT | `/users/change-password` | Change password |

---

### Google Calendar — `/api/calendar` 🔒

| Method | Endpoint | Description |
|---|---|---|
| GET | `/calendar/oauth/url` | Get Google consent page URL |
| GET | `/calendar/oauth/callback` | Handle OAuth redirect from Google |
| POST | `/calendar/sync` | Full bidirectional sync |
| POST | `/calendar/push/:id` | Push one SICS event to Google |
| GET | `/calendar/pull` | Pull Google events into SICS (next 30 days) |
| DELETE | `/calendar/disconnect` | Remove Google Calendar connection |

**OAuth flow:**
1. Call `GET /api/calendar/oauth/url` → get Google consent URL
2. Open URL in browser → grant calendar permission
3. Google redirects to callback URL with `?code=...`
4. Call `GET /api/calendar/oauth/callback?code=...` → token saved

**Sync response:**
```json
{
  "message": "Calendar synced successfully",
  "pulled": 3,
  "pushed": 6,
  "skipped": 2
}
```

---

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request or validation error |
| 401 | Unauthorized — missing or invalid JWT |
| 404 | Resource not found |
| 429 | Too many requests — rate limit hit |
| 500 | Internal server error |

---

## 12. Class Diagram

```
┌─────────────────────────────────────┐
│               User                  │
├─────────────────────────────────────┤
│ - _id          : ObjectId (PK)      │
│ - name         : String             │
│ - email        : String (unique)    │
│ - password     : String (hashed)    │
│ - location     : {                  │
│     lat        : Number             │
│     lon        : Number             │
│     city       : String             │
│   }                                 │
│ - theme        : Enum[light, dark]  │
│ - googleRefreshToken : String       │
│ - createdAt    : Date               │
│ - updatedAt    : Date               │
├─────────────────────────────────────┤
│ + register()                        │
│ + login()                           │
│ + updateProfile()                   │
│ + changePassword()                  │
│ + saveLocation()                    │
└────────────────┬────────────────────┘
                 │ 1
        ┌────────┴────────┐
        │ 1..*            │ 1..*
┌───────▼──────────────┐  ┌───────────▼──────────┐
│         Event        │  │       Reminder        │
├──────────────────────┤  ├───────────────────────┤
│ - _id      : ObjId   │  │ - _id      : ObjId    │
│ - userId   : ObjId   │  │ - userId   : ObjId    │
│ - title    : String  │  │ - eventId  : ObjId    │
│ - description: String│  │ - minutesBefore: Int  │
│ - startTime: Date    │  │ - priority : Enum     │
│ - endTime  : Date    │  │   [low,medium,high]   │
│ - isAllDay : Boolean │  │ - repeatPattern: Enum │
│ - color    : String  │  │   [none,daily,weekly, │
│ - isCompleted: Bool  │  │    custom]            │
│ - googleEventId: Str │  │ - customCron : String │
│ - createdAt: Date    │  │ - nextTriggerAt: Date │
│ - updatedAt: Date    │  │ - isActive  : Boolean │
├──────────────────────┤  ├───────────────────────┤
│ + create()           │  │ + create()            │
│ + update()           │  │ + update()            │
│ + delete()           │  │ + delete()            │
│ + toggleComplete()   │  │ + schedule()          │
│ + pushToGoogle()     │  │ + cancel()            │
└──────────────────────┘  └───────────────────────┘
          │ 1
          │ has many
          │ 0..*
          └────── Reminder (eventId FK)

┌──────────────────────────────────┐
│          WeatherCache            │
├──────────────────────────────────┤
│ - _id       : ObjectId (PK)      │
│ - lat       : Number             │
│ - lon       : Number             │
│ - data      : Object             │
│   - current : Object             │
│   - forecast: Object             │
│ - fetchedAt : Date               │
│ - expiresAt : Date (TTL index)   │
├──────────────────────────────────┤
│ + findCache()                    │
│ + saveCache()                    │
│ + autoExpire() [MongoDB TTL]     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│            Holiday               │
├──────────────────────────────────┤
│ - _id               : ObjId      │
│ - name              : String     │
│ - date              : Date       │
│ - region            : String     │
│   [BD, US, global]               │
│ - isRecurringYearly : Boolean    │
│ - createdAt         : Date       │
├──────────────────────────────────┤
│ + findByRegion()                 │
│ + findByMonth()                  │
└──────────────────────────────────┘
```

---

## 13. Dynamic Analysis Diagrams

### 13.1 — Request Lifecycle Sequence (Protected Route)

```
Client          AuthMW       Controller      Service        MongoDB       ExtAPI
  │                │              │              │              │             │
  │─── POST /events + Bearer ────►│              │              │             │
  │                │              │              │              │             │
  │                │ verify JWT   │              │              │             │
  │                │─────────┐   │              │              │             │
  │                │◄────────┘   │              │              │             │
  │                │             │              │              │             │
  │                │ attach userId              │              │             │
  │                │────────────►│              │              │             │
  │                │             │ validate body│              │             │
  │                │             │─────────┐   │              │             │
  │                │             │◄────────┘   │              │             │
  │                │             │             │              │             │
  │                │             │ Event.create()             │             │
  │                │             │─────────────────────────── ►             │
  │                │             │             │         insert + return     │
  │                │             │             │◄────────────────            │
  │                │             │             │              │             │
  │                │             │ pushToGoogle() (async)     │             │
  │                │             │────────────►│              │             │
  │                │             │             │── calendar.events.insert──►│
  │                │             │             │◄─────────────────────────  │
  │                │             │             │ save googleEventId         │
  │                │             │             │─────────────►              │
  │                │             │             │              │             │
  │◄── 201 + event ─────────────-│              │              │             │
```

---

### 13.2 — Weather Cache-Aside Sequence

```
Client          Controller      WeatherService      MongoDB        OpenWeather
  │                │                  │                 │               │
  │─ GET /weather ─►│                  │                 │               │
  │                │── getWeatherData()►                 │               │
  │                │                  │── findOne cache─►               │
  │                │                  │                 │               │
  │                │     [CACHE HIT]   │◄── cached doc ──│               │
  │                │◄── return data ───│                 │               │
  │◄── 200 weather ─│                  │                 │               │
  │                │                  │                 │               │
  │                │     [CACHE MISS]  │◄── null ─────── │               │
  │                │                  │── GET /weather ──────────────── ►│
  │                │                  │◄───────── response ───────────── │
  │                │                  │── GET /forecast ─────────────── ►│
  │                │                  │◄───────── response ───────────── │
  │                │                  │── upsert cache ─►               │
  │                │◄── return data ───│                 │               │
  │◄── 200 weather ─│                  │                 │               │
```

---

### 13.3 — Observer Pattern: Reminder Scheduler

```
POST /api/reminders
        │
        ▼
  ReminderController.createReminder()
        │
        ├── Find event (verify userId ownership)
        │
        ├── Calculate nextTriggerAt
        │   = event.startTime − minutesBefore (minutes)
        │
        ├── Reminder.create() ─────────────► MongoDB
        │
        └── reminderService.scheduleReminderJob(reminder)
                    │
                    ▼
             Check scheduledJobs{} for existing job
             Cancel if exists → register new setTimeout
                    │
                    ▼ (when delay elapses)
             TRIGGER FIRES
             console.log("Reminder triggered: <id>")
                    │
             ┌──────┴──────────────────────┐
             │ repeatPattern?              │
             │                             │
        'none'│                'daily'/'weekly'
             │                             │
             ▼                             ▼
    isActive = false              nextTriggerAt += interval
    Reminder.save()               Reminder.save()
    delete scheduledJobs[id]      rescheduleReminderJob()


On Server Restart:
        │
        ▼
  connectDB().then(() => loadAndScheduleAll())
        │
        ▼
  Reminder.find({ isActive: true, nextTriggerAt: { $gte: now } })
        │
        └── forEach reminder → scheduleReminderJob(reminder)
            console.log("Scheduled N reminders")
```

---

### 13.4 — Google Calendar OAuth 2.0 Flow

```
User        Frontend       SICS Backend       Google Auth      Google Calendar
  │             │                │                  │                │
  │ Click       │                │                  │                │
  │ Connect     │                │                  │                │
  │────────────►│                │                  │                │
  │             │ GET /calendar/oauth/url            │                │
  │             │───────────────►│                  │                │
  │             │◄── { url } ────│                  │                │
  │             │                │                  │                │
  │ Redirect to Google URL       │                  │                │
  │◄────────────│                │                  │                │
  │─────────────────────────────────────────────── ►│                │
  │ Login + Grant calendar access│                  │                │
  │◄─────────────────────────────────────────────── │                │
  │             │                │                  │                │
  │ Redirected to callback URL?code=AUTH_CODE        │                │
  │─────────────────────────────►│                  │                │
  │             │ GET /oauth/callback?code=...       │                │
  │             │                │ exchangeCode()   │                │
  │             │                │─────────────────►│                │
  │             │                │◄── access_token  │                │
  │             │                │    refresh_token │                │
  │             │                │                  │                │
  │             │                │ User.update(googleRefreshToken)   │
  │             │                │──────────────────────────────►    │
  │             │◄── 200 Connected│                  │                │
  │             │                │                  │                │
  │ POST /calendar/sync          │                  │                │
  │─────────────────────────────►│                  │                │
  │             │                │ getCalendarClient(userId)         │
  │             │                │── setCredentials(refreshToken)    │
  │             │                │                  │                │
  │             │                │ calendar.events.list() ──────────►│
  │             │                │◄────────────── Google events ─────│
  │             │                │ Event.create() for each new event │
  │             │                │                  │                │
  │             │                │ Event.find({ googleEventId: null})│
  │             │                │ calendar.events.insert() ────────►│
  │             │                │◄────────────────────── eventId ───│
  │             │◄── sync result ─│                  │                │
```

---

### 13.5 — Three-Tier Architecture Component View

```
╔══════════════════════════════════════════════════════════════╗
║              TIER 1 — PRESENTATION LAYER                     ║
║                                                              ║
║  ┌──────────────────────┐    ┌──────────────────────────┐   ║
║  │   Frontend Client    │    │      External APIs       │   ║
║  │   Web / Mobile /     │    │  OpenWeather 2.5         │   ║
║  │   Desktop            │    │  Google Calendar v3      │   ║
║  └──────────┬───────────┘    └───────────┬──────────────┘   ║
╚═════════════╪════════════════════════════╪══════════════════╝
              │ HTTP / REST                │ axios
              ▼                           ▼
╔══════════════════════════════════════════════════════════════╗
║           TIER 2 — APPLICATION LAYER (Express.js)            ║
║                                                              ║
║  Routes → Middleware Chain → Controllers → Services          ║
║                                                              ║
║  /api/auth     [JWT+Validate] → AuthController               ║
║  /api/events   [JWT+Validate] → EventController              ║
║                                  └── CalendarService (sync)  ║
║  /api/reminders[JWT+Validate] → ReminderController           ║
║                                  └── ReminderService (cron)  ║
║  /api/weather  [JWT+Validate] → WeatherController            ║
║                                  └── WeatherService (cache)  ║
║  /api/users    [JWT+Validate] → UserController               ║
║  /api/calendar [JWT+Validate] → CalendarController           ║
║                                  └── CalendarService (OAuth) ║
║                                                              ║
║  ← Global Error Middleware (last in chain)                   ║
╚══════════════════════════════════════════════════════════════╝
              │
              │ Mongoose ODM
              ▼
╔══════════════════════════════════════════════════════════════╗
║           TIER 3 — DATA LAYER (MongoDB Atlas)                ║
║                                                              ║
║  ┌──────┐ ┌────────┐ ┌──────────┐ ┌────────────┐ ┌───────┐ ║
║  │Users │ │ Events │ │Reminders │ │WeatherCache│ │Holidy │ ║
║  │      │ │        │ │          │ │(TTL: 1hr)  │ │       │ ║
║  └──────┘ └────────┘ └──────────┘ └────────────┘ └───────┘ ║
║                                                              ║
║  Indexes: userId+startTime (Events), userId+nextTriggerAt    ║
║  (Reminders), lat+lon (WeatherCache), date+region (Holiday)  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 14. User Experience Design Considerations

The backend is designed with frontend UX requirements as a first-class concern:

**1. Month/year filtered event queries**
`GET /api/events?month=6&year=2025` returns only events for the requested view period. The frontend can render daily, weekly, and monthly calendar views efficiently without fetching the entire event history (FR1, FR2).

**2. Color as a first-class field**
The `color` field on Event is stored and validated as a CSS hex string (e.g. `#EF4444`). The frontend receives ready-to-use values — zero color translation required (FR6).

**3. Completion toggle as a dedicated endpoint**
`PATCH /events/:id/complete` toggles task status with a single minimal request. No need to transmit the full event payload for a simple status change (FR5).

**4. Weather auto-location fallback**
If the frontend omits `?lat=&lon=` query parameters, the API automatically uses the user's saved location from their profile. The calendar view can fetch weather with zero parameters after initial setup (FR7, FR8).

**5. Parsed, frontend-ready weather responses**
Raw OpenWeather responses are normalized in `weather.service.js` into clean, consistently named objects: `temp`, `feelsLike`, `main`, `icon`, `description`. The frontend never needs to handle the raw API format or know it changed from 3.0 to 2.5 (FR7).

**6. Theme preference persisted server-side**
`theme: 'light' | 'dark'` lives on the User model, not in browser storage. This enables automatic cross-device theme sync — the user's preference follows them to every device (FR10, FR9).

**7. Silent Google sync on event operations**
The event CRUD endpoints attempt Google Calendar sync automatically after each operation and fail silently if the user has not connected Google. The UX stays seamless — no error is surfaced to users who have not set up sync (FR9).

**8. Structured validation error arrays**
Validation failures return `{ errors: [{ msg, path }] }` arrays. The frontend can map each error directly to the relevant form field for inline error display, without parsing generic strings.

**9. Meaningful HTTP status codes**
401 for auth failures, 404 for missing resources, 429 for rate limit hits — the frontend can handle each case distinctly and show appropriate UI states (loading, error, empty, unauthorized).

**10. Timestamps on all models**
`{ timestamps: true }` on every Mongoose schema adds `createdAt` and `updatedAt` automatically. The frontend can display "last modified" labels and sort by recency without extra fields.

---

## 15. Non-Functional Requirements

| NFR | Requirement | How It Is Met |
|---|---|---|
| Performance | Response time ≤ 2 seconds | Compound indexes on `userId + startTime` (events), `userId + nextTriggerAt` (reminders). Weather Cache-Aside avoids repeated API calls. `Promise.all()` parallelizes weather API calls |
| Performance | Support ≥ 10 concurrent users | `express-rate-limit` (100 req/15 min/IP). Mongoose connection pooling handles concurrent DB requests |
| Usability | Create event within 60 seconds | Only 3 required fields: `title`, `startTime`, `endTime`. All other fields are optional with sensible defaults |
| Reliability | ≥ 99% uptime | MongoDB Atlas M0 has built-in replication. Mongoose reconnects automatically. Global error handler prevents uncaught crashes |
| Reliability | Error recovery without data loss | Try-catch on all async operations. Google sync failures are silent — core event data is always saved to MongoDB first |
| Security | Protect user data | JWT on all protected routes. bcrypt (10 salt rounds). Helmet HTTP headers. Rate limiting |
| Security | Encrypted data in transit and at rest | HTTPS enforced at reverse proxy in production. Atlas encrypts data at rest by default. Refresh tokens stored in Atlas |

---

## License

This project is developed as an academic software engineering deliverable for the Smart Integrated Calendar System (SICS) project.

---

*SICS Backend — Express.js + MongoDB Atlas + OpenWeather API 2.5 + Google Calendar API v3*
