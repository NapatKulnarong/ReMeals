# ReMeals Testing Guide

Comprehensive guide for testing the ReMeals application, including backend, frontend, and integration tests.

## Table of Contents

- [Overview](#overview)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [API Testing](#api-testing)
- [Integration Testing](#integration-testing)
- [Test Data and Fixtures](#test-data-and-fixtures)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Testing](#cicd-testing)
- [Best Practices](#best-practices)

---

## Overview

ReMeals uses a comprehensive testing strategy:

- **Backend**: Django TestCase and DRF APITestCase (Django 5.2.8)
- **Frontend**: Jest and React Testing Library (to be implemented)
- **API**: Integration tests using APIClient
- **CI/CD**: Automated testing via GitHub Actions with PostgreSQL 16

### Test Coverage Status

Current test coverage includes:
- ✅ Donation API tests (39+ test cases)
- ✅ Warehouse inventory tests
- ✅ User authentication tests
- ✅ Delivery tests
- ✅ Restaurant and chain tests
- ✅ Food item tests
- ✅ Donation request tests
- ✅ Community tests
- ✅ Impact record tests

---

## Backend Testing

### Test Structure

Backend tests are located in each app's `tests.py` file:

```
backend/
├── donation/
│   └── tests.py
├── users/
│   └── tests.py
├── warehouse/
│   └── tests.py
└── ...
```

### Test Types

#### 1. Model Tests (TestCase)

Test database models and business logic:

```python
from django.test import TestCase
from .models import Donation

class DonationModelTest(TestCase):
    def setUp(self):
        self.donation = Donation.objects.create(
            donation_id="DON001",
            restaurant=self.restaurant,
            status="pending"
        )

    def test_donation_creation(self):
        self.assertEqual(self.donation.status, "pending")
        self.assertIsNotNone(self.donation.donated_at)
```

#### 2. API Tests (APITestCase)

Test API endpoints and serializers:

```python
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

class DonationAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        # Set authentication headers
        self.client.defaults.update({
            "HTTP_X_USER_ID": "USER001",
            "HTTP_X_USER_IS_ADMIN": "true",
        })

    def test_create_donation(self):
        data = {
            "restaurant": "RES001",
            "status": "pending"
        }
        response = self.client.post("/api/donations/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

### Authentication in Tests

The API uses header-based authentication. Set headers in your tests:

```python
# For authenticated requests
headers = {
    "HTTP_X_USER_ID": "USER001",
    "HTTP_X_USER_IS_ADMIN": "true",
    "HTTP_X_USER_IS_DELIVERY": "false",
}

response = self.client.get("/api/donations/", **headers)

# Or set defaults for all requests
self.client.defaults.update(headers)
```

### Common Test Patterns

#### Testing CRUD Operations

```python
def test_create_resource(self):
    data = {"name": "Test Resource"}
    response = self.client.post("/api/resources/", data, format="json")
    self.assertEqual(response.status_code, 201)
    self.assertTrue(Resource.objects.filter(name="Test Resource").exists())

def test_list_resources(self):
    Resource.objects.create(name="Resource 1")
    Resource.objects.create(name="Resource 2")
    response = self.client.get("/api/resources/")
    self.assertEqual(response.status_code, 200)
    self.assertEqual(len(response.data), 2)

def test_get_resource(self):
    resource = Resource.objects.create(name="Test")
    response = self.client.get(f"/api/resources/{resource.id}/")
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.data["name"], "Test")

def test_update_resource(self):
    resource = Resource.objects.create(name="Old Name")
    response = self.client.patch(
        f"/api/resources/{resource.id}/",
        {"name": "New Name"},
        format="json"
    )
    self.assertEqual(response.status_code, 200)
    resource.refresh_from_db()
    self.assertEqual(resource.name, "New Name")

def test_delete_resource(self):
    resource = Resource.objects.create(name="Test")
    response = self.client.delete(f"/api/resources/{resource.id}/")
    self.assertEqual(response.status_code, 204)
    self.assertFalse(Resource.objects.filter(id=resource.id).exists())
```

#### Testing Filters and Query Parameters

```python
def test_filter_by_status(self):
    Donation.objects.create(status="pending")
    Donation.objects.create(status="accepted")
    
    response = self.client.get("/api/donations/?status=accepted")
    self.assertEqual(len(response.data), 1)
    self.assertEqual(response.data[0]["status"], "accepted")

def test_filter_by_date_range(self):
    # Create donations with different dates
    response = self.client.get(
        "/api/donations/?date_from=2023-01-01&date_to=2023-12-31"
    )
    # Assert filtered results
```

#### Testing Permissions

```python
def test_admin_can_delete(self):
    donation = Donation.objects.create(status="pending")
    admin_headers = {
        "HTTP_X_USER_ID": "ADMIN001",
        "HTTP_X_USER_IS_ADMIN": "true",
    }
    response = self.client.delete(
        f"/api/donations/{donation.donation_id}/",
        **admin_headers
    )
    self.assertEqual(response.status_code, 204)

def test_non_admin_cannot_delete(self):
    donation = Donation.objects.create(status="pending")
    user_headers = {
        "HTTP_X_USER_ID": "USER001",
        "HTTP_X_USER_IS_ADMIN": "false",
    }
    response = self.client.delete(
        f"/api/donations/{donation.donation_id}/",
        **user_headers
    )
    self.assertEqual(response.status_code, 403)
```

#### Testing Validation

```python
def test_required_fields(self):
    response = self.client.post("/api/donations/", {}, format="json")
    self.assertEqual(response.status_code, 400)
    self.assertIn("restaurant", response.data)

def test_invalid_data(self):
    data = {"restaurant": "INVALID_ID"}
    response = self.client.post("/api/donations/", data, format="json")
    self.assertEqual(response.status_code, 400)
```

---

## Frontend Testing

### Setup (To Be Implemented)

Frontend testing will use Jest and React Testing Library:

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Test Structure

```
frontend/
├── components/
│   ├── DonationCard.tsx
│   └── __tests__/
│       └── DonationCard.test.tsx
└── app/
    └── __tests__/
        └── page.test.tsx
```

### Example Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DonationCard } from '../DonationCard';

describe('DonationCard', () => {
  const mockDonation = {
    donation_id: 'DON001',
    status: 'pending',
    restaurant_name: 'Test Restaurant',
  };

  it('renders donation information', () => {
    render(<DonationCard donation={mockDonation} />);
    expect(screen.getByText(/DON001/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Restaurant/i)).toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked', () => {
    const onApprove = jest.fn();
    render(<DonationCard donation={mockDonation} onApprove={onApprove} />);
    
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    expect(onApprove).toHaveBeenCalledWith('DON001');
  });
});
```

### Testing API Integration

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { DonationList } from '../DonationList';

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([
      { donation_id: 'DON001', status: 'pending' },
    ]),
  })
) as jest.Mock;

