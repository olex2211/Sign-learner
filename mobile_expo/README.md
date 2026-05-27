# Sign-Learner Mobile (Expo)

React Native + Expo mobile client for the Sign-Learner Ukrainian Sign Language (УЖМ) learning app.

## Quick Start

### Prerequisites
- Node.js 18+
- [Expo Go](https://expo.dev/go) on your Android or iOS device

### 1. Install dependencies

```bash
cd mobile_expo
npm install
```

### 2. Configure the API URL

Create `.env` from `.env.example` and set the backend URL for your environment:

| Environment | URL |
|-------------|-----|
| Android Emulator | `http://10.0.2.2:8000` (default) |
| Physical Android (same Wi-Fi) | `http://<your-laptop-lan-ip>:8000` |
| iOS Simulator | `http://localhost:8000` |

**Find your LAN IP:** `ipconfig` on Windows → look for IPv4 Address under Wi-Fi adapter.

### 3. Start the backend

```bash
# From the project root
docker compose up -d db
cd server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Run the Expo app

```bash
cd mobile_expo
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/(auth)/login` | Username + password login |
| Register | `/(auth)/register` | Create account |
| Home | `/(tabs)/home` | Stats, current lesson, week calendar |
| Lessons | `/(tabs)/lessons` | Learning queue, alphabet progress |
| Dictionary | `/(tabs)/dictionary` | All 33 Ukrainian letters grid |
| Profile | `/(tabs)/profile` | User stats, achievements link, logout |
| Lesson Detail | `/lessons/[id]` | Demo image, description, skip/practice |
| Gesture Preview | `/dictionary/[id]` | Large icon + demo, practice button |
| Practice | `/practice/[id]` | Camera + ML gesture recognition |
| Achievements | `/achievements` | Earned badges list |

## Architecture

```
mobile_expo/
  app/                    # Expo Router file-based routes
    _layout.tsx           # Root layout with auth guard
    (auth)/               # Login + Register
    (tabs)/               # Bottom tab navigation
    lessons/[id].tsx      # Lesson detail
    dictionary/[id].tsx   # Gesture preview
    practice/[id].tsx     # Camera + ML practice
    achievements.tsx      # Achievements list
  src/
    api/                  # fetch-based API client
      config.ts           # API_BASE_URL, MEDIA_BASE_URL
      client.ts           # authenticatedFetch + JWT refresh
      types.ts            # TypeScript API types
      auth.ts             # login, register, refresh
      users.ts            # getMe, getUserStats
      lessons.ts          # getLessons, getLesson
      gestures.ts         # getGestures, getGesture
      practice.ts         # getPracticeProgress, recordPracticeAttempt, skip
      achievements.ts     # getAchievements, getMyAchievements
      ml.ts               # predictGesture (multipart upload)
      media.ts            # resolveMediaUrl
    auth/
      tokenStore.ts       # SecureStore token helpers
      AuthContext.tsx      # Auth state + bootstrap
    components/           # Shared UI components
    constants/theme.ts    # Colors, Radius, FontSizes
    utils/
      practiceSession.ts  # In-memory practice queue logic
```

## Practice Flow

1. Open `/practice/[lesson_id]`
2. Camera auto-captures every ~1.8 seconds
3. Frame sent to `POST /api/ml/predict` (multipart)
4. Result submitted to `POST /api/practice/{lesson_id}/attempt`
5. Backend response is authoritative for XP, progress, status
6. On partial success → lesson reinserted after 3 in queue
7. On mastered → removed from queue
8. On skip → backend skip endpoint called, reinserted after 3

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL | `http://10.0.2.2:8000` |

## Building for Android

```bash
# Local native build (requires Android SDK)
npx expo run:android

# EAS cloud build (for distribution)
npx eas build --platform android
```
