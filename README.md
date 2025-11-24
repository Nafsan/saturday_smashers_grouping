# Saturday Smashers Grouping 🏓

A modern web application designed to streamline Saturday table tennis sessions by automating player grouping, generating knockout fixtures, and tracking player performance analytics.

## ✨ Features

- **Smart Grouping Algorithm**: Automatically pairs and distributes players into balanced groups (Group A & Group B) based on their historical rankings.
- **Knockout Fixture Generator**: Instantly generates Cup and Plate knockout brackets for various squad sizes (10, 12, 14, and 16 players).
- **Analytics Dashboard**: 
  - Interactive performance trend graphs (powered by Recharts).
  - Multi-select player comparison.
  - Historical tournament results archive.
- **Export Tools**: One-click export of group listings and knockout brackets as high-quality images for easy sharing on WhatsApp or social media.
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

- Node.js (v16+)
- Python 3.9+
- PostgreSQL (optional, for local backend dev)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/saturday-smashers-grouping.git
   cd saturday-smashers-grouping
   ```

2. **Frontend Setup**
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup** (Optional, if running locally)
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
*Built for the love of the game.* 🏓
