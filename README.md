# Loan Management System (Web)

A full-stack Loan Management Web Application built with **FastAPI** (Python) on the backend and **React + Vite** on the frontend.

## Architecture

```
loan-management-web/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy database models
│   │   ├── routes/        # API route handlers (customers, loans, payments, login)
│   │   ├── schemas/       # Pydantic schemas / request-response validation
│   │   ├── services/      # Business logic (loan calculations, schedules)
│   │   └── utils/         # Helper functions & time zone management
│   ├── config.py          # App settings & environment config
│   ├── database.py        # SQLite / SQLAlchemy engine & session setup
│   ├── main.py            # FastAPI entry point
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Example environment variables
│
└── frontend/
    ├── src/
    │   ├── components/    # Customer, Loan, Payment, and Home dashboard components
    │   ├── api.js         # Axios / Fetch client for backend APIs
    │   ├── App.jsx        # Main application router and state
    │   └── main.jsx       # React entry point
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Features

- **Authentication & Security**: Admin authentication using JWT tokens.
- **Customer Management**: Add, update, view, and search customer records.
- **Loan Origination & Tracking**: Create loans with flexible interest rates, terms, and repayment schedules.
- **Payment Processing**: Record loan repayments and track payment history.
- **Dashboard & Analytics**: Overview of total loans disbursed, pending dues, and customer statistics.

## Getting Started

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

The backend API will run at `http://localhost:8000`. Swagger API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run at `http://localhost:5173`.
