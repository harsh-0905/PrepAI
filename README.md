# PrepAI — AI-Powered Interview Preparation

PrepAI analyzes your resume and a target job description using AI to generate a personalized interview plan: technical questions, behavioral questions, skill gap analysis, a day-by-day preparation roadmap, and a tailored resume PDF.

---

## Tech Stack

**Backend** — Node.js, Express.js, MongoDB (Mongoose), JWT, Multer, pdf-parse, Puppeteer, Groq SDK

**Frontend** — React 19, Vite, React Router v7, Axios, SCSS

**AI** — Groq API (Llama 3.3 70B)

---

## Project Structure

```
YT-GENAI/
├── Backend/
│   ├── src/
│   │   ├── config/         # MongoDB connection
│   │   ├── controllers/    # Route handlers
│   │   ├── middlewares/    # Auth (JWT) + File upload (Multer)
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routers
│   │   └── services/       # AI (Groq) + PDF generation (Puppeteer)
│   ├── server.js
│   └── package.json
├── Frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/       # Login, Register, Protected route
│   │   │   └── interview/  # Home, Interview report, hooks, API
│   │   ├── App.jsx
│   │   └── app.routes.jsx
│   └── package.json
├── .gitignore
├── netlify.toml
├── render.yaml
└── README.md
```

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/your-username/prepai.git
cd prepai
```

### 2. Backend

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_random_secret_string
GROQ_API_KEY=your_groq_api_key
PORT=3000
```

```bash
npm run dev
```

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173` — Backend: `http://localhost:3000`

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret for signing JWTs |
| `GROQ_API_KEY` | Free API key from console.groq.com |

---

## Deployment

### Step 1 — Push to GitHub

Run these commands from inside your `YT-GENAI` project folder:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/your-username/prepai.git
git push -u origin main
```

### Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - Root Directory: `Backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`
5. Deploy — copy your backend URL (e.g. `https://prepai-backend.onrender.com`)

### Step 3 — Update Frontend API URLs

Before deploying frontend, update the `baseURL` in both files:

`Frontend/src/features/auth/services/auth.api.js`:
```js
baseURL: "https://prepai-backend.onrender.com"
```

`Frontend/src/features/interview/services/interview.api.js`:
```js
baseURL: "https://prepai-backend.onrender.com"
```

Commit and push:
```bash
git add .
git commit -m "update api base url for production"
git push
```

### Step 4 — Deploy Frontend on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Connect your GitHub repo
3. Configure:
   - Base directory: `Frontend`
   - Build command: `npm run build`
   - Publish directory: `Frontend/dist`
4. Deploy

The `netlify.toml` file handles React Router redirects automatically — no extra setup needed.

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register `{ username, email, password }` |
| POST | `/api/auth/login` | Login `{ email, password }` |
| GET | `/api/auth/logout` | Logout |
| GET | `/api/auth/get-me` | Get current logged-in user |

### Interview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/interview/` | Generate report (multipart: `resume` PDF + `jobDescription` + `selfDescription`) |
| GET | `/api/interview/` | Get all reports for current user |
| GET | `/api/interview/report/:id` | Get single report by ID |
| POST | `/api/interview/resume/pdf/:id` | Download tailored resume as PDF |

---

## Features

- Upload PDF resume or type a self-description
- Paste any job description
- AI generates:
  - Match score (0–100%)
  - 5 technical questions with model answers
  - 5 behavioral questions with model answers
  - Skill gaps with severity (low / medium / high)
  - 7-day preparation plan
- Download a tailored resume PDF built for the target role
- All past reports saved and viewable from home page

---

## Known Limitations

- Render free tier sleeps after 15 min idle — first request takes ~30s to wake up
- Puppeteer PDF generation is CPU-heavy; may be slow on Render free tier
- Groq free tier: 14,400 requests/day, 30 req/min on Llama 3.3 70B

---

## Author

**Harsh Yadav**
GitHub: [github.com/harsh-0905](https://github.com/harsh-0905)
Portfolio: [portfolio-7ivq.vercel.app](https://portfolio-7ivq.vercel.app)
LinkedIn: [linkedin.com/in/harshyadav95-dev](https://linkedin.com/in/harshyadav95-dev)
