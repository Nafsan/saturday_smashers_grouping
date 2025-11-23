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

- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/)
- **Styling**: SCSS (Sass)
- **Visualization**: [Recharts](https://recharts.org/)
- **Components**: [React Select](https://react-select.com/), [Lucide React](https://lucide.dev/)
- **Utilities**: [html-to-image](https://github.com/bubkoo/html-to-image)

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/saturday-smashers-grouping.git
   cd saturday-smashers-grouping
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

## 🚀 Deployment

This project is configured for **Free Automated Deployment** via GitHub Pages.

### How to Deploy

1.  **Push to GitHub**: Simply push your code to the `main` branch of your GitHub repository.
    ```bash
    git add .
    git commit -m "Ready for deployment"
    git push origin main
    ```

2.  **Enable GitHub Pages**:
    - Go to your repository **Settings** on GitHub.
    - Click on **Pages** in the left sidebar.
    - Under **Build and deployment** > **Source**, select **GitHub Actions**.
    - The deployment will start automatically. You can monitor it in the **Actions** tab.

3.  **Update Base URL**:
    - If your repository name is NOT `saturday-smashers-grouping`, open `vite.config.js` and update the `base` property to match your repository name: `base: '/your-repo-name/'`.

## 📱 Usage Guide

1. **Player Selection**: 
   - Select players participating in today's session from the list.
   - Use the "Tournament Date" picker to set the date.
   - Add temporary players if they are not in the database.

2. **Generate Groups**: 
   - Click **"Generate Groups"** to run the balancing algorithm.
   - The app will display Group A and Group B with player rankings and averages.

3. **Knockout Phase**: 
   - Scroll down to see the generated Cup and Plate knockout brackets.
   - The brackets automatically adjust based on the number of players (10-16).

4. **Export & Share**: 
   - Use the **"Export Groups"** button to save the group list image.
   - Use the **"Export Bracket"** button to save the knockout tree image.

5. **Analytics**: 
   - Scroll down on the main screen to view the Analytics Dashboard.
   - Search and select players to compare their ranking history on the graph.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/saturday-smashers-grouping/issues).

## 📄 License

This project is available under the [MIT License](LICENSE).

---
*Built for the love of the game.* 🏓
