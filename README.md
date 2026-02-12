# GLPI Pro - IT Service Management Platform

A modern IT Service Management (ITSM) platform built with React, Firebase, and Tailwind CSS.

## Features

- 📋 **Ticket Management**: Create, track, and manage IT support tickets
- 💻 **Asset Inventory**: Track and manage IT hardware assets
- 📊 **Dashboard**: Real-time overview of tickets and assets
- 🔐 **Authentication**: Secure login with Firebase Authentication
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Rico-cms/GLPI-PRO.git
cd GLPI-PRO
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Edit `index.html` and replace the Firebase configuration with your project's config:
   ```javascript
   window.__firebase_config = JSON.stringify({
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   });
   ```

4. Start the development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Vercel will automatically detect the Vite configuration
6. Click "Deploy"

### Environment Variables (Optional)

If you want to use environment variables for Firebase config instead of hardcoding in `index.html`:

1. In Vercel Dashboard, go to Settings → Environment Variables
2. Add your Firebase configuration variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - etc.

## Project Structure

```
GLPI-PRO/
├── src/
│   ├── App.jsx          # Main application component
│   ├── main.jsx         # Application entry point
│   └── index.css        # Global styles with Tailwind
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── vercel.json          # Vercel deployment configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── postcss.config.js    # PostCSS configuration
```

## User Roles

- **Admin**: Full access to all features
- **Tech**: Can manage tickets and view assets
- **User**: Can create and view their own tickets

## License

MIT

## Support

For issues and questions, please use the GitHub issues page.