describe('DonationList', () => {
  it('fetches and displays donations', async () => {
    render(<DonationList />);
    
    await waitFor(() => {
      expect(screen.getByText(/DON001/i)).toBeInTheDocument();
    });
    
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/donations/');
  });
});
```

---

## API Testing

### Manual API Testing

#### Using curl

```bash
# Login
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"identifier": "donor1", "password": "password123"}'

# Create donation (with user ID from login)
curl -X POST http://localhost:8000/api/donations/ \
  -H "Content-Type: application/json" \
  -H "X-USER-ID: USER001" \
  -H "X-USER-IS-ADMIN: false" \
  -d '{"restaurant": "RES0000001", "status": "pending"}'

# List donations
curl http://localhost:8000/api/donations/ \
  -H "X-USER-ID: USER001"
```

#### Using HTTPie

```bash
# Install HTTPie
pip install httpie

# Login
http POST http://localhost:8000/api/users/login/ \
  identifier=donor1 password=password123

# Create donation
http POST http://localhost:8000/api/donations/ \
  X-USER-ID:USER001 \
  X-USER-IS-ADMIN:false \
  restaurant=RES0000001 status=pending
```

#### Using Postman

1. Import the API collection (if available)
2. Set environment variables:
   - `base_url`: `http://localhost:8000/api`
   - `user_id`: Your user ID from login
3. Use the pre-request script to set headers automatically

### Automated API Testing

Use Django's APIClient for automated API tests:

```python
from rest_framework.test import APIClient

client = APIClient()
client.credentials(HTTP_X_USER_ID='USER001', HTTP_X_USER_IS_ADMIN='true')
response = client.get('/api/donations/')
```

