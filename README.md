
This project combines **Django REST Framework** for the backend and **Vite + React** for the frontend.

---

## 🐍 Backend Setup (Django)

### 1. Navigate to the project root and create a virtual environment

```bash
python -m venv venv
```

### 2. Activate the virtual environment

- **Windows**:
  ```bash
  venv\Scriptsctivate
  ```
- **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Apply migrations

Make sure the database is set up:

```bash
python manage.py migrate
```

### 5. Run the Django development server

```bash
python manage.py runserver
```

```bash
daphne -p 8000 pos_backend.asgi:application
```

```bash
daphne -b 0.0.0.0 -p 8000 pos_backend.asgi:application
```

Your Django API will now be running at `http://127.0.0.1:8000`.

---

## ⚛️ Frontend Setup (React + Vite)

### 1. Navigate to the frontend directory

```bash
cd frontend
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Start the frontend development server

```bash
npm run dev
```

Your React app will now be running at `http://localhost:5173`.

---

## 🌐 Project URLs

- **Backend (Django API)**: `http://127.0.0.1:8000`
- **Frontend (React app)**: `http://localhost:5173`
