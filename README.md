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

Start the entire stack (Frontend, Backend, and Database) with a single command:

```bash
docker-compose up --build
```

- The frontend will be available at `http://localhost:5173`
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
