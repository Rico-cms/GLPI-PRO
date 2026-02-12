# Vercel Deployment Guide for GLPI Pro

This guide will walk you through deploying your GLPI Pro application to Vercel.

## Prerequisites

1. A GitHub account with this repository
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. A Firebase project configured with Authentication and Firestore

## Step-by-Step Deployment

### 1. Prepare Your Firebase Configuration

Before deploying, you need your Firebase configuration. Get it from:
- Go to [Firebase Console](https://console.firebase.google.com)
- Select your project
- Go to Project Settings (gear icon) → General
- Scroll down to "Your apps" → Web apps
- Copy the configuration object

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. **Import Your Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository `Rico-cms/GLPI-PRO`

2. **Configure the Project**
   - Vercel will automatically detect that you're using Vite
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables** (Optional - if you want to use env vars instead of hardcoded config)
   
   In the Vercel project settings, add these environment variables:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

#### Option B: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts to:
   - Set up and deploy your project
   - Link to existing project or create new one
   - Set environment variables (if needed)

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### 3. Configure Firebase for Your Domain

After deployment, you need to authorize your Vercel domain in Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Authentication → Settings → Authorized domains
4. Add your Vercel domain: `your-project.vercel.app`
5. Click "Add domain"

### 4. Update Firebase Configuration in Code

If you hardcoded the Firebase config in `index.html`:

1. Edit `index.html`
2. Replace the placeholder values with your actual Firebase configuration:
   ```javascript
   window.__firebase_config = JSON.stringify({
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123def456"
   });
   ```
3. Commit and push the changes
4. Vercel will automatically redeploy

## Automatic Deployments

Once connected to GitHub, Vercel will automatically deploy:
- **Production deployments** from the `main` branch
- **Preview deployments** from pull requests and other branches

## Custom Domain (Optional)

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions
5. Update Firebase authorized domains to include your custom domain

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are listed in `package.json`
- Verify that your code has no syntax errors

### Firebase Connection Issues

- Verify your Firebase configuration is correct
- Check that your Vercel domain is in Firebase authorized domains
- Check browser console for specific error messages

### Environment Variables Not Working

- Make sure variables are prefixed with `VITE_`
- Redeploy after adding environment variables
- Environment variables are only available during build time in Vite

## Support

For issues specific to:
- **Vercel deployment**: Check [Vercel documentation](https://vercel.com/docs)
- **Firebase setup**: Check [Firebase documentation](https://firebase.google.com/docs)
- **GLPI Pro application**: Open an issue on GitHub

## Next Steps

After successful deployment:
1. Test all features of your application
2. Set up Firebase security rules for production
3. Configure Firebase authentication providers (Google, Email, etc.)
4. Monitor your application using Vercel Analytics
5. Set up proper error tracking and monitoring

Happy deploying! 🚀
