# Deployment Guide

This guide covers deploying the Learning AI app to Vercel for web hosting.

## 🚀 Quick Deploy

### Option 1: Automatic GitHub Deployment (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys to Vercel on every push to main/master.

#### Setup Steps:

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Install Vercel CLI** (optional, for manual deploys)
   ```bash
   npm install -g vercel
   ```

3. **Link Your Project to Vercel**
   ```bash
   vercel link
   ```
   - Select your Vercel account
   - Link to existing project or create new one
   - Note the Project ID and Org ID

4. **Get Vercel Token**
   - Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Name it "GitHub Actions"
   - Copy the token

5. **Add GitHub Secrets**

   Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

   Add these secrets:

   ```
   VERCEL_TOKEN=<your-vercel-token>
   VERCEL_ORG_ID=<your-org-id>
   VERCEL_PROJECT_ID=<your-project-id>

   EXPO_PUBLIC_FIREBASE_API_KEY=<your-firebase-api-key>
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
   EXPO_PUBLIC_FIREBASE_APP_ID=<your-app-id>

   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>
   ```

6. **Push to GitHub**
   ```bash
   git push origin main
   ```

   The GitHub Action will automatically:
   - Install dependencies
   - Build the web app
   - Deploy to Vercel

7. **Check Deployment**
   - Go to Actions tab in GitHub to see build progress
   - Once complete, visit your Vercel URL

---

### Option 2: Manual Vercel Deployment

#### Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Build the app**
   ```bash
   npm run build
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

---

### Option 3: Vercel Dashboard (One-Click)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)

2. **Import GitHub Repository**
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Other**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**

   In Vercel project settings → Environment Variables, add:

   ```
   EXPO_PUBLIC_FIREBASE_API_KEY
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
   EXPO_PUBLIC_FIREBASE_PROJECT_ID
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   EXPO_PUBLIC_FIREBASE_APP_ID
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your live URL!

---

## 🔧 Configuration Files

### `.github/workflows/deploy-vercel.yml`

GitHub Actions workflow that:
- Triggers on push to main/master
- Builds Expo web export
- Deploys to Vercel
- Creates preview deployments for PRs

### `vercel.json`

Vercel configuration that:
- Sets up SPA routing (all routes → index.html)
- Configures caching headers
- Defines build output directory
- Maps environment variables

### `package.json` Scripts

```json
{
  "build": "expo export:web",
  "build:production": "expo export:web --clear",
  "vercel-build": "expo export:web"
}
```

---

## 🌐 Domain Setup

### Add Custom Domain

1. **In Vercel Dashboard**
   - Go to your project
   - Click "Settings" → "Domains"
   - Add your custom domain

2. **Update DNS Records**
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or add A record pointing to Vercel's IP

3. **Wait for DNS Propagation**
   - Usually takes 5-60 minutes
   - Vercel will auto-provision SSL certificate

4. **Update Firebase OAuth**
   - Go to Firebase Console → Authentication → Settings
   - Add your custom domain to authorized domains
   - Update Google OAuth redirect URIs

---

## 🔐 Environment Variables

### Required Variables

All environment variables must start with `EXPO_PUBLIC_` to be accessible in Expo web builds.

#### Firebase Config
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

#### Google OAuth
```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123-abc.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=123-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123-android.apps.googleusercontent.com
```

### Where to Add Variables

**Local Development:**
- Create `.env` file (already in `.gitignore`)

**GitHub Actions:**
- Repository Settings → Secrets and variables → Actions

**Vercel:**
- Project Settings → Environment Variables
- Can set different values for Production/Preview/Development

---

## 🧪 Testing Deployment

### Before Deploying

1. **Test Local Build**
   ```bash
   npm run build
   npx serve dist
   ```
   Visit http://localhost:3000

2. **Check Build Output**
   - Verify `dist/` folder created
   - Check `dist/index.html` exists
   - Ensure all assets in `dist/assets/`

3. **Test Production Build**
   ```bash
   npm run build:production
   ```

### After Deploying

