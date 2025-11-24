# Firebase Configuration

This folder contains all Firebase-related configuration files for the Ishkul project.

## 📁 Files

### `config.ts`
Firebase client configuration used by the frontend application.

**Safe to commit:** These are public identifiers, not secrets. Security is enforced by Firestore and Storage rules.

```typescript
import { firebaseConfig } from '../../firebase/config';
```

### `firebase.json`
Firebase project configuration for Hosting, Firestore, and Storage.

### `.firebaserc`
Firebase project alias configuration. Update the `default` project ID with your Firebase project.

### `firestore.rules`
Firestore security rules that control database access.

**Important:** Review and customize these rules before deploying to production.

### `firestore.indexes.json`
Firestore composite indexes for optimized queries.

### `storage.rules`
Firebase Storage security rules that control file access.

**Important:** Review and customize these rules before deploying to production.

## 🔧 Configuration

### 1. Update Project ID

Edit [`.firebaserc`](.firebaserc):

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 2. Update Firebase Config

Edit [`config.ts`](config.ts) with values from [Firebase Console](https://console.firebase.google.com):

1. Go to Project Settings → General
2. Scroll to "Your apps"
3. Select or create a Web app
4. Copy the config values

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

## 🔐 Security Rules

### Firestore Rules ([`firestore.rules`](firestore.rules))

Current rules:
- Users can read/write their own user document
- Users can read/write their own progress
- Lessons are public read, admin write only

### Storage Rules ([`storage.rules`](storage.rules))

Current rules:
- Users can read/write their own uploads
- 10MB file size limit

### Customizing Rules

Edit the rules files and deploy:

```bash
# Deploy Firestore rules
npm run deploy:firestore

# Deploy Storage rules
npm run deploy:storage
```

## 📚 Learn More

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
