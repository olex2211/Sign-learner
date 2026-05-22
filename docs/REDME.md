# Sign-Learner Frontend Client Spec

Дата: 2026-05-22

Цей документ описує клієнтну частину Sign-Learner: логіку застосунку, сторінки, навігацію, навчальний алгоритм, API-зв'язки, ключові UI-стани та правила, які треба тримати в контексті під час створення дизайну і фронтенду.

## 1. Продуктова ідея

Sign-Learner - мобільний застосунок для вивчення української жестової мови через букви українського алфавіту. Основний цикл:

1. Користувач входить або реєструється.
2. Бачить свій прогрес, XP, streak і наступну букву.
3. Відкриває урок конкретної букви.
4. Дивиться опис і приклад жесту.
5. Переходить у practice screen з камерою.
6. Показує жест.
7. ML розпізнає жест.
8. Backend зараховує або не зараховує успішний показ.
9. Користувач рухається далі по алфавіту, а незакріплені букви повертаються в чергу через кілька позицій.
10. За успішні покази нараховується XP, а за повне закриття букви - додатковий бонус.

Застосунок має відчуватись не як тест, а як тренування з м'яким прогресом. В UI краще використовувати формулювання "Прогрес жесту: 1/2", а не "спроби".

## 2. Поточний backend contract

Основний API prefix:

```text
/api
```

Публічні auth endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
```

Захищені endpoints:

```text
GET   /api/users/me
PATCH /api/users/me
GET   /api/users/me/stats

GET   /api/lessons
GET   /api/lessons/{lesson_id}
POST  /api/lessons/{lesson_id}/complete

GET   /api/gestures?language_code=ukr
GET   /api/gestures/{gesture_id}

GET   /api/achievements
GET   /api/achievements/mine

POST  /api/ml/predict

GET   /api/practice/progress
POST  /api/practice/{lesson_id}/attempt
POST  /api/practice/{lesson_id}/skip
```

Всі endpoints, окрім auth, потребують JWT access token:

```text
Authorization: Bearer <access_token>
```

Медіа файли роздаються з:

```text
/media
```

На MVP приклади жестів будуть картинками.

## 3. Backend domain model, важливий для фронтенду

### User

Користувач має:

- `user_id`
- `username`
- `email`
- `experience_points`
- `current_streak`
- `created_at`

Stats endpoint додатково повертає:

- `level`
- `achievements_count`

### Gesture

Жест відповідає букві.

Поля:

- `gesture_id`
- `language_id`
- `symbol`
- `complexity`

Complexity:

```text
easy
medium
hard
```

UI labels:

```text
easy   -> Легкий
medium -> Середній
hard   -> Складний
```

### Lesson

Урок прив'язаний до жесту.

Поля:

- `lesson_id`
- `gesture_id`
- `title`
- `description`
- `order`
- `status`
- `media_items` у detail endpoint

Lesson status:

```text
locked
available
passed
skipped
```

Поки основний порядок навчання - алфавітний, від А до Я.

### UserGestureProgress

Це модель, яка відповідає за "Прогрес жесту: 1/2".

Поля, які клієнт отримує через `/api/practice/progress`:

- `lesson_id`
- `gesture_id`
- `symbol`
- `complexity`
- `successful_attempts`
- `required_attempts`
- `status`
- `lesson_status`
- `last_practiced_at`

Progress status:

```text
not_started
in_progress
mastered
```

Required attempts:

```text
easy   -> 2 успішні покази
medium -> 3 успішні покази
hard   -> 4 успішні покази
```

## 4. XP і зарахування

Успішний показ жесту:

```text
predicted_gesture === expected_gesture
confidence >= 0.75
```

XP rules:

```text
успішний показ -> +10 XP
повне закриття жесту -> +30 XP bonus
```

Приклад для easy букви:

```text
А 0/2
успішний показ -> А 1/2, +10 XP
повернути А в чергу через 3 позиції

