<h1 align="center">Future Tech — Blog Platform API</h1>
<p align="center">
  RESTful API for the Future Tech blog platform. Handles authentication, blog management, likes, and image uploads.
</p>
<hr/>

## Tech Stack

- **Runtime** — Node.js
- **Framework** — Express
- **Language** — TypeScript
- **Database** — MongoDB + Mongoose
- **Auth** — JWT (access token + refresh token)
- **Image Upload** — Cloudinary
- **Validation** — Zod
- **Logging** — Custom logger
- **Package Manager** — pnpm

---

## Project Structure
```
src/
├── controllers/
│   ├── auth.controller.ts      # register, login, logout, refresh-token
│   └── blog.controller.ts      # CRUD, like/unlike, user blogs, liked blogs
├── middleware/
│   ├── auth.middleware.ts       # protectedAuth — blocks unauthenticated requests
│   └── optionalAuth.middleware.ts # optionalAuth — attaches userId if token exists, continues as guest otherwise
├── models/
│   ├── user.model.ts
│   └── blog.model.ts
├── routes/
│   ├── auth.routes.ts
│   └── blog.routes.ts
├── lib/
│   └── cloudinary.ts           # cloudinary config
├── schemas/                    # Zod validation schemas
├── utils/
│   └── logger.ts
├── env.ts                      # typed env variables
└── app.ts
```

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns access + refresh token |
| POST | `/api/auth/logout` | Protected | Logout, clears refresh token |
| POST | `/api/auth/refresh-token` | None (cookie) | Issues new access token |

### Blog

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/blog` | Optional | Get all published blogs (paginated) |
| GET | `/api/blog/:slug` | Optional | Get single blog with `isLiked` for current user |
| POST | `/api/blog` | Protected | Create new blog |
| PUT | `/api/blog/:slug` | Protected | Update blog |
| DELETE | `/api/blog/:slug` | Protected | Delete blog |
| PUT | `/api/blog/like-unlike/:slug` | Protected | Toggle like on a blog |
| GET | `/api/blog/user` | Protected | Get current user's blogs (paginated) |
| GET | `/api/blog/user/like` | Protected | Get current user's liked blogs (paginated) |

---

## Auth Flow
```
Register / Login
      ↓
Access Token (short-lived, in response body)
Refresh Token (long-lived, httpOnly cookie)
      ↓
Client stores access token in localStorage
      ↓
Access token expires → POST /auth/refresh-token
      ↓
New access token issued → retry original request
      ↓
Refresh token expired → force logout
```

---

## Pagination

All list endpoints support `limit` and `offset` query params:
```
GET /api/blog?limit=9&offset=0
GET /api/blog/user?limit=8&offset=8
GET /api/blog/user/like?limit=8&offset=0
```

Response shape:
```json
{
  "status": 200,
  "blogs": [...],
  "total": 42,
  "limit": 9,
  "offset": 0
}
```

---

## Like System

- `likes` field on blog model is a `Types.ObjectId[]` stored with `select: false` — never exposed in responses
- `isLiked` is computed server-side by checking if `req.userId` exists in `blog.likes`
- `likesCount` is kept in sync with `blog.likes.length` on every like/unlike
- Guest users always receive `isLiked: false`

---

## Optional Auth Middleware

Routes like `GET /api/blog` and `GET /api/blog/:slug` use `optionalAuth` instead of `protectedAuth`:
```typescript
export const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] ?? req.cookies?.accessToken;
    if (!token) { req.userId = null; return next(); }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    req.userId = null;
    next();
  }
};
```

This allows unauthenticated users to read posts while still computing the correct `isLiked` for logged-in users.

---

## Environment Variables

Create a `.env` file in the root:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/futuretech
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
QUERY_LIMIT=8
QUERY_OFFSET=0
NODE_ENV=development
```

---

## Getting Started

### Clone the repository
```bash
git clone https://github.com/Abid-Khan12/Future_Tech_Backend.git
cd Future_Tech_Backend
```

### Install dependencies
```bash
pnpm install
```

### Start development server
```bash
pnpm dev
```

### Build for production
```bash
pnpm build
pnpm start
```

---

## Using npm instead of pnpm
```bash
rm pnpm-lock.yaml
npm install
npm run dev
```

---

## Key Technical Decisions

| Problem | Solution |
|---|---|
| `likes` array never exposed to client | `select: false` on schema + `delete blogObj.likes` before response |
| Concurrent requests during token refresh | Failed request queue — requests wait while refresh is in progress, then retry with new token |
| Guest users viewing posts | `optionalAuth` middleware attaches `null` userId and continues — `isLiked` defaults to `false` |
| `ObjectId` comparison in likes | `.some(id => id.toString() === userId.toString())` instead of `.includes()` to avoid reference equality issues |
| Keeping `likesCount` in sync | `blog.likesCount = blog.likes.length` recomputed on every like/unlike before save |

---

## Author

Muhammad Abid Shah
GitHub: [Abid-Khan12](https://github.com/Abid-Khan12)
