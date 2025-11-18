# Pre-Launch Checklist

Use this checklist to verify your Learning AI app is ready to run.

## ✅ Project Files

- [x] `App.tsx` - Main app entry point
- [x] `src/navigation/AppNavigator.tsx` - Navigation setup
- [x] `src/types/app.ts` - TypeScript type definitions
- [x] `.env.example` - Environment variable template
- [x] `README.md` - Documentation
- [x] `SETUP.md` - Setup instructions

## ✅ Components (4 files)

- [x] `src/components/Button.tsx`
- [x] `src/components/Input.tsx`
- [x] `src/components/Container.tsx`
- [x] `src/components/LoadingScreen.tsx`

## ✅ Screens (9 files)

- [x] `src/screens/LoginScreen.tsx`
- [x] `src/screens/GoalSelectionScreen.tsx`
- [x] `src/screens/LevelSelectionScreen.tsx`
- [x] `src/screens/NextStepScreen.tsx`
- [x] `src/screens/LessonScreen.tsx`
- [x] `src/screens/QuizScreen.tsx`
- [x] `src/screens/PracticeScreen.tsx`
- [x] `src/screens/ProgressScreen.tsx`
- [x] `src/screens/SettingsScreen.tsx`

## ✅ Services (4 files)

- [x] `src/services/firebase.ts` - Firebase configuration
- [x] `src/services/auth.ts` - Authentication service
- [x] `src/services/memory.ts` - Firestore operations
- [x] `src/services/llmEngine.ts` - Learning engine (mock + real LLM)

## ✅ State Management (2 files)

- [x] `src/state/userStore.ts` - User state (Zustand)
- [x] `src/state/learningStore.ts` - Learning state (Zustand)

## 🔧 Setup Steps

Before running the app, complete these steps:

### 1. Dependencies
```bash
npm install
```
- [ ] All packages installed successfully
- [ ] No critical errors

### 2. Environment Variables
```bash
cp .env.example .env
# Edit .env with your credentials
```
- [ ] `.env` file created
- [ ] Firebase credentials added
- [ ] Google OAuth credentials added

### 3. Firebase Setup
- [ ] Firebase project created
- [ ] Authentication enabled (Google)
- [ ] Firestore database created
- [ ] Firestore security rules updated

### 4. Google OAuth Setup
- [ ] OAuth consent screen configured
- [ ] Web client ID created
- [ ] iOS client ID created
- [ ] Android client ID created

### 5. TypeScript Compilation
```bash
npx tsc --noEmit
```
- [ ] No TypeScript errors

### 6. Build Test
```bash
npm run web
```
- [ ] App starts without errors
- [ ] Login screen appears
- [ ] No console errors

## 🧪 Testing Flow

### Authentication
- [ ] Click "Continue with Google"
- [ ] Google sign-in popup appears
- [ ] Successfully sign in with Google account
- [ ] Redirected to Goal Selection screen

### Goal Setup
- [ ] Enter a learning goal (e.g., "Learn Python")
- [ ] Click example goal chips work
- [ ] Click "Next" button
- [ ] Reach Level Selection screen

### Level Selection
- [ ] Select a level (Beginner/Intermediate/Advanced)
- [ ] Click "Start Learning"
- [ ] User profile saved to Firestore
- [ ] Redirected to Main app with tabs

### Learning Flow
- [ ] Next Step screen loads
- [ ] "Start" button appears
- [ ] Clicking "Start" navigates to Lesson/Quiz/Practice screen
- [ ] Complete the step
- [ ] Return to Next Step screen
- [ ] New step is generated

### Progress Tab
- [ ] Progress screen shows stats
- [ ] Lessons completed count is accurate
- [ ] Quizzes completed count is accurate
- [ ] Recent activity appears

### Settings Tab
- [ ] User email displays correctly
- [ ] Dark mode toggle works
- [ ] Daily reminder toggle works
- [ ] Sign out button works
- [ ] After sign out, returns to Login screen

### Data Persistence
- [ ] Close and reopen app
- [ ] User stays logged in
- [ ] Progress is saved
- [ ] Can continue from where you left off

## 🚨 Common Issues

### Issue: Google Sign-In fails
**Fix:**
- Verify `.env` has correct client IDs
- Check OAuth redirect URIs
- Clear browser cache

### Issue: Firestore permission denied
**Fix:**
- Update Firestore security rules
- Verify user is authenticated
- Check user ID matches document ID

### Issue: TypeScript errors
**Fix:**
```bash
rm -rf node_modules
npm install
npx tsc --noEmit
```

### Issue: App won't start
**Fix:**
```bash
rm -rf .expo
npx expo start -c
```

## 📊 Performance Checks

- [ ] App loads in < 3 seconds
- [ ] No memory leaks
- [ ] Smooth navigation transitions
- [ ] No laggy UI interactions

## 🎨 UI/UX Checks

- [ ] All text is readable
- [ ] Buttons are tappable
- [ ] Forms are easy to fill
- [ ] Error messages are clear
- [ ] Loading states show correctly

## 🔒 Security Checks

- [ ] `.env` is in `.gitignore`
- [ ] No API keys in source code
- [ ] Firestore rules restrict access
- [ ] OAuth consent screen configured

## 🚀 Ready to Deploy?

Once all checkboxes are complete:

1. **Test on all platforms:**
   - [ ] Web browser
   - [ ] iOS simulator/device
   - [ ] Android emulator/device

2. **Update branding:**
   - [ ] Change app name in `app.json`
   - [ ] Replace icon in `assets/icon.png`
   - [ ] Update splash screen

3. **Prepare for production:**
   - [ ] Replace mock LLM with real API
   - [ ] Set up analytics
   - [ ] Add error tracking (Sentry, etc.)
   - [ ] Configure CI/CD

4. **Build production apps:**
   ```bash
   # iOS
   eas build --platform ios

   # Android
   eas build --platform android

   # Web
   npm run build
   ```

---

**Status:** ✅ All core features implemented and ready to test!

**Next:** Follow [SETUP.md](./SETUP.md) to configure Firebase and run the app.