А 1/2
успішний показ -> А 2/2, +10 XP +30 XP bonus
status -> mastered
lesson_status -> passed
```

Backend є авторитетним джерелом для XP, streak, status і gesture progress. Клієнт не має сам фінально зараховувати урок. Клієнт лише:

1. Відправляє фото на ML.
2. Отримує prediction.
3. Відправляє prediction result у practice endpoint.
4. Оновлює локальну UI-чергу на основі відповіді backend.

## 5. Practice queue algorithm

Практика відкривається тільки з конкретного уроку або gesture preview у Dictionary. Окремого Practice tab немає.

Після старту practice session формується черга букв.

Базовий порядок:

```text
А, Б, В, Г, Ґ, Д, Е, Є, Ж, ...
```

Якщо practice відкрито з букви `В`, session стартує з `В`, а далі йде алфавітна послідовність після неї:

```text
В, Г, Ґ, Д, Е, ...
```

Якщо буква вже `mastered`, її можна:

- пропустити в основній навчальній черзі;
- дозволити повторити вручну з Dictionary або Lesson Detail.

Правило повторення:

```text
Якщо буква показана успішно, але ще не mastered:
  вставити її назад у чергу через 3 позиції.

Якщо буква стала mastered:
  прибрати її з активної черги.

Якщо користувач натиснув "Пропустити":
  не додавати successful_attempt;
  викликати /api/practice/{lesson_id}/skip;
  вставити букву назад через 3 позиції, якщо вона ще не mastered.
```

Приклад:

```text
Початкова черга:
А, Б, В, Г, Ґ, Д

А показано успішно 1/2:
Б, В, Г, А, Ґ, Д

Б показано успішно 1/2:
В, Г, А, Ґ, Б, Д

А показано вдруге 2/2:
А mastered, більше не повертається в чергу
```

Це не календарне spaced repetition. `next_review_at` не потрібен. Повторення позиційне, всередині поточної session.

## 6. Navigation

Рекомендована структура Expo Router:

```text
app/
  (auth)/
    login.tsx
    register.tsx

  (app)/
    _layout.tsx
    index.tsx
    lessons/
      index.tsx
      [id].tsx
    dictionary/
      index.tsx
      [id].tsx
    practice/
      [id].tsx
    profile.tsx
    achievements.tsx
```

Основні tabs:

```text
Home
Lessons
Dictionary
Profile
```

Не робити:

- окремий Practice tab;
- Achievements tab;
- landing page всередині застосунку.

Practice відкривається тільки з:

- Lesson Detail;
- Dictionary Gesture Preview.

Achievements доступні з Profile.

## 7. Global client architecture

Рекомендований frontend stack:

- Expo / React Native
- Expo Router
- Axios або fetch wrapper
- SecureStore для JWT
- Zustand для client state
- expo-camera для практики
- react-native-reanimated для м'яких переходів і progress feedback

State modules:

```text
authStore
  accessToken
  refreshToken
  isBootstrapping
  isAuthenticated
  login()
  register()
  logout()
  refresh()
  bootstrap()

userStore
  user
  stats
  fetchMe()
  fetchStats()
  updateProfile()

lessonsStore
  lessons
  selectedLesson
  fetchLessons()
  fetchLesson(id)

practiceStore або usePracticeSession()
  progress[]
  queue[]
  currentItem
  prediction
  sessionFeedback
  fetchProgress()
  buildQueue(startLessonId)
  predictFrame()
  submitAttempt()
  skipCurrent()
  goNext()

dictionaryStore або derivation layer
  gestures
  gestureCards = gestures + lessons + practiceProgress

achievementsStore
  all
  mine
  fetchAll()
  fetchMine()
