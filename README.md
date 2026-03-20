# ⚔️ RIVAL — Live Multiplayer Messaging & Gaming App

Real accounts, real-time messaging, multiplayer games, friend invites — all backed by Firebase.

---

## 🔥 SETUP GUIDE (15 minutes)

### Step 1: Create Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Create a project"** → Name it `rival-app` → Continue
3. Disable Google Analytics (not needed) → **Create Project**

### Step 2: Enable Authentication

1. In your Firebase project, go to **Build → Authentication** (left sidebar)
2. Click **"Get started"**
3. Click **Email/Password** → Toggle **Enable** → **Save**

### Step 3: Create Firestore Database

1. Go to **Build → Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Select **"Start in test mode"** → Choose a region (us-central1 is fine) → **Enable**
4. Once created, go to the **Rules** tab
5. Replace the rules with the contents of `firestore.rules` in this project
6. Click **Publish**

### Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon top-left → Project settings)
2. Scroll down to **"Your apps"** section
3. Click the **web icon** `</>` to add a web app
4. Name it `rival-web` → **Register app**
5. Copy the `firebaseConfig` object values
6. Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",          // your actual key
  authDomain: "rival-app-xxxxx.firebaseapp.com",
  projectId: "rival-app-xxxxx",
  storageBucket: "rival-app-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 5: Create Firestore Indexes

The app needs one composite index. You'll see an error link in the browser console the first time conversations load — click it to auto-create the index. Or create it manually:

1. Go to **Firestore → Indexes** tab
2. Click **"Add Index"**
3. Collection: `conversations`
   - Field: `participants` → Arrays
   - Field: `lastMessageTime` → Descending
4. Click **Create**

Also create for notifications:
- Collection: `notifications`
  - Field: `to` → Ascending
  - Field: `createdAt` → Descending

### Step 6: Install & Run Locally

```bash
cd rival-app
npm install
npm run dev
```

Open **http://localhost:5173** on your phone (use your computer's local IP, e.g. `http://192.168.1.100:5173`)

### Step 7: Deploy to Netlify

```bash
npm run build
```

Then drag the `dist` folder to **https://app.netlify.com/drop**

Or connect via GitHub for auto-deploys (recommended).

---

## 🎮 FEATURES

### Real Accounts
- Sign up with email/password (Firebase Auth)
- Custom avatar picker
- Unique invite code per user

### Real-Time Messaging
- Messages sync instantly between devices (Firestore real-time listeners)
- Emoji picker
- Online/offline status indicators
- Conversation list sorted by latest message

### Multiplayer Games
- **Tic Tac Toe** — Real-time synced via Firestore. See opponent's moves live.
- **Battleship** — Ship placement + attack phases, fully synced between 2 players.
- **Hangman** — Solo mode (play against the word bank)
- **Stick Fight & 8 Ball Pool** — Coming soon for multiplayer

### Friend System
- Search for friends by email address
- Add friends with one tap
- See who's online in real-time

### Invite System
- Each user gets a unique invite code
- Share via native Share API (or clipboard fallback)
- Invite link format: `https://yoursite.com?invite=ABC123`

### Notifications
- Game challenge notifications (tap to jump into the game)
- Friend added notifications
- Unread badge count on home screen

---

## 📁 Project Structure

```
rival-app/
├── index.html              # Entry HTML with PWA meta tags
├── netlify.toml            # Netlify build config
├── package.json            # Dependencies (React + Firebase)
├── vite.config.js          # Vite + PWA plugin
├── firestore.rules         # Security rules (paste into Firebase Console)
├── public/icons/           # PWA icons
└── src/
    ├── main.jsx            # React entry
    ├── firebase.js         # Firebase config (ADD YOUR KEYS HERE)
    └── App.jsx             # Full app (auth, chat, games, friends)
```

## 🔒 Firestore Data Model

```
users/{uid}
  ├── name, email, avatar, status, inviteCode
  ├── friends: [uid, uid, ...]
  └── createdAt, lastSeen

conversations/{convoId}
  ├── participants: [uid, uid]
  ├── lastMessage, lastMessageTime
  └── messages/{msgId}
        ├── from, text, type, timestamp

games/{gameId}
  ├── type: "tictactoe" | "battleship"
  ├── players: [uid, uid]
  ├── turn, winner, board/state fields
  └── createdAt, lastMove

notifications/{notifId}
  ├── to, from, fromName, type
  ├── text, read, gameId?, gameType?
  └── createdAt
```

---

## 🚀 Next Steps After Launch

- **Push notifications** — Add Firebase Cloud Messaging (FCM) for real push alerts
- **Photo sharing** — Add Firebase Storage for image uploads in chat
- **More multiplayer games** — Wire up Stick Fight and 8 Ball Pool with Firestore sync
- **Contact sync** — Wrap with Capacitor for native contact access
- **App stores** — Use Capacitor to submit to Google Play and Apple App Store
