# VidTube Backend

A REST API backend for a video-sharing platform, built with Node.js, Express, and MongoDB. Supports user auth, video uploads, playlists, subscriptions, likes, comments, tweets, and a creator dashboard.

## Features

- JWT-based auth (access + refresh tokens) with secure httpOnly cookies
- Video upload & management via Cloudinary (video, thumbnail)
- Playlists, subscriptions, likes, comments, and short-form "tweets"
- Aggregation-based channel stats and dashboard
- Rate limiting on auth routes to guard against brute-force attempts
- Centralized error handling with a consistent JSON response shape

## Tech Stack

- **Runtime:** Node.js (ESM)
- **Framework:** Express 5
- **Database:** MongoDB with Mongoose
- **Auth:** JWT, bcrypt
- **File storage:** Cloudinary (via Multer for uploads)
- **Other:** express-rate-limit, cookie-parser, cors

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A MongoDB instance (local or Atlas)
- A Cloudinary account

### Installation

```bash
git clone https://github.com/ShubhamGogarkar/vidtube-backend.git
cd vidtube-backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server runs on |
| `CORS_ORIGIN` | Allowed origin for CORS (your frontend URL) |
| `NODE_ENV` | `development` or `production` — controls cookie security settings |
| `MONGODB_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` / `ACCESS_TOKEN_EXPIRY` | JWT access token config |
| `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRY` | JWT refresh token config |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |

### Running the server

```bash
npm run dev    # development, with nodemon
npm start      # production
```

## API Overview

All routes are prefixed with `/api/v1`.

| Resource | Base Route | Notes |
|---|---|---|
| Users | `/users` | register, login, logout, refresh-token, profile, avatar/cover image, watch history |
| Videos | `/videos` | upload, fetch, update, delete, toggle publish status |
| Comments | `/comments` | per-video comments, edit/delete |
| Likes | `/likes` | toggle like on videos, comments, and tweets |
| Playlists | `/playlists` | create, update, add/remove videos |
| Subscriptions | `/subscriptions` | subscribe/unsubscribe to channels |
| Tweets | `/tweets` | short-form posts by users |
| Dashboard | `/dashboards` | channel stats and video list for the logged-in creator |
| Healthcheck | `/healthcheck` | basic server status check |

Most routes require authentication via a valid access token (sent as an httpOnly cookie).

## Security Notes

- Passwords are hashed with bcrypt before storage.
- Auth cookies are httpOnly, and `secure` only in production (see `NODE_ENV`).
- `authLimiter` restricts repeated attempts on `/register`, `/login`, and `/refresh-token`.
- All mutating routes on videos, playlists, comments, likes, and tweets verify resource ownership before making changes.

## License

MIT
