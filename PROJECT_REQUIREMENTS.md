# Enterprise Sports Franchise Auction Platform - System Documentation & Run Guide

AI Project and System Architecture for **Enterprise Sports Franchise Auction Platform**.

---

## 🎯 Project Requirements & Overview

This project is a real-time, production-ready full-stack application designed for conducting sports franchise player auctions (such as IPL, BPL, or custom sports leagues).

### Core Functional Requirements
1. **Multi-Role Authentication & Access Control (RBAC):**
   - **Super Admin:** Manage teams, set league budgets, create auction rules, and manage user roles.
   - **Podium Admin:** Real-time auctioneer interface to bring players to the stage, start timers, accept/reject manual bids, and finalize player status (Sold/Unsold).
   - **Franchise Manager (War Room):** Live bidding UI with budget limits, squad constraints, and real-time bid buttons.
   - **Public View (Live Stadium & Teams):** Audience portal to view current auction progress, live bid updates, and team rosters.

2. **Real-Time Auction Engine (Socket.IO):**
   - **Serialized Bid Queue:** Prevents race conditions during simultaneous bids.
   - **Server-Side Timer Management:** Timer runs centrally on the server; client disconnects or refreshes do not desynchronize time.
   - **Budget Guardrail Calculation:** 
     $$\text{Max Allowable Bid} = \text{Remaining Budget} - ((\text{Min Roster} - \text{Current Squad Count}) \times \text{Lowest Category Base Price})$$
     Prevents teams from overspending and ensures enough budget remains to complete their roster.

3. **Player Registration & Image Processing:**
   - Multi-part upload validated with **Zod**.
   - Server-side image optimization using **Sharp** (converts images to WebP 512x512 Q80 format) and uploads to Cloudinary (or local fallback).

---

## 🏗️ Technical Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Socket.IO Client, Lucide React
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** MongoDB Atlas (via Mongoose)
- **Security & Utilities:** JWT (with Refresh Tokens), Bcrypt, Helmet, Express Rate Limit, Zod

---

## 🚀 How to Run and Operate the Project (প্রজেক্ট চালানো ও ব্যবহার করার নিয়ম)

### Step 1: Prerequisites
Ensure you have installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas Connection String)

---

### Step 2: Environment Configuration Setup

#### Backend Environment (`backend/.env`)
Create or edit `backend/.env` with the following variables:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/sports_auction_db
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
CLIENT_URL=http://localhost:5173

# Optional: Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Frontend Environment (`frontend/.env`)
Create or edit `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:5000
```

---

### Step 3: Installation & Seeding Demo Data

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

3. **Seed Database with Initial Demo Data:**
   Run the seed script in the backend directory to populate teams, categories, demo users, and demo players.
   ```bash
   cd ../backend
   npm run seed
   ```

---

### Step 4: Running the Platform locally

You will need **two open terminals**:

#### Terminal 1 (Backend Server):
```bash
cd backend
npm run dev
```
*(Backend will start on `http://localhost:5000`)*

#### Terminal 2 (Frontend Client):
```bash
cd frontend
npm run dev
```
*(Frontend will start on `http://localhost:5173`)*

---

## 🔑 Demo Credentials (পরীক্ষা করার টেস্ট ইউজারসমূহ)

After running `npm run seed`, use these accounts to test different roles:

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Super Admin** | `admin@auction.com` | `password123` | Control settings, rules, teams, and user management |
| **Podium Admin** | `podium@auction.com` | `password123` | Control live auction stage, timer, sold/unsold actions |
| **Dhaka Manager** | `manager_dhd@auction.com` | `password123` | Place live bids as Dhaka franchise manager |
| **Chittagong Manager** | `manager_ctg@auction.com` | `password123` | Place live bids as Chittagong franchise manager |

---

## 🧭 Page Routing & Navigation Map

| Portal Name | Frontend Route | Description |
|---|---|---|
| **Landing / Home** | `/` | League overview and general navigation |
| **Live Stadium** | `/live` | Real-time public view of the ongoing auction stage |
| **Franchise Teams** | `/teams` | Public view of team rosters, remaining budgets, and stats |
| **Player Registration** | `/player/register` | Portal for players to submit application forms |
| **Manager War Room** | `/manager/dashboard` | Franchise manager interface to place real-time bids |
| **Podium Control** | `/podium/dashboard` | Auctioneer interface to run the live bidding stage |
| **Super Admin Portal** | `/admin/dashboard` | Platform administration and database management |

---

## 🛠️ Verification & Maintenance Commands

- **Backend Audit:** `cd backend && npm test`
- **Frontend Build Check:** `cd frontend && npm run build`