---

## Integration Testing

### End-to-End Workflow Tests

Test complete workflows:

```python
class DonationWorkflowTest(APITestCase):
    def setUp(self):
        # Create all necessary objects
        self.user = User.objects.create(...)
        self.restaurant = Restaurant.objects.create(...)
        self.warehouse = Warehouse.objects.create(...)
        
    def test_complete_donation_workflow(self):
        # 1. Create donation
        donation_response = self.client.post("/api/donations/", {
            "restaurant": self.restaurant.restaurant_id
        })
        donation_id = donation_response.data["donation_id"]
        
        # 2. Add food items
        food_response = self.client.post("/api/fooditems/", {
            "donation": donation_id,
            "name": "Bread",
            "quantity": 10,
            "unit": "pieces"
        })
        
        # 3. Create delivery
        delivery_response = self.client.post("/api/delivery/deliveries/", {
            "donation": donation_id,
            # ... other fields
        })
        
        # 4. Verify final state
        self.assertEqual(donation_response.status_code, 201)
        self.assertEqual(food_response.status_code, 201)
        self.assertEqual(delivery_response.status_code, 201)
```

---

## Test Data and Fixtures

### Using Fixtures

Load test data from fixtures:

```bash
# Load all fixtures
python manage.py loaddata fixtures/*.json

# Load specific fixture
python manage.py loaddata fixtures/005_users.json
```

### Creating Test Data in Tests

```python
def setUp(self):
    # Create test objects
    self.chain = RestaurantChain.objects.create(
        chain_id="CHA01",
        chain_name="Test Chain"
    )
    self.restaurant = Restaurant.objects.create(
        restaurant_id="RES001",
        name="Test Restaurant",
        chain=self.chain
    )
    self.user = User.objects.create(
        user_id="USER001",
        username="testuser",
        email="test@example.com",
        password=make_password("password")
    )
```

### Test Users

After loading fixtures, use these test users:

- **Admin**: `admin` / `password123`
- **Donors**: `donor1`, `donor2` / `password123`
- **Delivery Staff**: `delivery1`, `delivery2` / `password123`
- **Recipients**: `recipient1`, `recipient2` / `password123`

---

## Running Tests

### Backend Tests

#### Run All Tests

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

#### Run Specific Test Suites

```bash
# Test specific app
python manage.py test donation

# Test specific test class
python manage.py test donation.tests.DonationTests

# Test specific test method
python manage.py test donation.tests.DonationTests.test_create_donation

# Run with verbose output
python manage.py test --verbosity=2

# Keep test database (faster for repeated runs)
python manage.py test --keepdb
```

#### Run Tests in Parallel

```bash
# Run tests in parallel (faster)
python manage.py test --parallel
```

### Frontend Tests

```bash
cd frontend
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Using Docker

```bash
# Run backend tests in Docker
docker-compose exec backend python manage.py test

# Run specific test
docker-compose exec backend python manage.py test donation.tests.DonationTests
```

---

## Test Coverage

### Install Coverage Tools

```bash
pip install coverage
```

### Generate Coverage Report

```bash
# Run tests with coverage
coverage run --source='.' manage.py test

# Generate report
coverage report

# Generate HTML report
coverage html

# Open HTML report
open htmlcov/index.html  # macOS
start htmlcov/index.html  # Windows
```

### Coverage Configuration

Create `.coveragerc`:

```ini
[run]
source = .
omit =
    */migrations/*
    */venv/*
    */tests/*
    manage.py
    */settings.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
```

### Coverage Goals

- **Minimum**: 70% overall coverage
- **Target**: 80%+ overall coverage
- **Critical paths**: 90%+ coverage (authentication, payments, etc.)

---

## CI/CD Testing

### GitHub Actions

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch

See `.github/workflows/django-tests.yml` for configuration.

### CI Test Jobs

1. **Backend Tests**: Runs all Django tests with PostgreSQL 16
2. **Frontend Build**: Verifies Next.js build succeeds
3. **Docker Build Test**: Tests Docker container builds and runs

### Local CI Simulation

```bash
# Simulate CI environment
export POSTGRES_USER=testuser
export POSTGRES_PASSWORD=testpass
export POSTGRES_DB=testdb
export POSTGRES_HOST=127.0.0.1
export POSTGRES_PORT=5432

