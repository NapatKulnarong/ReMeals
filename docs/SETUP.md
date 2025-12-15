# ReMeals Setup Guide

Complete setup instructions for getting ReMeals running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.9 (for Next.js 16.0.3 and React 19.2.0)
- **Python** 3.12 or higher (for Django 5.2.8)
- **PostgreSQL** 16 or higher (or use Docker with PostgreSQL 16)
- **Docker** and **Docker Compose** (optional, for containerized setup)
- **Git** (for version control)

### Installing Prerequisites

#### macOS

**Install Homebrew** (if not already installed):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Install Node.js** (using nvm - recommended):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install and use Node.js 20
nvm install 20
nvm use 20
```

**Or install Node.js directly**:
```bash
brew install node@20
```

**Install Python 3.12**:
```bash
brew install python@3.12
```

**Install PostgreSQL 16**:
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Install Docker Desktop**:
- Download from [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
- Or install via Homebrew: `brew install --cask docker`

**Install Git** (usually pre-installed):
```bash
brew install git
```

#### Windows

**Install Node.js**:
1. Download Node.js 20.x LTS from [nodejs.org](https://nodejs.org/)
2. Run the installer and follow the setup wizard
3. Or use nvm-windows:
   ```powershell
   # Download nvm-windows from https://github.com/coreybutler/nvm-windows/releases
   # Install nvm-windows, then:
   nvm install 20
   nvm use 20
   ```

**Install Python 3.12**:
1. Download Python 3.12 from [python.org](https://www.python.org/downloads/)
2. During installation, check "Add Python to PATH"
3. Verify installation:
   ```powershell
   python --version
   ```

**Install PostgreSQL 16**:
1. Download PostgreSQL 16 from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Remember the password you set for the postgres user
4. Or use Docker (recommended for easier setup)

**Install Docker Desktop**:
1. Download from [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run the installer and follow the setup wizard
3. Restart your computer if prompted

**Install Git**:
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer with default options

### Check Your Versions

**macOS/Linux:**
```bash
node --version    # Should be >= 20.9
python --version  # Should be >= 3.12
psql --version    # Should be >= 15 (or 16)
docker --version  # Optional
```

**Windows (PowerShell):**
```powershell
node --version    # Should be >= 20.9
python --version  # Should be >= 3.12
psql --version    # Should be >= 15 (or 16)
docker --version  # Optional
```

## Installation Methods

You can set up ReMeals using either:
1. **Docker** (Recommended for quick start)
2. **Local Setup** (Recommended for active development)

---

## Method 1: Docker Setup (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/NapatKulnarong/Re-Meals.git
cd Re-Meals
```

### Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

**Generate Django SECRET_KEY:**

**macOS/Linux:**
```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Windows (PowerShell):**
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Alternative method (if Django is not installed yet):**
```bash
# macOS/Linux
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Windows
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copy the generated key and use it in your `.env` file.

Edit `.env` with your configuration:

```env
# Database
POSTGRES_DB=remeals
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Django
SECRET_KEY=your-generated-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Important**: Never share your SECRET_KEY or commit it to version control. Keep it secure!

### Step 3: Build and Start Services

```bash
docker-compose up -d
```

This will start:
- Frontend (Next.js 16.0.3) at http://localhost:3000
- Backend API (Django 5.2.8) at http://localhost:8000
- PostgreSQL 16 at localhost:5432
- pgAdmin 8.11 at http://localhost:5050

### Step 4: Run Database Migrations

```bash
docker-compose exec backend python manage.py migrate
```

### Step 5: Create Superuser (Optional)

```bash
docker-compose exec backend python manage.py createsuperuser
```

If you've already set `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_EMAIL`, and `DJANGO_SUPERUSER_PASSWORD` in your `.env`, you can auto-create the admin account without prompts (note the extra shell so the container expands the env vars, not your host shell):

```bash
docker-compose exec backend bash -c '
  python manage.py createsuperuser \
    --noinput \
    --username "$DJANGO_SUPERUSER_USERNAME" \
    --email "$DJANGO_SUPERUSER_EMAIL"