1. **Test Authentication**
   - Click "Continue with Google"
   - Verify login works
   - Check Firebase console for new user

2. **Test Core Features**
   - Set learning goal
   - Choose level
   - Complete a lesson
   - Take a quiz
   - Check progress tab

3. **Test on Multiple Devices**
   - Desktop browser
   - Mobile browser
   - Tablet

4. **Check Console for Errors**
   - Open DevTools
   - Look for Firebase errors
   - Verify no 404s

---

## 🐛 Troubleshooting

### Build Fails on Vercel

**Issue:** Build fails with "expo: command not found"

**Fix:** Ensure `expo` is in dependencies (not devDependencies)

---

**Issue:** Environment variables not working

**Fix:**
- Variables must start with `EXPO_PUBLIC_`
- Set them in Vercel project settings
- Redeploy after adding variables

---

**Issue:** Google Sign-In fails in production

**Fix:**
1. Add production URL to Firebase authorized domains
2. Add production URL to Google OAuth redirect URIs
3. Use correct Web Client ID for production

---

**Issue:** 404 on page refresh

**Fix:** Already handled in `vercel.json` - all routes redirect to `index.html`

---

**Issue:** Assets not loading

**Fix:**
- Check `vercel.json` routes configuration
- Verify `dist/assets/` exists after build
- Check browser console for 404 errors

---

### Firebase Errors in Production

**Issue:** "Firebase config not found"

**Fix:** Verify all `EXPO_PUBLIC_FIREBASE_*` variables are set in Vercel

---

**Issue:** "Permission denied" in Firestore

**Fix:**
- Check Firestore security rules
- Ensure user is authenticated
- Verify rules allow access

---

**Issue:** Google OAuth popup blocked

**Fix:**
- Ensure HTTPS is enabled
- Check browser popup blocker
- Verify redirect URIs match production URL

---

## 📊 Deployment Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Firebase configuration correct
- [ ] Google OAuth redirect URIs updated
- [ ] Custom domain configured (optional)
- [ ] SSL certificate provisioned
- [ ] Firebase authorized domains updated
- [ ] Test authentication flow
- [ ] Test all core features
- [ ] Check mobile responsiveness
- [ ] Verify no console errors
- [ ] Test on different browsers
- [ ] Set up monitoring/analytics (optional)

---

## 🔄 Continuous Deployment

With the GitHub Actions workflow:

1. **Automatic Deployments**
   - Every push to `main` → Production deployment
   - Every PR → Preview deployment

2. **Preview URLs**
   - Each PR gets a unique preview URL
   - Test changes before merging
   - Automatically deleted after PR merge

3. **Rollback**
   - Go to Vercel dashboard
   - Select previous deployment
   - Click "Promote to Production"

---

## 📈 Performance Optimization

### After Deployment

1. **Enable Vercel Analytics**
   - Go to project settings
   - Enable Web Analytics
   - Track Core Web Vitals

2. **Optimize Bundle Size**
   ```bash
   npx expo export:web --clear
   ```

3. **Enable Compression**
   - Already configured in `vercel.json`
   - Gzip enabled by default

4. **CDN Caching**
   - Static assets cached for 1 year
   - HTML cached with no-store

---

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring**
   - Vercel Analytics
   - Firebase Performance Monitoring
   - Error tracking (Sentry)

2. **Configure alerts**
   - Deployment failures
   - Performance degradation
   - Error spikes

3. **Add CI/CD enhancements**
   - Run tests before deploy
   - Lighthouse checks
   - Bundle size monitoring

4. **Scale up**
   - Consider Vercel Pro for team features
   - Set up staging environment
   - Add preview environments

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

## 🆘 Support

If you encounter issues:

1. Check [Vercel Logs](https://vercel.com/docs/concepts/deployments/logs)
2. Review [GitHub Actions Logs](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/using-workflow-run-logs)
3. Test locally with `npm run build && npx serve dist`
4. Verify all environment variables are set correctly

---

**Happy Deploying! 🚀**

Your Learning AI app is ready to reach users worldwide!
