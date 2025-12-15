# ReMeals System Architecture

## Overview

ReMeals is a full-stack web application built with a Django REST API backend and a Next.js frontend. The system connects food donors with communities to reduce food waste and improve food security.

## Technology Stack

### Backend
- **Framework**: Django 5.2.8
- **API**: Django REST Framework
- **Database**: PostgreSQL 16
- **Authentication**: Token-based authentication
- **API Documentation**: drf-yasg (Swagger/OpenAPI)
- **CORS**: django-cors-headers
- **Environment**: python-dotenv
- **Password Hashing**: bcrypt

### Frontend
- **Framework**: Next.js 16.0.3 (App Router)
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.1.17
- **Node Version**: >= 20.9

### DevOps
- **Containerization**: Docker & Docker Compose
- **Database Admin**: pgAdmin 8.11
- **CI/CD**: GitHub Actions

## System Components

### 1. Backend Architecture

The Django backend follows a modular app-based architecture:

```
backend/
├── re_meals_api/           # Main Django project settings
├── users/                  # User authentication and management
├── donation/               # Donation management
├── fooditem/              # Food item tracking
├── delivery/              # Delivery coordination
├── restaurants/           # Restaurant management
├── restaurant_chain/      # Restaurant chain management
├── community/             # Community management
├── warehouse/             # Warehouse and inventory
├── donation_request/      # Donation request handling
├── impactrecord/         # Impact metrics tracking
└── fixtures/             # Sample data for development
```

#### Core Models

**User System**
- Base User model with authentication
- Extended profiles: Donor, Recipient, DeliveryStaff
- Role-based access control

**Donation Flow**
```
Restaurant → Donation → FoodItems → Delivery → Recipient
                ↓
            Warehouse → Community
```

**Impact Tracking**
- Metrics: Meals saved, CO₂ emissions reduced
- Linked to distributed food items
- Aggregated reporting

### 2. Frontend Architecture

Next.js application using the App Router pattern:

```
frontend/
├── app/
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/           # Reusable UI components
└── public/              # Static assets
```

### 3. Database Schema

The database uses PostgreSQL with the following entity relationships:

**Core Entities:**
- Users (authentication and base profiles)
- Donors (linked to restaurants)
- Restaurants (linked to chains)
- Donations (contains food items)
- FoodItems (tracked inventory)
- Deliveries (coordination records)
- DeliveryStaff (available volunteers)
- Recipients (linked to communities)
- Communities (linked to warehouses)
- Warehouses (storage facilities)
- ImpactRecords (metrics tracking)

See [db-diagram.png](./db-diagram.png) for the complete ER diagram.

## Data Flow

### Donation Workflow

1. **Donation Creation**
   - Donor logs surplus food from a restaurant
   - Creates donation record with pickup time
   - Adds food items with quantities and expiry dates

2. **Warehouse Assignment**
   - Food items assigned to warehouse based on capacity
   - Inventory updated in real-time
   - Expiry tracking initiated

3. **Delivery Coordination**
   - Delivery staff assigned to pickup
   - Recipient selected from community
   - Pickup and dropoff times scheduled

4. **Distribution**
   - Food items marked as distributed
   - Recipient receives notification
   - Impact metrics calculated

5. **Impact Tracking**
   - Meals saved calculated based on quantity
   - CO₂ emissions reduction estimated
   - Aggregated metrics updated

## API Architecture

### RESTful Design

The API follows REST principles:
- Resource-based URLs
- HTTP methods for CRUD operations
- JSON request/response format
- Stateless authentication

### Endpoint Structure

```
/api/users/              # User management
/api/donations/          # Donation CRUD
/api/fooditems/         # Food item tracking
/api/deliveries/        # Delivery coordination
/api/warehouses/        # Warehouse management
/api/restaurants/       # Restaurant management
/api/communities/       # Community management
/api/impact-records/    # Impact metrics
```

### Authentication Flow

```
1. User Registration → POST /api/users/register/
2. User Login → POST /api/users/login/ → Token
3. Authenticated Request → Header: Authorization: Token {token}
```

## Security

### Backend Security
- Token-based authentication
- Password hashing with bcrypt
- CORS configuration for frontend access
- Input validation and sanitization
- SQL injection protection via ORM
- CSRF protection (Django default)

### Frontend Security
- Environment variables for sensitive data
- Secure token storage
- XSS protection via React
- Input sanitization

## Deployment Architecture

### Development Environment

```
┌─────────────────┐
│   Frontend      │
│  (localhost:3000)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│  (localhost:8000)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │
│  (localhost:5432)│
└─────────────────┘
```

### Docker Deployment

```
docker-compose.yml
├── frontend (Next.js)
├── backend (Django)
├── db (PostgreSQL)
└── pgadmin (Database Admin)
```

## Scalability Considerations

### Current Architecture
- Monolithic backend (single Django application)
- Single database instance
- Stateless API for horizontal scaling

### Future Enhancements
- **Caching**: Redis for session and query caching
- **Message Queue**: Celery for async tasks (email, reports)
- **CDN**: Static asset delivery
- **Load Balancing**: Nginx for multiple backend instances
- **Database**: Read replicas for query scaling
- **Microservices**: Separate services for impact tracking, notifications

## Monitoring and Logging

### Logging Strategy
- Application logs (Django logging)
- Error tracking (to be implemented)
- Access logs (nginx/server level)

### Monitoring Metrics
- API response times
- Database query performance
- Error rates
- User activity metrics
- Impact metrics

## Performance Optimization

### Backend
- Database indexing on frequently queried fields
- Query optimization with select_related/prefetch_related
- Pagination for large datasets
- Caching for static/computed data

### Frontend
- Next.js built-in optimizations
- Image optimization
- Code splitting
- Server-side rendering where beneficial
- Static generation for public pages

## Development Workflow

1. Local development with hot reload
2. Feature branches for new development
3. Pull requests with code review
4. CI/CD pipeline (GitHub Actions)
5. Testing before merge
6. Deployment to staging
7. Production deployment

## Testing Strategy

### Backend Testing
- Unit tests for models
- API endpoint tests
- Integration tests for workflows
- Test fixtures for consistent data

### Frontend Testing
- Component tests
- Integration tests
- E2E tests for critical flows

## Data Management

### Backup Strategy
- Regular database backups
- Point-in-time recovery capability
- Backup retention policy

### Data Lifecycle
- Food item expiry tracking
- Automated cleanup of expired records
- Impact data aggregation and archival
