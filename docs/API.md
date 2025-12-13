# ReMeals API Documentation

## Base URL

```
Development: http://localhost:8000/api/
Production: [Your production URL]
```

## Authentication

The API uses Django REST Framework authentication. Include authentication credentials in your requests:

```http
Authorization: Token your-auth-token-here
```

### Getting a Token

To obtain an authentication token, use the login endpoint with test credentials:

```bash
# Example: Login as a donor
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "donor1", "password": "password123"}'
```

**Test Users** (after loading fixtures):
- Admin: `admin` / `password123`
- Donors: `donor1`, `donor2` / `password123`
- Delivery Staff: `delivery1`, `delivery2` / `password123`
- Recipients: `recipient1`, `recipient2` / `password123`

For complete test user details, see [SETUP.md - Test Users](./SETUP.md#test-users).

## API Endpoints

### Users

#### Register User
```http
POST /api/users/register/
```

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "user_type": "donor|recipient|delivery_staff|admin"
}
```

#### Login
```http
POST /api/users/login/
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": "integer",
    "username": "string",
    "email": "string",
    "user_type": "string"
  }
}
```

### Donations

#### List Donations
```http
GET /api/donations/
```

**Query Parameters:**
- `status`: Filter by donation status (pending, approved, in_transit, delivered, cancelled)
- `donor`: Filter by donor ID
- `date_from`: Filter donations from date (YYYY-MM-DD)
- `date_to`: Filter donations to date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "integer",
    "donor": "integer",
    "restaurant": "integer",
    "status": "string",
    "pickup_time": "datetime",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

#### Create Donation
```http
POST /api/donations/
```

**Request Body:**
```json
{
  "donor": "integer",
  "restaurant": "integer",
  "pickup_time": "datetime",
  "notes": "string"
}
```

#### Get Donation Details
```http
GET /api/donations/{id}/
```

#### Update Donation
```http
PUT /api/donations/{id}/
PATCH /api/donations/{id}/
```

#### Delete Donation
```http
DELETE /api/donations/{id}/
```

### Food Items

#### List Food Items
```http
GET /api/fooditems/
```

**Query Parameters:**
- `donation`: Filter by donation ID
- `warehouse`: Filter by warehouse ID
- `status`: Filter by status (available, distributed, expired)
- `expiry_before`: Filter items expiring before date

**Response:**
```json
[
  {
    "id": "integer",
    "donation": "integer",
    "name": "string",
    "quantity": "decimal",
    "unit": "string",
    "expiry_date": "date",
    "status": "string",
    "warehouse": "integer",
    "created_at": "datetime"
  }
]
```

#### Create Food Item
```http
POST /api/fooditems/
```

**Request Body:**
```json
{
  "donation": "integer",
  "name": "string",
  "quantity": "decimal",
  "unit": "kg|liters|pieces",
  "expiry_date": "date",
  "notes": "string"
}
```

### Deliveries

#### List Deliveries
```http
GET /api/deliveries/
```

**Query Parameters:**
- `status`: Filter by delivery status (scheduled, in_progress, completed, cancelled)
- `delivery_staff`: Filter by delivery staff ID
- `donation`: Filter by donation ID

**Response:**
```json
[
  {
    "id": "integer",
    "donation": "integer",
    "delivery_staff": "integer",
    "recipient": "integer",
    "pickup_time": "datetime",
    "dropoff_time": "datetime",
    "status": "string",
    "notes": "string"
  }
]
```

#### Create Delivery
```http
POST /api/deliveries/
```

**Request Body:**
```json
{
  "donation": "integer",
  "delivery_staff": "integer",
  "recipient": "integer",
  "pickup_time": "datetime",
  "estimated_dropoff_time": "datetime",
  "notes": "string"
}
```

### Warehouses

#### List Warehouses
```http
GET /api/warehouse/warehouses/
```

**Response:**
```json
[
  {
    "warehouse_id": "string",
    "address": "string",
    "capacity": "float",
    "stored_date": "date",
    "exp_date": "date"
  }
]
```

#### Get Warehouse Details
```http
GET /api/warehouse/warehouses/{warehouse_id}/
```

**Response:**
```json
{
  "warehouse_id": "string",
  "address": "string",
  "capacity": "float",
  "stored_date": "date",
  "exp_date": "date"
}
```

#### Get Warehouse Inventory
```http
GET /api/warehouse/warehouses/{warehouse_id}/inventory/
```

Returns all food items currently stored in the warehouse that are:
- Delivered to this warehouse (via completed deliveries)
- Not expired (expire_date >= today)
- Not distributed to community (is_distributed = false)

**Response:**
```json
{
  "warehouse_id": "string",
  "warehouse_address": "string",
  "total_items": "integer",
  "inventory": [
    {
      "food_id": "string",
      "name": "string",
      "quantity": "integer",
      "unit": "string",
      "expire_date": "date",
      "is_expired": "boolean",
      "is_claimed": "boolean",
      "is_distributed": "boolean",
      "donation": "string"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:8000/api/warehouse/warehouses/WAH0000001/inventory/
```

### Restaurants

#### List Restaurants
```http
GET /api/restaurants/
```

**Response:**
```json
[
  {
    "id": "integer",
    "name": "string",
    "address": "string",
    "phone": "string",
    "email": "string",
    "chain": "integer",
    "created_at": "datetime"
  }
]
```

#### Create Restaurant
```http
POST /api/restaurants/
```

**Request Body:**
```json
{
  "name": "string",
  "address": "string",
  "phone": "string",
  "email": "string",
  "chain": "integer"
}
```

### Communities

#### List Communities
```http
GET /api/communities/
```

**Response:**
```json
[
  {
    "id": "integer",
    "name": "string",
    "area": "string",
    "warehouse": "integer",
    "estimated_demand": "integer",
    "created_at": "datetime"
  }
]
```

### Impact Records

#### List Impact Records
```http
GET /api/impact-records/
```

**Query Parameters:**
- `date_from`: Filter from date
- `date_to`: Filter to date
- `food_item`: Filter by food item ID

**Response:**
```json
[
  {
    "id": "integer",
    "food_item": "integer",
    "meals_saved": "integer",
    "co2_reduced_kg": "decimal",
    "date": "date",
    "created_at": "datetime"
  }
]
```

#### Get Total Impact
```http
GET /api/impact-records/total/
```

**Response:**
```json
{
  "total_meals_saved": "integer",
  "total_co2_reduced": "decimal",
  "total_food_items": "integer",
  "period": "string"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "details": {
    "field_name": ["Error message"]
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "error": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Authenticated users: 1000 requests per hour
- Unauthenticated users: 100 requests per hour

## Pagination

List endpoints support pagination:

```http
GET /api/donations/?page=2&page_size=20
```

**Response:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/donations/?page=3",
  "previous": "http://localhost:8000/api/donations/?page=1",
  "results": [...]
}
```

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:8000/swagger/
http://localhost:8000/redoc/
```
