# 🍽️ ReMeals

> An integrated platform connecting food donors with communities to reduce food waste and improve food security.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
![Python](https://img.shields.io/badge/Python-3.12-blue.svg)
![Django](https://img.shields.io/badge/Django-5.2-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed.svg)

## 🎯 About The Project

ReMeals bridges the gap between surplus food and those who need it most. By connecting restaurants, stores, and individual donors with community fridges and recipients, we're building a sustainable solution to food waste while maximizing social impact.

### The Problem

- Millions of tons of edible food waste annually
- Food insecurity affecting vulnerable communities
- Lack of coordination between donors and recipients

### Our Solution

A comprehensive platform that ensures food safety, tracks real-time inventory, coordinates volunteers, and measures environmental impact.

## ✨ Key Features

- 🏪 **Food Donation Management** - Restaurants and donors can easily log and track surplus food donations
- 📦 **Real-time Inventory Tracking** - Monitor food stock levels across community warehouses and fridges
- 🚚 **Smart Delivery Coordination** - Match available delivery staff with donation pickups and recipient deliveries
- 👥 **Recipient Network** - Connect households and community organizations with available food resources
- 📊 **Impact Analytics** - Track meals saved, food waste reduced, and CO₂ emissions prevented
- ✅ **Food Safety Compliance** - Automated expiry tracking and quality assurance workflows

## 🏗️ System Architecture

The platform manages multiple stakeholders:

| Role                     | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| **Donors**               | Restaurants, chains, stores, and individuals contributing surplus food |
| **Recipients**           | Households and community organizations receiving food assistance       |
| **Delivery Staff**       | Volunteers coordinating food transport between locations               |
| **Community Warehouses** | Storage facilities managing inventory and distribution                 |
| **Administrators**       | Platform operators ensuring smooth operations                          |

## 📊 Database Schema

![Database ER Diagram](./docs/db-diagram.png)

### Core Entities

- **User** - Base user account (donors, recipients, delivery staff, admins)
- **Donor** - Food donors linked to restaurants
- **Restaurant/RestaurantChain** - Food donor organizations
- **Donation** - Food donation records with status tracking
- **FoodItem** - Individual food items with expiry and distribution tracking
- **Delivery** - Delivery coordination with pickup/dropoff times and status
- **DeliveryStaff** - Available volunteers with assigned areas
- **Recipient** - Recipients linked to communities
- **Community** - Recipient communities with demand tracking and warehouse assignment
- **Warehouse** - Storage facilities with capacity management and expiry tracking
- **ImpactRecord** - Environmental and social impact metrics (meals saved, CO₂ reduced)

### Key Relationships

- Users can be Donors, Recipients, DeliveryStaff, or Admins
- Donors are associated with Restaurants (which may belong to RestaurantChains)
- Donations contain multiple FoodItems
- Deliveries connect Donations with Recipients via DeliveryStaff
- Recipients belong to Communities, which have assigned Warehouses
- ImpactRecords track the environmental impact of distributed FoodItems

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python 3.12+ (for the Django backend)
- Django 5.2.8 (as pinned in `backend/requirements.txt`)
- PostgreSQL (v15+)
- Docker & Docker Compose

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/remeals.git
cd remeals
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database

```bash
npm run db:setup
npm run db:migrate
```

5. Start the development server

```bash
npm run dev
```

### Using Docker

```bash
docker-compose up -d
```

#### Load the sample data with Docker

Once the services are running, you can populate the database with all of the fixtures in one shot:

```bash
docker compose exec backend python manage.py loaddata \
  fixtures/001_restaurant_chains.json \
  fixtures/002_restaurants.json \
  fixtures/003_warehouses.json \
  fixtures/004_communities.json \
  fixtures/005_users.json \
  fixtures/006_user_roles.json \
  fixtures/007_donations.json \
  fixtures/008_food_items.json \
  fixtures/010_deliveries.json \
  fixtures/009_donation_requests.json
```

> Tip: run this command against a fresh database (or after `python manage.py flush`) to avoid duplicate-key errors while reloading fixtures.

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Setup Guide](./docs/SETUP.md)** - Detailed installation and setup instructions for local and Docker environments
- **[API Reference](./docs/API.md)** - Complete REST API documentation with endpoints, requests, and responses
- **[Architecture](./docs/ARCHITECTURE.md)** - System design, technology stack, and architectural decisions
- **[Development Guide](./docs/DEVELOPMENT.md)** - Contributing guidelines, code style, and best practices

For a quick overview of all documentation, see the [Documentation Index](./docs/README.md).

## 🛠️ Technology Stack

### Backend

- Python 3.12 / Django 5
- Django REST Framework
- PostgreSQL + pgAdmin

### Frontend

- Next.js (React 19) — requires Node.js >= 20.9
- Tailwind CSS

### DevOps

- Docker & Docker Compose
- GitHub Actions (CI)
- Dockerized Postgres services for local development

## 📁 Project Structure

```
remeals/
├── backend/
│   ├── community/
│   ├── delivery/
│   ├── donation/
│   ├── donation_request/
│   ├── fooditem/
│   ├── impactrecord/
│   ├── re_meals_api/
│   ├── restaurants/
│   ├── restaurant_chain/
│   ├── users/
│   ├── warehouse/
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── next.config.ts
│   ├── eslint.config.mjs
│   └── package-lock.json
│
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   ├── SETUP.md
│   ├── db-diagram.png
│   └── README.md
│
├── .env.example
│
├── .gitignore
│
├── docker-compose.yml
│
├── Dockerfile
│
├── LICENSE
│
└── README.md
```

## 🤝 Contributing

Contributions are what make the open source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/amazing-feature`)
3. Commit your Changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the Branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

Please read our [Development Guide](./docs/DEVELOPMENT.md) for detailed contributing guidelines, code style, and best practices.

### Commit Convention

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 📈 Roadmap

- [x] Database schema design
- [x] ER diagram documentation
- [x] User authentication system
- [x] Donation management interface
- [x] Real-time inventory tracking
- [x] Delivery coordination system
- [x] Impact analytics dashboard

See the [open issues](https://github.com/yourusername/remeals/issues) for a full list of proposed features.

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Contact

- Karnpon Poochitkanon - karnpon14513@gmail.com
- Napat Kulnarong - kul.napat@hotmail.com
- Nisara Ploysuttipol - nisara.ploys@gmail.com
- Tanon Likhittaphong - 2005tanon@gmail.com

Project Link: [https://github.com/NapatKulnarong/Re-Meals](https://github.com/NapatKulnarong/Re-Meals)

## 🙏 Acknowledgments

- Food Rescue Organizations
- Community Partners
- All our volunteers and contributors

---

**ReMeals: Making a difference, one meal at a time.** 🍽️♻️

_If you find this project helpful, please consider giving it a ⭐!_
