# ReMeals Development Guide

Guidelines and best practices for contributing to the ReMeals project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Common Tasks](#common-tasks)

---

## Getting Started

Before you begin development, ensure you have completed the setup process described in [SETUP.md](./SETUP.md).

### Test Users

For testing purposes, load the sample data fixtures which include test users for all roles:

```bash
# From backend directory
python manage.py loaddata fixtures/*.json
```

All test users use the password: `password123`

Available test accounts:
- **Admin**: `admin` / `password123`
- **Donors**: `donor1`, `donor2` / `password123`
- **Delivery Staff**: `delivery1`, `delivery2` / `password123`
- **Recipients**: `recipient1`, `recipient2` / `password123`

For complete details, see the [Test Users section in SETUP.md](./SETUP.md#test-users).

### Development Environment

#### Backend Setup

**macOS/Linux:**
```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python3.12 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start development server
python manage.py runserver
```

**Windows (PowerShell):**
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt

# Start development server
python manage.py runserver
```

#### Frontend Setup

**macOS/Linux/Windows:**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:3000 and will automatically reload on file changes.

#### Running Both Services

You'll need two terminal windows/tabs:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# OR
.\venv\Scripts\Activate.ps1  # Windows PowerShell

python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### Using Docker for Development

Alternatively, you can use Docker for a consistent development environment:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec backend python manage.py migrate

# Access backend shell
docker-compose exec backend bash
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

### 2. Make Your Changes

Follow the code style guidelines and best practices outlined below.

### 3. Test Your Changes

**Backend Tests:**

**macOS/Linux:**
```bash
cd backend
source venv/bin/activate
python manage.py test
```

**Windows:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python manage.py test
```

**Run specific test suites:**
```bash
# Test specific app
python manage.py test donation

# Test specific test class
python manage.py test donation.tests.DonationModelTest

# Run with verbose output
python manage.py test --verbosity=2

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
```

**Frontend Tests:**
```bash
cd frontend
npm test
```

**Linting:**

**Backend (Python):**
```bash
# Install flake8 or black (if not already installed)
pip install flake8 black

# Check code style
flake8 .

# Auto-format code
black .
```

**Frontend (TypeScript/React):**
```bash
cd frontend
npm run lint
```

### 4. Commit Your Changes

Follow the commit convention:

```bash
git add .
git commit -m "feat: add user authentication"
```

### 5. Push and Create Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a pull request on GitHub.

---

## Code Style

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `style:` - Code style changes (formatting)
- `perf:` - Performance improvements

**Examples:**
```
feat: add donation approval workflow
fix: resolve food item expiry calculation bug
docs: update API documentation
refactor: optimize warehouse inventory queries
test: add delivery staff assignment tests
chore: update dependencies
```

### Python Code Style

We follow [PEP 8](https://pep8.org/) with some modifications:

- **Line length**: 100 characters
- **Indentation**: 4 spaces
- **Imports**: Organized (standard library, third-party, local)
- **Naming**:
  - Classes: `PascalCase`
  - Functions/Variables: `snake_case`
  - Constants: `UPPER_SNAKE_CASE`
- **Type hints**: Use type hints for function parameters and return types (Python 3.12+)
- **Docstrings**: Use Google-style docstrings for classes and functions

**Example:**
```python
from django.db import models
from users.models import User

class Donation(models.Model):
    """Model representing a food donation."""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
    ]

    donor = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def approve(self):
        """Approve the donation."""
        self.status = 'approved'
        self.save()
```

### TypeScript/React Code Style

- **Indentation**: 2 spaces
- **Naming**:
  - Components: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Types/Interfaces: `PascalCase`
- **File naming**: `kebab-case.tsx` for components
- **TypeScript**: Always use explicit types, avoid `any`
- **React**: Use functional components with hooks
- **Next.js**: Use App Router conventions (Next.js 16.0.3)
- **Tailwind CSS**: Use utility classes (Tailwind CSS 4.1.17)

**Example:**
```typescript
interface DonationProps {
  id: number;
  status: string;
  onApprove: () => void;
}

export function DonationCard({ id, status, onApprove }: DonationProps) {
  const handleApprove = () => {
    onApprove();
  };

  return (
    <div className="donation-card">
      <h3>Donation #{id}</h3>
      <p>Status: {status}</p>
      <button onClick={handleApprove}>Approve</button>
    </div>
  );
}
```

---

## Backend Development

### Project Structure

```
backend/
├── re_meals_api/          # Main project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── <app_name>/           # Django apps
│   ├── models.py         # Database models
│   ├── views.py          # API views
│   ├── serializers.py    # DRF serializers
│   ├── urls.py           # App URLs
│   ├── admin.py          # Admin configuration
│   ├── tests.py          # Unit tests
│   └── migrations/       # Database migrations
└── manage.py
```

### Creating a New Django App

```bash
python manage.py startapp new_app

# Add to INSTALLED_APPS in settings.py
```

### Models

Define database models in `models.py`:

```python
from django.db import models

class Restaurant(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
```

### Serializers

Create serializers in `serializers.py`:

```python
from rest_framework import serializers
from .models import Restaurant

class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = ['id', 'name', 'address', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
```

### Views

Create API views in `views.py`:

```python
from rest_framework import viewsets
from .models import Restaurant
from .serializers import RestaurantSerializer

class RestaurantViewSet(viewsets.ModelViewSet):
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
```

### URLs

Configure URLs in `urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RestaurantViewSet

router = DefaultRouter()
router.register(r'restaurants', RestaurantViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```

### Migrations

**Creating Migrations:**
```bash
# Create migrations for all apps
python manage.py makemigrations

# Create migrations for specific app
python manage.py makemigrations donation

# Create empty migration (for data migrations)
python manage.py makemigrations --empty donation
```

**Applying Migrations:**
```bash
# Apply all pending migrations
python manage.py migrate

# Apply migrations for specific app
python manage.py migrate donation

# Show migration status
python manage.py showmigrations
```

**Migration Utilities:**
```bash
# Show migration SQL (without applying)
python manage.py sqlmigrate donation 0001

# Check for migration issues
python manage.py check

# Rollback migration (WARNING: Use with caution)
python manage.py migrate donation 0001  # Rollback to migration 0001
```

**Best Practices:**
- Always review migration files before committing
- Test migrations on a copy of production data
- Never edit existing migrations that have been applied
- Create new migrations for any changes to applied migrations

---

## Frontend Development

### Project Structure

```
frontend/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/          # Reusable components
├── lib/                # Utilities and helpers
├── types/              # TypeScript types
└── public/             # Static assets
```

### Creating Components

```typescript
// components/donation-list.tsx
'use client';

import { useState, useEffect } from 'react';

interface Donation {
  id: number;
  donor: string;
  status: string;
  created_at: string;
}

export function DonationList() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/donations/')
      .then(res => res.json())
      .then(data => {
        setDonations(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {donations.map(donation => (
        <div key={donation.id} className="border p-4 rounded">
          <h3>Donation #{donation.id}</h3>
          <p>Status: {donation.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### API Integration

Create API utilities in `lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function fetchDonations() {
  const response = await fetch(`${API_URL}/donations/`);
  if (!response.ok) {
    throw new Error('Failed to fetch donations');
  }
  return response.json();
}

export async function createDonation(data: any) {
  const response = await fetch(`${API_URL}/donations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create donation');
  }
  return response.json();
}
```

### Styling with Tailwind

```typescript
export function Button({ children, onClick }: { children: React.ReactNode, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      {children}
    </button>
  );
}
```

---

## Testing

### Backend Testing

Create tests in `tests.py`:

```python
from django.test import TestCase
from .models import Restaurant

class RestaurantModelTest(TestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            address="123 Test St"
        )

    def test_restaurant_creation(self):
        self.assertEqual(self.restaurant.name, "Test Restaurant")
        self.assertIsNotNone(self.restaurant.created_at)

    def test_string_representation(self):
        self.assertEqual(str(self.restaurant), "Test Restaurant")
```

Run tests:

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test donation

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

### Frontend Testing

**Setup (when implemented):**

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Example Test:**
```typescript
// components/__tests__/DonationCard.test.tsx
import { render, screen } from '@testing-library/react';
import { DonationCard } from '../DonationCard';

describe('DonationCard', () => {
  it('renders donation information', () => {
    render(<DonationCard id={1} status="pending" />);
    expect(screen.getByText(/Donation #1/i)).toBeInTheDocument();
  });
});
```

**Run Tests:**
```bash
npm test
npm test -- --watch  # Watch mode
npm test -- --coverage  # With coverage
```

**Type Checking:**
```bash
# TypeScript type checking
npx tsc --noEmit

# Or add to package.json:
# "type-check": "tsc --noEmit"
npm run type-check
```

---

## Git Workflow

### Branch Naming

- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation
- `refactor/refactor-name` - Code refactoring

### Pull Request Process

1. Create a descriptive PR title following commit convention
2. Fill out the PR template with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)
3. Request review from team members
4. Address review comments
5. Merge after approval

---

## Common Tasks

### Adding a New API Endpoint

1. Create model in `models.py`
2. Create serializer in `serializers.py`
3. Create viewset in `views.py`
4. Register route in `urls.py`
5. Run migrations
6. Add tests
7. Update API documentation

### Adding a New Frontend Page

1. Create page in `app/page-name/page.tsx`
2. Create components in `components/`
3. Add types in `types/`
4. Implement API integration
5. Style with Tailwind CSS
6. Test functionality

### Database Schema Changes

1. Modify model in `models.py`
2. Create migration: `python manage.py makemigrations`
3. Review migration file
4. Apply migration: `python manage.py migrate`
5. Update serializers if needed
6. Update tests
7. Document changes

### Environment Variables

**Adding New Environment Variables:**

1. **Backend (.env in backend/ directory):**
   ```env
   # Add to .env.example first
   NEW_VAR=example_value
   
   # Then add to your local .env
   NEW_VAR=actual_value
   ```

   Access in Django:
   ```python
   import os
   from django.conf import settings
   
   # Using python-dotenv (recommended)
   from dotenv import load_dotenv
   load_dotenv()
   
   value = os.environ.get('NEW_VAR')
   ```

2. **Frontend (.env.local in frontend/ directory):**
   ```env
   # Public variables (exposed to browser) must start with NEXT_PUBLIC_
   NEXT_PUBLIC_NEW_VAR=value
   
   # Private variables (server-side only)
   PRIVATE_VAR=value
   ```

   Access in Next.js:
   ```typescript
   // Public variable (available in browser)
   const publicVar = process.env.NEXT_PUBLIC_NEW_VAR;
   
   // Private variable (server-side only)
   const privateVar = process.env.PRIVATE_VAR; // Only in API routes/server components
   ```

**Important Notes:**
- Never commit `.env` or `.env.local` files
- Always update `.env.example` with new variables
- Frontend variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Restart development servers after adding new environment variables

---

## Code Review Checklist

Before submitting a PR, ensure:

**Code Quality:**
- [ ] Code follows style guidelines (PEP 8 for Python, ESLint for TypeScript)
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Functions are small and focused
- [ ] Meaningful variable and function names
- [ ] Comments explain "why", not "what"

**Testing:**
- [ ] Tests are written and passing
- [ ] Test coverage is adequate
- [ ] Edge cases are handled
- [ ] No console.log or debug prints left in code

**Security:**
- [ ] No sensitive data committed (passwords, API keys, etc.)
- [ ] Environment variables properly configured
- [ ] Input validation implemented
- [ ] SQL injection protection (using ORM, not raw SQL)

**Documentation:**
- [ ] Code is self-documenting
- [ ] Complex logic has comments
- [ ] API documentation updated (if applicable)
- [ ] README or relevant docs updated

**Database:**
- [ ] Migrations created and tested
- [ ] Migration files reviewed
- [ ] No data loss in migrations
- [ ] Database indexes added where needed

**Git:**
- [ ] Commit messages follow convention
- [ ] Related commits are squashed
- [ ] Branch is up to date with main
- [ ] No merge conflicts

**Error Handling:**
- [ ] Error handling implemented
- [ ] User-friendly error messages
- [ ] Proper HTTP status codes
- [ ] Logging for debugging

**Performance:**
- [ ] Database queries optimized (avoid N+1 queries)
- [ ] Unnecessary API calls avoided
- [ ] Images/assets optimized
- [ ] Code splitting implemented where appropriate

---

## Development Tools

### Recommended IDE Setup

**VS Code Extensions:**
- Python (Microsoft)
- Django (Baptiste Darthenay)
- ESLint (Microsoft)
- Prettier (Prettier)
- Tailwind CSS IntelliSense (Tailwind Labs)
- Docker (Microsoft)
- PostgreSQL (Chris Kolkman)
- GitLens (GitKraken)

**VS Code Settings (`.vscode/settings.json`):**
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/venv/bin/python",
  "python.formatting.provider": "black",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Database Tools

- **pgAdmin 8.11**: http://localhost:5050 (if using Docker)
- **DBeaver**: Cross-platform database tool
- **TablePlus**: macOS/Windows database client
- **psql**: Command-line PostgreSQL client

### API Testing Tools

- **Swagger UI**: http://localhost:8000/swagger/ (Interactive API docs)
- **ReDoc**: http://localhost:8000/redoc/ (Alternative API docs)
- **Postman**: Desktop API testing application
- **curl**: Command-line HTTP client
- **HTTPie**: User-friendly command-line HTTP client

### Debugging

**Backend (Django):**
```bash
# Use Django debug toolbar (if installed)
# Add breakpoints in code
import pdb; pdb.set_trace()

# Or use Python debugger
python -m pdb manage.py runserver
```

**Frontend (Next.js/React):**
- Use React DevTools browser extension
- Use Next.js DevTools
- Browser console for debugging
- Network tab for API debugging

## Resources

### Django & DRF
- [Django 5.2 Documentation](https://docs.djangoproject.com/en/5.2/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Django Best Practices](https://django-best-practices.readthedocs.io/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)

### Next.js & React
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs)

### Tools
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Docker Documentation](https://docs.docker.com/)
- [Git Documentation](https://git-scm.com/doc)

---

## Getting Help

- Review existing documentation
- Check the troubleshooting sections in relevant guides
- Ask in team discussions
- Read the source code for examples
- Contact the project maintainers
