# GLPI Pro - IT Asset & Ticket Management

A modern IT asset and ticket management system built with React and Firebase.

## Features

- 📋 Ticket Management System
- 💻 IT Asset Inventory
- 🔐 Firebase Authentication
- 📊 Dashboard Analytics
- 📱 Responsive Design

## Deployment on Vercel

### Prerequisites

1. A Firebase project with:
   - Authentication enabled
   - Firestore database configured
   - Firebase config credentials

### Environment Variables

Create the following environment variables in your Vercel project settings:

```
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
VITE_APP_ID=your-app-id
```

### Deploy to Vercel

#### Option 1: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add the environment variables
4. Deploy!

#### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Local Development

```bash
# Install dependencies
npm install

# Create .env.local file with your Firebase config
echo 'VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}' > .env.local
echo 'VITE_APP_ID=your-app-id' >> .env.local

# Start development server
npm run dev
```

## Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## Technologies Used

- React 18
- Firebase (Authentication & Firestore)
- Vite
- Lucide React (Icons)
- Tailwind CSS (via inline styles)