```

Practice session краще зробити hook-ом або scoped store, щоб не забруднювати глобальний стан тимчасовими camera/prediction даними.

## 8. API client rules

JWT зберігати тільки в SecureStore:

```text
access_token
refresh_token
```

AsyncStorage для JWT не використовувати.

API client:

1. Додає `Authorization: Bearer access_token`.
2. На `401` пробує `POST /api/auth/refresh`.
3. Якщо refresh вдався - зберігає новий access token і повторює оригінальний запит.
4. Якщо refresh не вдався - очищає токени і повертає користувача на Login.

ML upload:

```text
POST /api/ml/predict
Content-Type: multipart/form-data
field: file
```

Practice attempt:

```json
{
  "predicted_gesture": "А",
  "confidence": 0.87
}
```

## 9. Screen specs

### 9.1 Login

Мета: швидкий вхід.

UI:

- username input;
- password input;
- primary button "Увійти";
- link "Створити акаунт";
- error message area;
- loading state на кнопці.

API:

```text
POST /api/auth/login
GET /api/users/me
GET /api/users/me/stats
GET /api/practice/progress
```

Success flow:

1. Зберегти tokens.
2. Завантажити user/stats/progress.
3. Перейти на Home.

Error states:

- неправильний username/password;
- server unavailable;
- network error.

### 9.2 Register

Мета: створення акаунта.

UI:

- username;
- email;
- password;
- primary button "Створити акаунт";
- link "Уже маю акаунт";
- validation messages.

Validation:

```text
username >= 3 символи
password >= 5 символів
email валідний
```

API:

```text
POST /api/auth/register
```

Success flow:

1. Backend повертає tokens.
2. Зберегти tokens.
3. Завантажити user/stats/progress.
4. Перейти на Home.

### 9.3 Home

Мета: робочий навчальний dashboard.

Home не має бути landing page. Це перший екран дії.

UI blocks:

- greeting: "Привіт, {username}";
- compact XP/Level block;
- streak;
- progress summary: "Вивчено X з 33";
- "Продовжити навчання";
- card наступної букви;
- small preview останніх/активних букв;
- CTA "Продовжити".

Data:

```text
GET /api/users/me
GET /api/users/me/stats
GET /api/lessons
GET /api/practice/progress
```

Next lesson logic:

1. Взяти lessons у order.
2. Змерджити з practice progress.
3. Знайти перший не mastered lesson.
4. Якщо є in_progress, можна пріоритезувати його перед not_started.
5. Якщо всі mastered - показати completed state і CTA "Повторити алфавіт".

UI state examples:

```text
Продовжити: Буква Д
Прогрес жесту: 1/2
```

або:

```text
Алфавіт завершено
Повтори жести у Dictionary
```

### 9.4 Lessons List

Мета: карта навчання по алфавіту.

Layout:

- compact progress header;
- alphabet grid;
- cards/tiles for letters.

Header:

```text
Уроки
Вивчено X/33
```

Tile content:

- letter symbol;
- title or small label;
- progress bar;
- "Прогрес жесту: 1/2";
- status indicator:
  - not_started;
  - in_progress;
  - mastered;
  - skipped;
- small complexity marker.

Data:

```text
GET /api/lessons
GET /api/practice/progress
```

Ordering:

```text
А-Я, alphabet order
```

Tap:

```text
Lessons List -> Lesson Detail
```

### 9.5 Lesson Detail

Мета: preview конкретної букви перед камерою.

UI:

- back button;
- title: "Буква А";
- large symbol "А";
- example image block;
- description;
- complexity label;
- progress text: "Прогрес жесту: 1/2";
- primary button "Практикувати";
- secondary button "Пропустити";
- if mastered: button "Повторити".

Не додавати learning hints. Опису уроку достатньо, інакше екран буде перевантажений.

Data:

```text
GET /api/lessons/{lesson_id}
GET /api/practice/progress
```

Media:

- поки очікуються images;
- якщо media немає, показати акуратний fallback, але не ламати layout.

Actions:

```text
Практикувати -> Practice Screen
Пропустити -> POST /api/practice/{lesson_id}/skip -> Next lesson або Lessons List
```

### 9.6 Practice Screen

Мета: тренування жесту через камеру.

Practice відкривається route:

```text
/practice/[lesson_id]
```

Екран працює як session, а не як одноразова сторінка одного уроку. Session стартує з вибраної букви, але після успішного часткового показу може перейти до наступної букви у queue.

Основний layout:

```text
Top bar:
  Назад
  Буква А
  Прогрес жесту: 1/2

Main:
  велике camera preview користувача
  маленький reference image як picture-in-picture

Bottom panel:
  feedback
  confidence/progress indicator
  primary action
  secondary skip action
