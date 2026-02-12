# 🚀 Quick Deployment Checklist

Use this checklist to ensure you're ready to deploy to Vercel.

## Before Deployment

- [ ] **Firebase Project Setup**
  - [ ] Created Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
  - [ ] Enabled Authentication (Email/Password and/or Google Sign-In)
  - [ ] Created Firestore database
  - [ ] Got Firebase configuration (Project Settings → General → Your apps → Web app config)

- [ ] **Code Configuration**
  - [ ] Updated `index.html` with your Firebase configuration
  - [ ] OR Created `.env.local` with Firebase environment variables (see `.env.example`)
  - [ ] Tested locally with `npm install` and `npm run dev`

- [ ] **Repository Setup**
  - [ ] Code is pushed to GitHub
  - [ ] Repository is accessible (public or you have permissions)

## Deploy to Vercel

### Option 1: Via Vercel Dashboard (Easiest)

1. [ ] Go to [vercel.com](https://vercel.com) and sign in
2. [ ] Click "Add New..." → "Project"
3. [ ] Import your GitHub repository
4. [ ] Verify settings:
   - Framework: Vite ✓ (auto-detected)
   - Build Command: `npm run build` ✓
   - Output Directory: `dist` ✓
5. [ ] Add environment variables (if using .env approach)
6. [ ] Click "Deploy"
7. [ ] Wait for build to complete (~2-3 minutes)

### Option 2: Via Vercel CLI

1. [ ] Install: `npm i -g vercel`
2. [ ] Login: `vercel login`
3. [ ] Deploy: `vercel`
4. [ ] Production: `vercel --prod`

## After Deployment

- [ ] **Test Your Deployment**
  - [ ] Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
  - [ ] Check if the page loads
  - [ ] Try logging in
  - [ ] Create a test ticket
  - [ ] Create a test asset

- [ ] **Configure Firebase for Production**
  - [ ] Add your Vercel domain to Firebase authorized domains:
    - Firebase Console → Authentication → Settings → Authorized domains
    - Add: `your-project.vercel.app`
  - [ ] Update Firestore security rules for production
  - [ ] Test authentication again

- [ ] **Optional: Custom Domain**
  - [ ] Add custom domain in Vercel project settings
  - [ ] Configure DNS records as instructed
  - [ ] Add custom domain to Firebase authorized domains
  - [ ] Wait for DNS propagation (~24 hours max)

## Troubleshooting

### Build Failed?
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Check for TypeScript/JavaScript errors

### Firebase Connection Error?
- Verify Firebase config is correct in `index.html` or environment variables
- Check browser console for specific errors
- Ensure Vercel domain is in Firebase authorized domains

### Page Not Loading?
- Check Vercel deployment logs
- Verify `dist` folder is generated during build
- Check browser console for errors

## Success! 🎉

Your GLPI Pro app should now be live and accessible. Next steps:

- [ ] Share the URL with your team
- [ ] Set up monitoring and analytics
- [ ] Configure Firebase security rules properly
- [ ] Consider setting up a custom domain
- [ ] Enable Vercel Analytics (optional)

---

**Need Help?**
- Check `DEPLOYMENT.md` for detailed instructions
- Check `README.md` for development setup
- Open an issue on GitHub for application-specific problems
- Check [Vercel Docs](https://vercel.com/docs) for deployment issues
- Check [Firebase Docs](https://firebase.google.com/docs) for Firebase issues
