# 🚚 LogistiQ — Система управління транспортною логістикою

> BEST::HACKath0n 2026 · Track: Innovate · "Інновації в транспортній логістиці"

LogistiQ — це вебзастосунок для **динамічного розподілу ресурсів** між складами та точками доставки в умовах змінного попиту.

---

## 🎯 Ключові можливості

| Функція | Опис |
|---|---|
| **Алгоритм пріоритизації** | Три рівні: Critical (100) → Elevated (50) → Normal (10) |
| **Авто-розподіл** | Greedy алгоритм — заповнює потребу з кращих складів |
| **Термінові запити** | Real-time сповіщення через WebSocket при критичних запитах |
| **Пошук найближчого** | Haversine формула — топ-5 складів з потрібним залишком |
| **Офлайн-режим** | IndexedDB черга → авто-синхронізація при відновленні зв'язку |
| **Безпека** | JWT, bcrypt, helmet, rate limiting, валідація вхідних даних |

---

## 🏗️ Архітектура

```
logistiq/
├── backend/                  # Node.js + Express + Socket.io
│   └── src/
│       ├── index.js          # Точка входу, HTTP + WS сервер
│       ├── routes/
│       │   ├── auth.js       # POST /api/auth/login, /register
│       │   ├── requests.js   # CRUD запитів + /allocate
│       │   └── stock.js      # Запаси, склади, /nearest, /stats
│       ├── middleware/
│       │   └── auth.js       # JWT middleware + ролі
│       └── utils/
│           ├── db.js         # PostgreSQL pool
│           ├── schema.sql    # DDL схема бази даних
│           └── seed.js       # Тестові дані
└── frontend/                 # React 18 + Vite + Tailwind CSS
    └── src/
        ├── App.jsx           # Router + QueryClient + Toaster
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx  # Дашборд з критичними алертами
        │   ├── RequestsPage.jsx   # Список + фільтри + розподіл
        │   ├── StockPage.jsx      # Запаси по складах
        │   ├── WarehousesPage.jsx # Огляд складів
        │   └── NearestPage.jsx    # Геошук залишків
        ├── components/
        │   ├── Layout.jsx         # Sidebar + онлайн-статус
        │   ├── shared/index.jsx   # Badge, Spinner, StatCard, etc.
        │   └── modals/
        │       └── CreateRequestModal.jsx
        ├── hooks/
        │   ├── useSocket.js       # WebSocket + real-time invalidation
        │   └── useOfflineSync.js  # IndexedDB queue + sync
        └── services/
            └── api.js             # Axios + Zustand auth store
```

---

## ⚙️ Запуск локально

### Вимоги
- Node.js 20+
- PostgreSQL 15+

### 1. База даних

```bash
createdb logistiq
psql -d logistiq -f backend/src/utils/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Заповніть DATABASE_URL та JWT_SECRET у .env
npm install
npm run seed      # Заповнити тестові дані
npm run dev       # Старт на http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # Старт на http://localhost:3000
```

---

## 🔑 Тестові акаунти

| Email | Пароль | Роль |
|---|---|---|
| `admin@logistiq.ua` | `admin123` | Адміністратор (повний доступ) |
| `operator@logistiq.ua` | `operator123` | Оператор (обмежений доступ) |

---

## 📡 API Endpoints

### Auth
| Метод | Endpoint | Опис |
|---|---|---|
| POST | `/api/auth/login` | Авторизація → JWT токен |
| POST | `/api/auth/register` | Реєстрація нового користувача |

### Запити на постачання
| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/api/requests` | Список запитів (фільтр: status, priority) |
| POST | `/api/requests` | Створити запит |
| PATCH | `/api/requests/:id/priority` | Змінити пріоритет |
| PATCH | `/api/requests/:id/status` | Змінити статус |
| POST | `/api/requests/:id/allocate` | **Авто-розподіл** ресурсів |

### Запаси
| Метод | Endpoint | Опис |
|---|---|---|
| GET | `/api/stock` | Всі залишки по складах |
| GET | `/api/stock/stats` | Статистика для дашборду |
| GET | `/api/stock/nearest` | Найближчі склади з залишком |
| PATCH | `/api/stock/:wh/:res` | Оновити залишок |
| GET | `/api/stock/warehouses` | Список складів |
| GET | `/api/stock/resources` | Список ресурсів |
| GET | `/api/stock/delivery-points` | Точки доставки |

---

## 🧠 Алгоритм розподілу (Allocation Algorithm)

```
1. Отримати запит (потрібна кількість = requested - fulfilled)
2. Знайти всі склади де: (quantity - min_threshold) > 0
   → Сортування: (available_quantity) DESC
3. Greedy fill:
   for each warehouse:
     to_allocate = min(available, remaining_needed)
     remaining -= to_allocate
4. Зменшити stock на складах
5. Записати в allocations (audit log)
6. Статус: 'fulfilled' якщо remaining=0, інакше 'in_progress'
7. WebSocket emit → real-time оновлення всіх клієнтів
```

---

## 🌐 WebSocket Events

| Event | Напрямок | Опис |
|---|---|---|
| `critical_request` | Server → Client | Новий критичний запит (тост + invalidate) |
| `request_updated` | Server → Client | Зміна статусу/пріоритету |
| `stock_updated` | Server → Client | Зміна залишку на складі |

---

## 📱 Офлайн-режим

При відсутності інтернету:
1. Нові запити зберігаються у **IndexedDB** (QUEUE_STORE)
2. Sidebar показує кількість запитів у черзі
3. При відновленні зв'язку — автоматична синхронізація

---

## 🔒 Безпека

- **JWT** авторизація з підписом `HS256`
- **bcrypt** хешування паролів (salt rounds: 10)
- **helmet.js** — HTTP security headers
- **Rate limiting** — 200 req/15хв загально, 20 req/15хв для auth
- **express-validator** — валідація всіх вхідних даних
- **CORS** — whitelist тільки frontend URL