```

Camera має бути головним елементом. Reference image має бути завжди доступною, але не забирати фокус.

Рекомендована композиція:

```text
┌────────────────────────┐
│ Буква А        1/2     │
├────────────────────────┤
│                        │
│      CAMERA USER       │
│                        │
│              ┌──────┐  │
│              │IMAGE │  │
│              └──────┘  │
├────────────────────────┤
│ Покажи жест у кадрі    │
│ [Перевірити] [Пропуст.]│
└────────────────────────┘
```

Reference image behavior:

- small overlay або side card залежно від viewport;
- tap opens bigger preview modal;
- never cover user's hand area too much;
- keep 8px radius or less if styled as card.

Practice states:

```text
idle
camera_permission_required
ready
capturing
predicting
submitting_attempt
success_partial
success_completed
wrong_gesture
low_confidence
no_hand_detected
ml_unavailable
network_error
```

Main actions:

- "Перевірити";
- "Спробувати ще";
- "Наступна буква";
- "Завершити";
- "Пропустити".

Flow:

1. User taps "Перевірити".
2. App captures camera frame.
3. App sends image to `/api/ml/predict`.
4. If ML returns prediction, app sends:

```text
POST /api/practice/{lesson_id}/attempt
```

5. Backend returns authoritative progress.
6. UI updates current progress.
7. Queue updates based on result.

ML result examples:

```json
{
  "gesture": "А",
  "confidence": 0.97,
  "label_index": 0
}
```

Attempt response examples:

```json
{
  "success": true,
  "is_completed": false,
  "successful_attempts": 1,
  "required_attempts": 2,
  "xp_earned": 10,
  "message": "Gesture progress: 1/2"
}
```

UI copy for successful partial:

```text
Добре!
Прогрес жесту: 1/2
+10 XP
Повторимо цю букву трохи пізніше.
```

UI copy for completed:

```text
Жест закріплено
Прогрес жесту: 2/2
+40 XP
```

Wrong gesture:

```text
Схоже на "Б". Потренуй "А" ще раз.
```

Low confidence:

```text
Майже. Покажи жест чіткіше.
```

No hand detected:

```text
Руку не видно в кадрі.
```

ML unavailable:

```text
Розпізнавання тимчасово недоступне.
```

### 9.7 Dictionary

Мета: довідник усіх жестів.

Dictionary є tab замість Achievements.

UI:

- title "Dictionary" або "Жести";
- compact progress header: "Вивчено X/33";
- grid of gestures;
- optional search/filter later;
- кожна картка має image, letter, progress bar.

Gesture card:

- image;
- symbol;
- progress bar знизу;
- "Прогрес жесту: 1/2";
- complexity;
- mastered checkmark.

Data:

```text
GET /api/gestures?language_code=ukr
GET /api/lessons
GET /api/practice/progress
```

Card derivation:

```text
gesture + matching lesson by gesture_id + matching practice progress by lesson_id
```

Tap:

```text
Dictionary -> Gesture Preview
```

### 9.8 Dictionary Gesture Preview

Мета: коротко подивитись жест і перейти до практики/уроку.

UI:

- large gesture image;
- symbol;
- complexity;
- status;
- progress: "Прогрес жесту: 1/2";
- short description from lesson if available;
- buttons:
  - "Практикувати", якщо не mastered;
  - "Повторити", якщо mastered;
  - "Перейти до уроку".

Behavior:

- якщо жест ще не вивчений, "Практикувати" відкриває Practice з цього lesson;
- якщо mastered, "Повторити" відкриває Practice, але backend не має додавати XP за already mastered attempt;
- "Перейти до уроку" відкриває Lesson Detail.

### 9.9 Profile

Мета: акаунт, прогрес, вихід і доступ до achievements.

UI:

- username;
- joined date;
- XP;
- level;
- streak;
- achievements count;
- button "Досягнення";
- button "Редагувати профіль";
- button "Вийти".

Data:

```text
GET /api/users/me
GET /api/users/me/stats
```

Edit profile:

- username;
- email;
- save;
- error if username/email taken.

API:

```text
PATCH /api/users/me
```

Logout:

1. Clear SecureStore tokens.
2. Clear auth/user/practice state.
3. Navigate to Login.

### 9.10 Achievements

Achievements не є tab. Вони відкриваються з Profile.

UI:

- title "Досягнення";
- summary "Отримано X з Y";
- list/grid achievements;
- earned achievements active;
- locked achievements muted;
- earned date for received achievements.

Data:

```text
GET /api/achievements
GET /api/achievements/mine
```

Merge logic:

```text
all achievements + mine achievements by achievement_id
```

If `icon_path` is null, show designed placeholder icon.

## 10. Empty, loading and error states

Required states:

- auth loading;
- lessons loading;
- progress loading;
- camera permission missing;
- no media for lesson;
- no hand detected;
- ML service unavailable;
- network unavailable;
- backend unavailable;
- token expired and refresh failed;
- lesson not found;
- repeated attempt on mastered gesture.

Every major screen should support:

```text
loading
success
empty
error
refreshing
```

Practice screen additionally needs:

```text
camera unavailable
permission denied
image capture failed
prediction failed
attempt submit failed
```

## 11. Visual design direction

General feel:

- focused learning tool;
- friendly but not childish;
- clear progress feedback;
- compact dashboard-like UI;
- not a marketing landing page.

Core principles:

- camera and gesture examples must be visually dominant where relevant;
- progress should be visible but not noisy;
- cards should be functional, not decorative;
- buttons use clear actions;
- avoid nested cards;
- avoid huge hero sections inside app;
- text must fit on mobile.

Suggested visual language:

- calm background;
- strong accent for success/progress;
- neutral surfaces;
- clear status colors:
  - mastered: green/accent;
  - in progress: blue/accent;
  - skipped: gray/amber;
  - error: red;
- image-first gesture cards in Dictionary.

## 12. Components to build

Core UI:

- `Screen`
- `AppHeader`
- `TabBar`
- `Button`
- `IconButton`
- `TextField`
- `ProgressBar`
- `StatusPill`
- `LoadingState`
- `ErrorState`
- `EmptyState`

Learning:

- `LessonTile`
- `LessonGrid`
- `LessonProgressHeader`
- `GestureImage`
- `GestureReferencePreview`
- `GestureComplexityBadge`
- `GestureProgressText`
- `GestureProgressBar`

Practice:

- `CameraPreview`
- `ReferenceOverlay`
- `PracticeFeedbackPanel`
- `ConfidenceIndicator`
- `PracticeActionBar`
- `ResultSheet`

Profile:

- `StatsSummary`
- `XPLevelBar`
- `StreakCounter`
- `AchievementCard`

Dictionary:

- `GestureCard`
- `GesturePreviewSheet`
- `DictionaryGrid`

## 13. Implementation phases

### Phase 1: App foundation

- Expo project setup.
- Routing structure.
- API client with auth refresh.
- SecureStore token storage.
- Auth store.
- Basic UI primitives.

### Phase 2: Auth and bootstrap

- Login.
- Register.
- Token bootstrap.
- Protected app layout.
- Logout.

### Phase 3: Learning data

- Lessons API module.
- Practice progress API module.
- Home dashboard.
- Lessons grid.
- Lesson detail.

### Phase 4: Dictionary

- Gestures API module.
- Merge gestures + lessons + progress.
- Dictionary grid.
- Gesture preview.

### Phase 5: Practice

- Camera permission flow.
- Capture image.
- ML prediction upload.
- Practice attempt submit.
- Queue algorithm.
- Result feedback.
- Skip behavior.

### Phase 6: Profile and achievements

- Profile screen.
- Edit profile.
- Achievements screen.
- Stats refresh after practice.

### Phase 7: Polish and edge cases

- Better loading/error states.
- Offline/network handling.
- Animation pass.
- Camera layout refinement.
- Responsive checks.
- Copy polish.

## 14. Key decisions already made

- Practice opens only from a lesson or dictionary gesture preview.
- Main tabs: Home, Lessons, Dictionary, Profile.
- Achievements live under Profile.
- Lessons list uses alphabet grid + compact progress header.
- Learning order is alphabetical from А to Я.
- Gesture complexity enum is `easy | medium | hard`.
- Required successful shows:
  - easy: 2
  - medium: 3
  - hard: 4
- A gesture does not need repeated successful shows in a row.
- After a successful partial attempt, the gesture returns to the queue after 3 positions.
- Button "Пропустити" is required.
- Lesson detail has preview + "Практикувати".
- No learning hints on lesson screen.
- Practice screen must show both user camera and reference image.
- Backend stores gesture progress.
- XP is awarded after every successful show and extra bonus is awarded on full mastery.

## 15. Open questions for later

- Exact visual style and color palette.
- Exact image assets for each gesture.
- Whether Dictionary should use Ukrainian title "Жести" or English "Dictionary".
- Whether mastered gestures can be practiced without XP forever or should have a separate review mode later.
- Whether skipped lessons should be visually separate from not_started lessons.
- Whether to add backend endpoint returning lessons already enriched with gesture + practice progress to reduce frontend merging.

