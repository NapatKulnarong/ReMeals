# ReMeals Documentation Index

Welcome to the ReMeals documentation! This index provides an overview of all available documentation resources.

## 📚 Documentation Files

### [Setup Guide](./SETUP.md)
**Complete installation and setup instructions**

- Prerequisites installation (Node.js, Python, PostgreSQL, Docker)
- Platform-specific instructions for macOS and Windows
- Docker setup (recommended for quick start)
- Local development setup
- Environment variable configuration
- Database setup and migrations
- Loading sample data
- Test user credentials
- Troubleshooting common issues

**Start here if:** You're setting up ReMeals for the first time.

---

### [API Reference](./API.md)
**Complete REST API documentation**

- Base URL and authentication
- All API endpoints with request/response formats
- Query parameters and filtering options
- Error responses and status codes
- Request/response examples
- Header-based authentication (`X-USER-ID`, `X-USER-IS-ADMIN`, etc.)

**Start here if:** You're integrating with the ReMeals API or building a frontend.

**Key Endpoints:**
- Users: Signup, Login, Profile Management
- Donations: CRUD operations
- Food Items: Inventory management
- Deliveries: Delivery coordination
- Warehouses: Inventory tracking
- Communities: Community management
- Donation Requests: Request handling
- Restaurant Chains: Chain management
- Impact Records: Impact metrics

---

### [Architecture](./ARCHITECTURE.md)
**System design and technical architecture**

- Technology stack overview
- System components and structure
- Database schema and relationships
- Data flow and workflows
- API architecture
- Security considerations
- Deployment architecture
- Scalability considerations
- Performance optimization

**Start here if:** You want to understand how the system is designed and structured.

---

### [Development Guide](./DEVELOPMENT.md)
**Contributing guidelines and best practices**

- Development workflow
- Code style guidelines (Python and TypeScript)
- Backend development (Django)
- Frontend development (Next.js/React)
- Testing strategies
- Git workflow and commit conventions
- Common development tasks
- Code review checklist
- Development tools and resources

**Start here if:** You're contributing to the project or setting up a development environment.

---

### [Testing Guide](./TEST.md)
**Comprehensive testing documentation**

- Backend testing (Django TestCase, DRF APITestCase)
- Frontend testing (Jest, React Testing Library)
- API integration testing
- Test data and fixtures
- Running tests
- Test coverage
- CI/CD testing
- Best practices

**Start here if:** You're writing or running tests for the application.

---

## 🗺️ Database Schema

### [Database ER Diagram](./db-diagram.png)
Visual representation of the database schema showing all entities, relationships, and attributes.

**Entities:**
- User, Donor, Recipient, DeliveryStaff, Admin
- Restaurant, RestaurantChain
- Donation, DonationRequest
- FoodItem
- Delivery
- Community, Warehouse
- ImpactRecord

---

## 📖 Quick Navigation

### For New Users
1. Start with [Setup Guide](./SETUP.md) to get the application running
2. Review [Architecture](./ARCHITECTURE.md) to understand the system
3. Check [API Reference](./API.md) for available endpoints

### For Developers
1. Read [Development Guide](./DEVELOPMENT.md) for coding standards
2. Review [Testing Guide](./TEST.md) for testing practices
3. Reference [API Reference](./API.md) when building features

### For API Integration
1. Start with [API Reference](./API.md) for endpoint documentation
2. Review authentication section for header-based auth
3. Check [Architecture](./ARCHITECTURE.md) for data flow understanding

---

## 🔗 External Resources

### Django & DRF
- [Django 5.2 Documentation](https://docs.djangoproject.com/en/5.2/)
- [Django REST Framework](https://www.django-rest-framework.org/)

### Next.js & React
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Tools
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Docker Documentation](https://docs.docker.com/)

---

## 📝 Documentation Updates

This documentation is maintained alongside the codebase. If you find any issues or outdated information:

1. Check the [GitHub Issues](https://github.com/NapatKulnarong/Re-Meals/issues)
2. Create a new issue with the documentation problem
3. Or submit a pull request with the fix

---

**Last Updated:** Documentation is kept up-to-date with the latest codebase changes.

**Version:** Compatible with Django 5.2.8, Next.js 16.0.3, React 19.2.0, PostgreSQL 16

