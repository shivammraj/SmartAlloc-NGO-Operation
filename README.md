# Smart Resource Allocation — NGO Platform

> Data-driven volunteer coordination for NGOs in low-connectivity environments in India.

---

## 🏗️ Project Structure

```
NGO Problem/
├── backend/          Node.js Express REST API  (port 4000)
├── dashboard/        React + Vite dashboard    (port 3000)
├── ml-service/       Python FastAPI ML scoring (port 8001)
└── README.md
```

---

## 🚀 Quick Start (Run All 3 Services)

### 1. Backend API

```bash
cd backend
npm install
npm run dev
# → http://localhost:4000/health
```

### 2. React Dashboard

```bash
cd dashboard
npm install
npm run dev
# → http://localhost:3000
```

### 3. Python ML Service (optional)

```bash
cd ml-service
pip install -r requirements.txt
python scoring_service.py
# → http://localhost:8001/docs   (Swagger UI)
```

---

## 📡 API Endpoints (Backend — port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/issues` | List issues (sorted by priority) |
| POST | `/v1/issues` | Submit new issue |
| GET | `/v1/issues/:id` | Issue detail |
| GET | `/v1/volunteers` | List volunteers |
| GET | `/v1/match/:issue_id` | Get matched volunteers for issue |
| POST | `/v1/assignments` | Create assignment |
| PATCH | `/v1/assignments/:id` | Update assignment status |
| GET | `/v1/dashboard/summary` | KPI summary |
| GET | `/v1/analytics/heatmap` | Geo heatmap data |
| GET | `/v1/analytics/trends` | Category trend data |
| GET | `/v1/analytics/resolution` | Weekly resolution chart |

---

## 🗺️ Dashboard Screens

| Screen | URL | Description |
|--------|-----|-------------|
| Command Center | `/` | Live issue feed + simulated map + active assignments |
| Analytics | `/analytics` | Metric cards, trend charts, donut, AI insights |
| Volunteers | `/volunteers` | Filterable table + slide-over profile drawer |
| Issue Detail | `/issues/:id` | Priority gauge, matched volunteers, assign button |
| Performance | `/performance` | Weekly resolution, response time, utilization |

---

## 🧪 Testing the Matching Engine

```bash
# Score an issue
curl -X POST http://localhost:8001/score \
  -H "Content-Type: application/json" \
  -d '{"issue_id":"TEST","category":"health","severity":5,"affected_count":50,"created_at":"2026-04-27T10:00:00Z","frequency":3}'

# Get matched volunteers for issue ISS001
curl http://localhost:4000/v1/match/ISS001

# Create an assignment
curl -X POST http://localhost:4000/v1/assignments \
  -H "Content-Type: application/json" \
  -d '{"issue_id":"ISS001","volunteer_id":"VOL001"}'
```

---

## 🔐 Environment Variables

Copy `.env.example` → `.env` in each service directory and fill in credentials.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter (Android-first, offline-first) |
| Dashboard | React 18 + Vite + Tailwind CSS + Recharts |
| Backend API | Node.js + Express |
| ML Scoring | Python FastAPI |
| Database | Firebase Firestore (production) |
| Notifications | Twilio WhatsApp + SMS + FCM |
| Maps | Google Maps API (add key in .env) |
| Hosting | Firebase Hosting + Cloud Functions |

---

## 📋 Architecture

```
Flutter Mobile App
     │ (offline queue via Hive)
     ↓
Node.js REST API  ←→  Python ML Scoring Service
     │                     (priority score, clustering)
     ↓
Firebase Firestore  →  React Dashboard (Recharts + Maps)
     │
     ↓
Twilio (WhatsApp + SMS)  +  FCM Push Notifications
```
