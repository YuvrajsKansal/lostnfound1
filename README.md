# Smart Lost & Found System

A modern full-stack Lost and Found web application built with **FastAPI**, **SQLModel (SQLite)**, and **React (Vite)**.

## Features
- **User Authentication**: Secure sign-up, login, and session tokens.
- **Lost & Found Reporting**: Submit lost or found reports with item categorization, location, date, custom marks, and photo uploads (JPEG/PNG/WEBP up to 5 MB).
- **Search & Filters**: Multi-field keyword search (title, description, category, location) and filter pills for Lost, Found, and Categories.
- **Resolution Verification**: Only the original reporter can mark an item as resolved or delete the listing.
- **Clean UI**: Modern, responsive interface built with React and Lucide icons.

---

## Project Structure
```
lostnfound1/
├── main.py              # FastAPI backend (integrated with auth & CRUD)
├── main_backup.py       # Starter backup copy
├── requirements.txt     # Python backend dependencies
├── uploads/             # Uploaded item images directory (.gitkeep)
└── frontend/            # React + Vite frontend application
    ├── src/
    │   ├── components/  # Navbar, FilterBar, ItemCard, Modals
    │   ├── api.js       # Backend API client
    │   ├── App.jsx      # Main application logic
    │   └── App.css      # Styling
    └── package.json
```

---

## Getting Started

### 1. Backend Setup
1. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```bash
   fastapi dev main.py
   ```
   * Interactive API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   * Open your browser at [http://localhost:5173](http://localhost:5173)
