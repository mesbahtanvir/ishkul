# Firebase Setup Guide

Quick reference for setting up Firebase configuration.

## 📋 Checklist

- [ ] Update [`.firebaserc`](.firebaserc) with your project ID
- [ ] Update [`config.ts`](config.ts) with your Firebase web app config
- [ ] Review and customize [`firestore.rules`](firestore.rules)
- [ ] Review and customize [`storage.rules`](storage.rules)
- [ ] Run `./scripts/setup-secrets.sh` for backend credentials

## 🚀 Quick Setup

### 1. Set Project ID

```bash
# Edit .firebaserc
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### 2. Get Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Project Settings** → **General**
4. Scroll to **Your apps** section
5. Click **Add app** → **Web** (if you don't have one)
6. Copy the config object

### 3. Update config.ts

Edit [`config.ts`](config.ts):

```typescript
export const firebaseConfig = {
  apiKey: "AIza...",                          // From step 2
  authDomain: "your-project.firebaseapp.com", // From step 2
  projectId: "your-project-id",               // From step 2
  storageBucket: "your-project.appspot.com",  // From step 2
  messagingSenderId: "123456789",             // From step 2
  appId: "1:123456789:web:abc123",            // From step 2
};
```

**Note:** These values are safe to commit! They're public identifiers.

## 🔐 Security Rules

### Firestore Rules

Current rules in [`firestore.rules`](firestore.rules):

```javascript
// Users can read/write their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Lessons are public read
match /lessons/{lessonId} {
  allow read: if true;
  allow write: if request.auth.uid != null &&
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

**Customize before production!**

### Storage Rules

Current rules in [`storage.rules`](storage.rules):

```javascript
// Users can only access their own uploads
match /uploads/{userId}/{allPaths=**} {
  allow read, write: if request.auth.uid == userId &&
                        request.resource.size < 10 * 1024 * 1024; // 10MB limit
}
```

**Customize before production!**

## 🧪 Testing Rules

### Test Firestore Rules

```bash
# Install Firebase emulators
firebase init emulators

# Start emulators
firebase emulators:start

# Run tests (create tests in tests/ directory)
firebase emulators:exec "npm test"
```

### Test Storage Rules

Use the [Firebase Rules Playground](https://console.firebase.google.com) in the Firebase Console.

## 📤 Deploying Rules

```bash
# Deploy Firestore rules and indexes
npm run deploy:firestore

# Deploy Storage rules
npm run deploy:storage

# Deploy everything
./deploy.sh
```

## 📚 Learn More

- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules Guide](https://firebase.google.com/docs/storage/security)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

## 🆘 Common Issues

### "Permission denied" errors

Check your security rules - they might be too restrictive.

### "Index required" errors

Add the required index to [`firestore.indexes.json`](firestore.indexes.json) or click the link in the error message.

### "Storage quota exceeded"

Upgrade your Firebase plan or clean up old files.

## 🔗 Related Files

- [`../DEPLOY_GUIDE.md`](../DEPLOY_GUIDE.md) - Full deployment guide
- [`../deploy.sh`](../deploy.sh) - Deployment script
- [`../scripts/setup-secrets.sh`](../scripts/setup-secrets.sh) - Backend secrets setup
