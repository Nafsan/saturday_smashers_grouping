# Saturday Smashers Grouping 🏓

A modern web application designed to streamline Saturday table tennis sessions by automating player grouping, generating knockout fixtures, and tracking player performance analytics.

## ✨ Features

- **Smart Grouping Algorithm**: Generates dynamic groups (Snake or Random methods) based on player count and historical rankings.
- **Knockout Fixture Generator**: Instantly generates Cup and Plate knockout brackets for various squad sizes.
- **Club Tournaments Tracker**: Comprehensive archive with smart filters (date range, venue, category) and bulk import tools.
- **Analytics Dashboard**:
  - Interactive performance trend graphs (powered by Recharts).
  - Multi-select player comparison and **Global Ranking** modal.
  - **Player Specific Stats**: Deep-dive player stats with integrated **YouTube** match video search (by player name or playlist).
- **National Ranking**: Smart viewer and comparison tool for national table tennis rankings.
- **ELO Calculator**: Custom ELO rating calculator designed specifically for green table tennis.
- **Fund Management**: Detailed financial and fund management tracking for club operations.
- **Tournament Poster Generator**: Automatically generate promotional performance posters from Stadium Compete URLs, including overall brackets and top 8 results.
- **Export & Share Tools**: One-click export of groups, brackets, ranking breakdowns, and **tournament results** as high-quality, **social media friendly images** with native sharing capabilities.
- **Rank Parser**: Built-in utility to convert raw text rankings into the application's JSON format.
- **Modern UI**: A premium, mobile-first dark theme built with SCSS.

## 🛠️ Tech Stack

- **Frontend**: [React 18](https://reactjs.org/), [Vite](https://vitejs.dev/), [Redux Toolkit](https://redux-toolkit.js.org/), SCSS
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **Deployment**:
  - Frontend: GitHub Pages
  - Backend & DB: [Render](https://render.com/)
- **Visualization**: [Recharts](https://recharts.org/)
- **Components**: [Material UI](https://mui.com/), [React Select](https://react-select.com/), [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.9+
- PostgreSQL (optional, for local setup)
- Docker & Docker Compose (optional, for containerized setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/saturday-smashers-grouping.git
   cd saturday-smashers-grouping
   ```

#### Option A: Using Docker (Recommended)

Thanks to our public Docker images, you can run the entire application without needing to build from source!

Start the pre-built Production stack (Frontend, Backend, and Database):

```bash
docker compose -f docker-compose.prod.yml up -d
```

_(Note: If you want to build locally for development instead, use `docker compose -f docker-compose.dev.yml up --build`)._

- The frontend will be available at `http://localhost:5173` (or your server's IP)
- The backend API will be available at `http://localhost:8000`

#### Option B: Manual Local Setup

2. **Frontend Setup**

   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup**

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt

   # Set up .env file with DATABASE_URL
   uvicorn main:app --reload
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## Frontend tests

Use Node.js 22. Run these commands from the repository root
(`D:\pet_project\saturday_smashers_grouping` on Windows). Tests use Jest and React
Testing Library with mocked network boundaries; no backend server or Python
virtual environment is needed for frontend tests.

```bash
# Install the exact dependencies from the lockfile (first setup / dependency changes)
npm ci

# Run all frontend tests quickly, without coverage
npm test

# Run tests for one changed file and the modules that depend on it
npm run test:frontend:related -- src/components/ManagePlayers.jsx

# Run related tests for all uncommitted frontend changes
npm run test:frontend:changed

# Before committing: require companion tests and per-file coverage
npm run test:frontend:check

# Run the full suite with coverage, including established baseline requirements
npm run test:frontend:coverage

# Optional: rerun tests interactively while editing
npm run test:frontend:watch
```

To check committed branch changes too, use
`npm run test:frontend:check -- origin/main` (or another Git base ref). The default
changed-file commands compare against `HEAD`; after committing with a clean
working tree they have no uncommitted files to check. `npm test` always runs the
full suite. The HTML coverage report is `coverage/frontend/index.html`.

Every changed application module needs its own colocated test; changed-file checks
run its related tests and enforce per-file coverage. See
[the frontend testing plan](docs/frontend-testing.md) and [agent rules](AGENTS.md)
for the test-first workflow, CI and the remaining legacy-screen rollout.

## Backend tests

From the repository root, install the development requirements and run pytest:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest
```

For quick runs without coverage, use `python -m pytest -q --no-cov` or
`npm run test:backend` with your Python virtual environment activated.
Use `npm run test:backend:coverage` for the full coverage check.

Tests run offline with mocked database and external-service dependencies. The
suite includes coverage reporting and an 80% coverage minimum. See
[the backend testing guide](backend/TESTING.md) for setup, focused runs, CI, and
the test-first development workflow.

## 🚀 Deployment

### Backend (Render)

1. Create a new **Web Service** on Render connected to your repo.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `pip install -r requirements.txt`.
4. Set **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Add a **PostgreSQL** database on Render and link it.
6. Set `DATABASE_URL` environment variable.

### Frontend (GitHub Pages)

1. Push to `main` branch.
2. Ensure `VITE_API_URL` is set in GitHub Actions secrets pointing to your Render backend URL.
3. GitHub Actions will automatically deploy to GitHub Pages.

## 📱 Usage Guide

1. **Player Selection**: Select players for the session.
2. **Generate Groups**: Create balanced groups based on rankings.
3. **Knockout Phase**: View generated Cup and Plate brackets.
4. **Submit Results**: Use the "Submit Results" button to upload tournament outcomes (Password Protected).
5. **Analytics**: View historical trends and head-to-head comparisons.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is available under the [MIT License](LICENSE).

---

_Built for the love of the game._ 🏓