python manage.py test
```

---

## Best Practices

### Test Organization

1. **One test class per model/view**
2. **Descriptive test names**: `test_<action>_<condition>_<expected_result>`
3. **Group related tests** in the same class
4. **Use setUp()** for common test data

### Test Naming

```python
# Good
def test_create_donation_with_valid_restaurant_returns_201(self):
    pass

def test_create_donation_with_invalid_restaurant_returns_400(self):
    pass

# Bad
def test1(self):
    pass

def test_donation(self):
    pass
```

### Test Independence

- Each test should be independent
- Don't rely on test execution order
- Clean up test data in `tearDown()` if needed

### Test Data

- Use factories or fixtures for complex data
- Create minimal test data needed
- Use descriptive variable names

### Assertions

- Use specific assertions: `assertEqual()`, `assertTrue()`, `assertIn()`
- Include meaningful error messages
- Test both success and failure cases

### Performance

- Keep tests fast (< 1 second per test)
- Use `--keepdb` for faster repeated runs
- Use `select_related()` and `prefetch_related()` in tests

### Example: Well-Structured Test

```python
class DonationAPITests(APITestCase):
    def setUp(self):
        """Set up test data for all tests."""
        self.client = APIClient()
        
        # Create test objects
        self.chain = RestaurantChain.objects.create(
            chain_id="CHA01",
            chain_name="Test Chain"
        )
        self.restaurant = Restaurant.objects.create(
            restaurant_id="RES001",
            name="Test Restaurant",
            chain=self.chain
        )
        
        # Set default headers
        self.client.defaults.update({
            "HTTP_X_USER_ID": "USER001",
            "HTTP_X_USER_IS_ADMIN": "true",
        })

    def test_create_donation_with_valid_restaurant_returns_201(self):
        """Test that creating a donation with valid restaurant succeeds."""
        data = {"restaurant": "RES001", "status": "pending"}
        response = self.client.post("/api/donations/", data, format="json")
        
        self.assertEqual(response.status_code, 201)
        self.assertIn("donation_id", response.data)
        self.assertTrue(
            Donation.objects.filter(
                donation_id=response.data["donation_id"]
            ).exists()
        )

    def test_create_donation_with_invalid_restaurant_returns_400(self):
        """Test that creating a donation with invalid restaurant fails."""
        data = {"restaurant": "INVALID", "status": "pending"}
        response = self.client.post("/api/donations/", data, format="json")
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Donation.objects.exists())
```

---

## Debugging Tests

### Verbose Output

```bash
python manage.py test --verbosity=2
```

### Debug Failed Tests

```python
# Add print statements
print(response.data)
print(response.status_code)

# Use pdb debugger
import pdb; pdb.set_trace()

# Check database state
print(Donation.objects.all())
```

### Test Database Inspection

```bash
# Access test database
python manage.py shell
# In shell:
from donation.models import Donation
Donation.objects.all()
```

---

## Common Issues and Solutions

### Issue: Tests Failing Due to Missing Data

**Solution**: Ensure `setUp()` creates all required test data.

### Issue: Tests Interfering with Each Other

**Solution**: Use `setUp()` and `tearDown()` to isolate test data.

### Issue: Slow Tests

**Solution**: 
- Use `--keepdb` flag
- Optimize database queries
- Use `select_related()` and `prefetch_related()`

### Issue: Authentication Headers Not Working

**Solution**: Use `HTTP_` prefix for headers in tests:
```python
headers = {"HTTP_X_USER_ID": "USER001"}  # Correct
headers = {"X-USER-ID": "USER001"}       # Wrong
```

---

## Resources

- [Django Testing Documentation](https://docs.djangoproject.com/en/5.2/topics/testing/)
- [Django REST Framework Testing](https://www.django-rest-framework.org/api-guide/testing/)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

## Getting Help

If you encounter testing issues:

1. Check test output with `--verbosity=2`
2. Review existing tests for examples
3. Review the troubleshooting sections in this guide
4. Ask in team discussions
5. Contact the project maintainers

---

**Remember**: Good tests are an investment in code quality and maintainability. Write tests that are clear, maintainable, and provide confidence in your code! 🧪✅