'
```

### Step 6: Load Sample Data (Optional)

```bash
docker-compose exec backend python manage.py loaddata fixtures/*.json
```

### Step 7: Access the Application

- **Frontend**: http://localhost:3000
- **Backend Admin**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/swagger/
- **pgAdmin**: http://localhost:5050

---

## Method 2: Local Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/NapatKulnarong/Re-Meals.git
cd Re-Meals
```

### Step 2: PostgreSQL Setup

#### macOS/Linux

Create a database for ReMeals:

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE remeals;

# Create user (optional)
CREATE USER remealsuser WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE remeals TO remealsuser;

# Exit psql
\q
```

**Note**: If you get "role postgres does not exist", create it first:
```bash
createuser -s postgres
```

#### Windows

**Option 1: Using pgAdmin (GUI)**
1. Open pgAdmin 4 (installed with PostgreSQL)
2. Connect to your PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name it `remeals` and click "Save"

**Option 2: Using Command Line (PowerShell)**
```powershell
# Navigate to PostgreSQL bin directory (adjust path as needed)
cd "C:\Program Files\PostgreSQL\16\bin"

# Login to PostgreSQL
.\psql.exe -U postgres

# Create database
CREATE DATABASE remeals;

# Create user (optional)
CREATE USER remealsuser WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE remeals TO remealsuser;

# Exit psql
\q
```

**Note**: If you get authentication errors, you may need to:
1. Edit `pg_hba.conf` to allow local connections
2. Or use the password you set during PostgreSQL installation

### Step 3: Backend Setup

#### 3.1 Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

#### 3.2 Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3.3 Configure Environment Variables

**Generate Django SECRET_KEY:**

**macOS/Linux:**
```bash
# After activating virtual environment
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Windows (PowerShell):**
```powershell
# After activating virtual environment
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Alternative method (if Django is not installed yet):**
```bash
# macOS/Linux
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Windows
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

Copy the generated key and use it in your `.env` file.

Create a `.env` file in the `backend/` directory:

```env
# Database
POSTGRES_DB=remeals
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Django
SECRET_KEY=your-generated-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

**Important**: Never share your SECRET_KEY or commit it to version control. Keep it secure!

#### 3.4 Run Migrations

```bash
python manage.py migrate
```

#### 3.5 Create Superuser

```bash
python manage.py createsuperuser
```

#### 3.6 Load Sample Data (Optional)

```bash
python manage.py loaddata fixtures/*.json
```

This will load test users, restaurants, warehouses, communities, donations, and other sample data.

#### 3.7 Start Development Server

```bash
python manage.py runserver
```

Backend will be available at http://localhost:8000

### Step 4: Frontend Setup

Open a new terminal window.

#### 4.1 Navigate to Frontend Directory

```bash
cd frontend
```

#### 4.2 Install Dependencies

```bash
npm install
```

#### 4.3 Configure Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

#### 4.4 Start Development Server

```bash
npm run dev
```

Frontend will be available at http://localhost:3000

---

## Test Users

After loading the sample data fixtures, the following test users will be available for testing different roles:

### Administrator
| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `password123` |
| **Email** | admin@remeals.com |
| **Role** | System Administrator |
| **Name** | System Administrator |

### Donors
| Username | Password | Email | Restaurant | Name |
|----------|----------|-------|------------|------|
| `donor1` | `password123` | findlay.kl@gmail.com | RES0000001 | Findlay Kline |
| `donor2` | `password123` | lili.byrd@gmail.com | RES0000003 | Lili Byrd |

### Delivery Staff
| Username | Password | Email | Assigned Area | Name |
|----------|----------|-------|---------------|------|
| `delivery1` | `password123` | cordelia.ly@gmail.com | Bangkok Central | Cordelia Lynn |
| `delivery2` | `password123` | gideon.cu@gmail.com | Samut Prakan | Gideon Curry |

### Recipients
| Username | Password | Email | Community | Name | Address |
|----------|----------|-------|-----------|------|---------|
| `recipient1` | `password123` | aston.me@gmail.com | COM0000001 | Aston Merritt | 123 Klong Toey, Bangkok 10110 |
| `recipient2` | `password123` | keeley.br@gmail.com | COM0000002 | Keeley Bradford | 456 Bang Khen, Bangkok 10220 |

### Using Test Users

1. **Login to Admin Panel**
   ```
   URL: http://localhost:8000/admin
   Username: admin
   Password: password123
   ```

2. **Test API Authentication**
   ```bash
   # Login via API
   curl -X POST http://localhost:8000/api/users/login/ \
     -H "Content-Type: application/json" \
     -d '{"username": "donor1", "password": "password123"}'
   ```

3. **Test Different User Roles**
   - Use donor accounts to test donation creation
   - Use delivery staff accounts to test delivery coordination
   - Use recipient accounts to test donation requests
   - Use admin account for full system access

### Password Information

All test users use the same password: `password123`

To generate a new password hash for fixtures, run:
```bash
cd backend/fixtures
python generate_password_hash.py
```

**Note**: These are test credentials for development only. Never use these in production!

---

## Verification

### Test Backend API

```bash
# Check API health
curl http://localhost:8000/api/

# Access Swagger documentation
open http://localhost:8000/swagger/
```

### Test Frontend

Open http://localhost:3000 in your browser

### Access Admin Panel

1. Navigate to http://localhost:8000/admin
2. Login with your superuser credentials
3. Explore the data models

---

## Common Issues and Troubleshooting

### Database Connection Issues

**Problem**: `psycopg2.OperationalError: could not connect to server`

**Solution (macOS/Linux):**
- Verify PostgreSQL is running: `pg_isready`
- Check database credentials in `.env`
- Ensure database exists: `psql -l`
- Start PostgreSQL service: `brew services start postgresql@16` (macOS) or `sudo systemctl start postgresql` (Linux)

**Solution (Windows):**
- Verify PostgreSQL is running: Check Services (services.msc) for "postgresql-x64-16"
- Start PostgreSQL service: `net start postgresql-x64-16` (run as Administrator)
- Check database credentials in `.env`
- Ensure database exists: Use pgAdmin or `psql -U postgres -l`

### Port Already in Use

**Problem**: `Error: Port 8000 is already in use`

**Solution (macOS/Linux):**
```bash
# Find process using port
lsof -ti:8000

# Kill process
kill -9 <PID>

# Or use a different port
python manage.py runserver 8001
```

**Solution (Windows):**
```powershell
# Find process using port
netstat -ano | findstr :8000

# Kill process (replace <PID> with the actual PID from above)
taskkill /PID <PID> /F

# Or use a different port
python manage.py runserver 8001
```

### Node Version Mismatch

**Problem**: `The engine "node" is incompatible with this module`

**Solution (macOS/Linux):**
```bash
# Use nvm to install correct version
nvm install 20
nvm use 20
```

**Solution (Windows):**
```powershell
# Use nvm-windows to install correct version
nvm install 20
nvm use 20

# If nvm-windows is not installed, download from:
# https://github.com/coreybutler/nvm-windows/releases
```

### Migration Issues

**Problem**: `django.db.migrations.exceptions.InconsistentMigrationHistory`

**Solution**:
```bash
# Reset migrations (WARNING: This will delete all data)
python manage.py migrate --fake <app_name> zero
python manage.py migrate
```

### Docker Issues

**Problem**: `docker-compose: command not found`

**Solution**:
```bash
# Use docker compose (newer syntax)
docker compose up -d
```

**Problem**: Container won't start

**Solution**:
```bash
# View logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild containers
docker-compose down
docker-compose up --build
```

---

## Development Tools

### Recommended VS Code Extensions

- Python
- Django
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Docker
- PostgreSQL

### Database Management Tools

- **pgAdmin**: http://localhost:5050 (if using Docker)
- **DBeaver**: Desktop application
- **TablePlus**: macOS application
- **psql**: Command-line interface

### API Testing Tools

- **Swagger UI**: http://localhost:8000/swagger/
- **Postman**: Desktop application
- **curl**: Command-line tool
- **HTTPie**: User-friendly command-line tool

---

## Next Steps

After successful setup:

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development guidelines
2. Explore [API.md](./API.md) for API documentation
3. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture
4. Review the database schema in [db-diagram.png](./db-diagram.png)

---

## Additional Commands

### Backend Commands

```bash
# Create new Django app
python manage.py startapp <app_name>

# Make migrations
python manage.py makemigrations

# Run specific migration
python manage.py migrate <app_name> <migration_number>

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Run tests
python manage.py test

# Shell
python manage.py shell
```

### Frontend Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build

# Execute command in container
docker-compose exec backend python manage.py migrate

# Access shell
docker-compose exec backend bash
```

---

## Getting Help

If you encounter issues:

1. Check this setup guide
2. Review the troubleshooting section above
3. Contact the project maintainers with:
   - Your operating system
   - Python and Node versions
   - Error messages
   - Steps to reproduce
