# Sign-Learner

Sign-Learner is an app for learning Ukrainian Sign Language with lessons, a gesture dictionary, camera-based practice, and ML gesture recognition.

## Features

- Registration, login, and JWT authentication.
- Lessons for the Ukrainian sign alphabet.
- Gesture dictionary with images and demos.
- Camera-based practice with gesture validation.
- Progress, XP, streak logic, and achievements.
- React/Vite web client.
- Expo mobile client for Android/iOS with `auto`, `local`, and `server` ML modes.
- Separate ML service powered by MediaPipe and ONNX Runtime.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Backend | FastAPI, SQLAlchemy, Alembic, PostgreSQL, JWT |
| ML service | FastAPI, MediaPipe, ONNX Runtime, PyTorch tooling |
| Web client | React, Vite, TypeScript, MUI, Radix UI |
| Mobile app | Expo Router, React Native, TypeScript |
| Infrastructure | Docker Compose |

## Project Structure

```text
.
├── server/        # FastAPI backend, API routes, models, migrations
├── ml/            # ML inference service, training/export scripts, model artifacts
├── mobile/        # Web client built with React + Vite
├── mobile_expo/   # Expo mobile client
├── docker-compose.yaml
├── .env.example
└── README.md
```

## Quick Start with Docker

Requirements: Docker and Docker Compose.

Create `.env` from `.env.example` and adjust the values for your local setup.

```powershell
docker compose up --build -d
```

The default Compose stack starts the database, backend, web client, and ML inference endpoint. It does not run model training. The ML image installs inference-only dependencies and uses the runtime model files committed under `ml/models/`.

Available services:

| Service | URL |
| --- | --- |
| Web client | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| ML health check | http://localhost:8001/health |
| PostgreSQL | `localhost:5433` |

After the first startup, apply migrations and seed the database:

```powershell
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed.py
```

## Environment Variables

The root `.env` file is used by Docker Compose and the backend container.

```env
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=sign_language_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
```

Backend variables supported by the config:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET_KEY` | JWT signing secret |
| `JWT_ALGORITHM` | JWT algorithm, defaults to `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime |
| `ML_SERVICE_URL` | ML service URL, defaults to `http://ml:8001` |

For the Expo client, create `mobile_expo/.env` from `mobile_expo/.env.example` and set:

```env
EXPO_PUBLIC_API_BASE_URL=http://[IP_OR_LINK_TO_HOSTED_BACKEND]:8000
EXPO_PUBLIC_ML_MODE=auto
```

For a physical phone on the same Wi-Fi network, use your computer's LAN IP.

## Local Development

### Backend

For local backend development without running the full Docker Compose stack, start PostgreSQL separately or run only the database service:

```powershell
docker compose up -d db
```

When the backend runs on the host machine, it reads `.env` from the `server` directory. Create `server/.env` from the root `.env.example` and adjust the database host/port.

Use these values in `server/.env` for local development:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
```

Then run:

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python scripts/seed.py
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### ML Service

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn inference.main:app --reload --host 0.0.0.0 --port 8001
```

`requirements.txt` points to the lightweight inference dependency set. Install `requirements.training.txt` only when you need to run training or export scripts.

The runtime model files are kept in the repository for quick local startup:

```text
ml/models/gesture_classifier.onnx
ml/models/gesture_classifier.onnx.data
ml/models/label_map.json
ml/models/hand_landmarker.task
```

Training dependencies are available only through the tools profile:

```powershell
docker compose --profile tools build ml-tools
docker compose --profile tools run --rm ml-tools train/train.py --train-data data/zenodo/train_landmarks.csv --val-data data/zenodo/val_landmarks.csv --test-data data/zenodo/test_landmarks.csv --label-map data/zenodo_label_map.json --output models/
```

### Web Client

```powershell
cd mobile
npm install
npm run dev
```

By default, the client uses `http://localhost:8000` as the backend origin.

### Expo Mobile Client

```powershell
cd mobile_expo
npm install
npm run start
```

Before running the Expo app, create `mobile_expo/.env` from `mobile_expo/.env.example` and set the API URL for your emulator, simulator, or physical device.

Gesture recognition modes:

| Mode | Behavior |
| --- | --- |
| `auto` | Try native on-device ML first, then fall back to the backend |
| `local` | Native on-device ML only |
| `server` | Backend `/api/ml/predict` only |

Expo Go cannot load the native ML module. Use a custom development build or APK for local on-device ML.

## API

The backend mounts all API routes under `/api`.

| Group | Purpose |
| --- | --- |
| `/api/auth` | Register, login, refresh |
| `/api/users` | Current user, profile, stats |
| `/api/gestures` | Gesture list and gesture details |
| `/api/lessons` | Lessons, lesson details, completion |
| `/api/practice` | Practice progress, attempts, skip |
| `/api/achievements` | Achievement list and user achievements |
| `/api/ml/predict` | Proxy to the ML service |

The ML service exposes separate endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service status and loaded model info |
| `POST /predict` | Gesture recognition from an uploaded image |

## Data and Media

Seed the base data with:

```powershell
cd server
python scripts/seed.py
```

The seed script creates:

- `ukr` language entry;
- Ukrainian alphabet gestures;
- lessons;
- base achievements.

Import gesture images:

```powershell
python server/scripts/import_gesture_media.py
```

With Docker:

```powershell
docker compose exec backend python scripts/import_gesture_media.py
```

Source gesture media is committed under:

```text
server/assets/gestures/ukr/icon/<symbol>.png
server/assets/gestures/ukr/demo/<symbol>.png
```

The import script copies these files into runtime storage under `server/media/gestures/...`. Runtime media remains ignored by Git.

Override source paths with `GESTURE_ICON_DIR` and `GESTURE_DEMO_DIR`.

## Migrations

```powershell
cd server
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Checks

Automated tests are not configured in this repository yet. Before shipping changes, run at least:

```powershell
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose exec backend python scripts/seed.py
```

For the Expo client:

```powershell
cd mobile_expo
npm run typecheck
```

For ML dependency changes, verify that the inference dependency set is enough to import the service:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.inference.txt
python -c "from inference.main import app; print(app.title)"
```

## License

MIT. See `LICENSE`.
