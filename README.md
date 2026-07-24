# Enterprise Sports Franchise Auction Platform

A production-ready full-stack monorepo built with React 19, Node.js, Socket.IO, and MongoDB.

## Project Structure

```
/
├── backend/          Node.js + Express + Socket.IO API
└── frontend/         React 19 + Vite + Tailwind CSS
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + Refresh Token rotation |
| Images | Sharp → WebP 512×512 Q80, Cloudinary/Local |
| Validation | Zod |
| Security | Helmet, Rate-limiting, bcrypt |

## Quick Start

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### 2. Configure environment

**backend/.env**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/sports_auction_db
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name   # optional
CLOUDINARY_API_KEY=your_api_key         # optional
CLOUDINARY_API_SECRET=your_api_secret   # optional
```

**frontend/.env**
```
VITE_BACKEND_URL=http://localhost:5000
```

### 3. Seed demo data

```bash
cd backend
npm run seed
```

This creates all demo data and prints login credentials.

### 4. Start both servers

**Terminal 1 – Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@auction.com | password123 |
| Podium Admin | podium@auction.com | password123 |
| Dhaka Manager | manager_dhd@auction.com | password123 |
| Chittagong Manager | manager_ctg@auction.com | password123 (first-reset required) |

## Navigation (Role Switcher in Navbar)

| Portal | URL |
|--------|-----|
| Landing | / |
| Live Stadium | /live |
| Franchise Teams | /teams |
| Player Register | /player/register |
| Manager War Room | /manager/dashboard |
| Podium Control | /podium/dashboard |
| Super Admin | /admin/dashboard |

## Architecture Highlights

### Serialized Bid Queue (Race-Condition Prevention)
Normal mode bids are chained onto a `Promise` queue inside `auctionEngine.js`. Each bid awaits the previous before executing — guaranteeing millisecond-level serializability.

### Blind Bid Budget Guardrail
```
Required Reserve = (minRoster - currentRosterCount) × lowestCategoryBasePrice
Max Allowable Bid = remainingBudget - requiredReserve
```
Rejected bids emit a silent private Socket.IO event only to the violating team's room.

### Server-Side Timer
`timerService.js` runs an independent `setInterval` on the server. Timer state persists through client disconnects/reconnects.

### Sharp Image Pipeline
`POST /api/players/register` (multipart):
1. Multer rejects non-images and files > 10MB
2. Sharp resizes to 512×512, converts to WebP Q80
3. Uploads to Cloudinary (or saves to `/public/uploads` as fallback)

## Deployment

### Backend → Render
- Build: `npm install`
- Start: `node src/server.js`
- Set all env vars in Render dashboard

### Frontend → Vercel
- Framework: Vite
- Output: `dist`
- Set `VITE_BACKEND_URL=https://your-render-backend.onrender.com`
