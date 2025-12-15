# ReMeals API Documentation

## Base URL

```
Development: http://localhost:8000/api/
Production: [Your production URL]
```

**API Health Check:**
```http
GET http://localhost:8000/
```

Returns: `Re-Meals API Running 🎉`

## Authentication

The API uses header-based authentication. Include the following headers in your authenticated requests:

```http
X-USER-ID: your-user-id-here
X-USER-IS-ADMIN: true|false
X-USER-IS-DELIVERY: true|false
```

### Getting User Information

To obtain user information and user_id, use the login endpoint:

```bash
# Example: Login as a donor (can use username or email)
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"identifier": "donor1", "password": "password123"}'
```

After login, use the returned `user_id` in the `X-USER-ID` header for subsequent requests.

**Test Users** (after loading fixtures):
- Admin: `admin` / `password123`
- Donors: `donor1`, `donor2` / `password123`
- Delivery Staff: `delivery1`, `delivery2` / `password123`
- Recipients: `recipient1`, `recipient2` / `password123`

For complete test user details, see [SETUP.md - Test Users](./SETUP.md#test-users).

## API Endpoints

### Users

#### Signup (Register User)
```http
POST /api/users/signup/
```

**Request Body:**
```json
{
  "username": "string",
  "fname": "string",
  "lname": "string",
  "bod": "string (DD/MM/YYYY or YYYY-MM-DD)",
  "phone": "string",
  "email": "string",
  "password": "string",
  "restaurant_id": "string (optional)",
  "restaurant_name": "string (optional)",
  "branch": "string (optional)",
  "restaurant_address": "string (optional)"
}
```

**Response:**
```json
{
  "message": "Signup successful",
  "username": "string",
  "email": "string",
  "user_id": "string",
  "fname": "string",
  "lname": "string",
  "phone": "string",
  "is_admin": "boolean",
  "is_delivery_staff": "boolean",
  "restaurant_id": "string or null",
  "restaurant_name": "string or null",
  "branch": "string or null",
  "restaurant_address": "string or null"
}
```

#### Login
```http
POST /api/users/login/
```

**Request Body:**
```json
{
  "identifier": "string (username or email)",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login success",
  "username": "string",
  "email": "string",
  "user_id": "string",
  "fname": "string",
  "lname": "string",
  "phone": "string",
  "is_admin": "boolean",
  "is_delivery_staff": "boolean",
  "restaurant_id": "string or null",
  "restaurant_name": "string or null",
  "branch": "string or null",
  "restaurant_address": "string or null"
}
```

**Note**: Use the returned `user_id` in the `X-USER-ID` header for authenticated requests.

#### List Delivery Staff
```http
GET /api/users/delivery-staff/
```

**Response:**
```json
[
  {
    "user_id": "string",
    "username": "string",
    "name": "string",
    "email": "string",
    "assigned_area": "string",
    "is_available": "boolean"
  }
]
```

#### Update Profile
```http
PATCH /api/users/profile/
```

**Headers:**
```http
X-USER-ID: your-user-id
```

**Request Body (all fields optional):**
```json
{
  "username": "string",
  "fname": "string",
  "lname": "string",
  "phone": "string",
  "email": "string",
  "restaurant_id": "string",
  "restaurant_name": "string",
  "branch": "string",
  "restaurant_address": "string"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "username": "string",
  "email": "string",
  "fname": "string",
  "lname": "string",
  "phone": "string",
  "restaurant_id": "string or null",
  "restaurant_name": "string or null",
  "branch": "string or null",
  "restaurant_address": "string or null"
}
```

### Donations

#### List Donations
```http
GET /api/donations/
```

**Query Parameters:**
- `status`: Filter by donation status (`pending`, `accepted`, `declined`)
- `restaurant_id`: Filter donations originating from a restaurant
- `date_from` / `date_to`: Filter by donation timestamp range (ISO date or datetime)

**Response:**
```json
[
  {
    "donation_id": "DON0000001",
    "donated_at": "2025-01-05T10:00:00Z",
    "status": "pending",
    "restaurant": "RES0000001",
    "restaurant_name": "KFC Central World",
    "restaurant_branch": "CentralWorld",
    "restaurant_address": "999/9 Rama I Rd, Bangkok",
    "created_by_user_id": "DON0000001",
    "created_by_username": "donor1"
  }
]
```

#### Create Donation
```http
POST /api/donations/
```

Provide either an existing `restaurant` ID or manual restaurant info:

```json
{
  "restaurant": "RES0000001"
}
```
or
```json
{
  "manual_restaurant_name": "Local Bakery",
  "manual_branch_name": "Thonglor",
  "manual_restaurant_address": "23 Sukhumvit 55, Bangkok"
}
```

**Headers (for authenticated requests):**
```http
X-USER-ID: your-user-id
X-USER-IS-ADMIN: true|false (optional)
```

The API automatically records the authenticated user (`X-USER-ID` header) as `created_by_user_id`.

#### Get Donation Details
```http
GET /api/donations/{donation_id}/
```

#### Update Donation
```http
PUT /api/donations/{donation_id}/
PATCH /api/donations/{donation_id}/
```

Only the admin or the user who created the donation (`created_by_user_id`) can update it, and only while the donation status is `pending`.

#### Delete Donation
```http
DELETE /api/donations/{donation_id}/
```

Deletion follows the same rule: only pending donations may be removed, and only by their creator or an admin.

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
    "food_id": "string",
    "donation": "integer",
    "donation_id": "string",
    "name": "string",
    "quantity": "decimal",
    "unit": "string",
    "expiry_date": "date",
    "status": "string",
    "warehouse": "integer",
    "warehouse_id": "string",
    "is_distributed": "boolean",
    "is_claimed": "boolean",
    "created_at": "datetime"
  }
]
```

#### Get Food Item Details
```http
GET /api/fooditems/{food_id}/
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
  "unit": "string (kg, liters, pieces, etc.)",
  "expiry_date": "date (YYYY-MM-DD)",
  "notes": "string (optional)"
}
```

#### Update Food Item
```http
PUT /api/fooditems/{food_id}/
PATCH /api/fooditems/{food_id}/
```

#### Delete Food Item
```http
DELETE /api/fooditems/{food_id}/
```

### Deliveries

#### List Deliveries
```http
GET /api/delivery/deliveries/
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
    "delivery_id": "string",
    "donation": "integer",
    "donation_id": "string",
    "delivery_staff": "integer",
    "delivery_staff_user_id": "string",
    "recipient": "integer",
    "recipient_user_id": "string",
    "pickup_time": "datetime",
    "dropoff_time": "datetime",
    "status": "string",
    "notes": "string",
    "created_at": "datetime"
  }
]
```

#### Get Delivery Details
```http
GET /api/delivery/deliveries/{delivery_id}/
```

#### Create Delivery
```http
POST /api/delivery/deliveries/
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

#### Update Delivery
```http
PUT /api/delivery/deliveries/{delivery_id}/
PATCH /api/delivery/deliveries/{delivery_id}/
```

#### Delete Delivery
```http
DELETE /api/delivery/deliveries/{delivery_id}/
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
    "restaurant_id": "string",
    "name": "string",
    "branch_name": "string",
    "address": "string",
    "is_chain": "boolean",
    "chain": "integer",
    "chain_id": "string",
    "created_at": "datetime"
  }
]
```

#### Get Restaurant Details
```http
GET /api/restaurants/{restaurant_id}/
```

#### Create Restaurant
```http
POST /api/restaurants/
```

**Request Body:**
```json
{
  "name": "string",
  "branch_name": "string",
  "address": "string",
  "is_chain": "boolean",
  "chain": "integer"
}
```

#### Update Restaurant
```http
PUT /api/restaurants/{restaurant_id}/
PATCH /api/restaurants/{restaurant_id}/
```

#### Delete Restaurant
```http
DELETE /api/restaurants/{restaurant_id}/
```

### Communities

#### List Communities
```http
GET /api/community/communities/
```

**Response:**
```json
[
  {
    "id": "integer",
    "community_id": "string",
    "name": "string",
    "address": "string",
    "population": "integer",
    "warehouse_id": "string",
    "created_at": "datetime"
  }
]
```

#### Get Community Details
```http
GET /api/community/communities/{community_id}/
```

#### Create Community
```http
POST /api/community/communities/
```

#### Update Community
```http
PUT /api/community/communities/{community_id}/
PATCH /api/community/communities/{community_id}/
```

#### Delete Community
```http
DELETE /api/community/communities/{community_id}/
```

### Donation Requests

#### List Donation Requests
```http
GET /api/donation-requests/
```

**Query Parameters:**
- `status`: Filter by request status
- `community_id`: Filter by community ID
- `created_by`: Filter by creator user ID

**Response:**
```json
[
  {
    "request_id": "string",
    "title": "string",
    "community_id": "integer",
    "community_name": "string",
    "recipient_address": "string",
    "expected_delivery": "datetime",
    "people_count": "integer",
    "contact_phone": "string",
    "notes": "string",
    "status": "string",
    "created_by_user_id": "string",
    "created_at": "datetime"
  }
]
```

#### Create Donation Request
```http
POST /api/donation-requests/
```

**Headers:**
```http
X-USER-ID: your-user-id
```

**Request Body:**
```json
{
  "title": "string",
  "community_id": "integer (required)",
  "community_name": "string (optional, for auto-creation)",
  "recipient_address": "string",
  "expected_delivery": "datetime",
  "people_count": "integer",
  "contact_phone": "string",
  "notes": "string"
}
```

**Note**: If `community_id` is not provided but `community_name` is, a new community will be auto-created.

#### Get Donation Request Details
```http
GET /api/donation-requests/{request_id}/
```

#### Update Donation Request
```http
PUT /api/donation-requests/{request_id}/
PATCH /api/donation-requests/{request_id}/
```

**Headers:**
```http
X-USER-ID: your-user-id
X-USER-IS-ADMIN: true|false (optional)
```

Only the creator or admin can update donation requests.

#### Delete Donation Request
```http
DELETE /api/donation-requests/{request_id}/
```

**Headers:**
```http
X-USER-ID: your-user-id
X-USER-IS-ADMIN: true|false (optional)
```

Only the creator or admin can delete donation requests.

### Restaurant Chains

#### List Restaurant Chains
```http
GET /api/restaurant-chains/
```

**Response:**
```json
[
  {
    "id": "integer",
    "chain_id": "string",
    "chain_name": "string",
    "created_at": "datetime"
  }
]
```

#### Get Restaurant Chain Details
```http
GET /api/restaurant-chains/{chain_id}/
```

#### Create Restaurant Chain
```http
POST /api/restaurant-chains/
```

**Request Body:**
```json
{
  "chain_name": "string"
}
```

#### Update Restaurant Chain
```http
PUT /api/restaurant-chains/{chain_id}/
PATCH /api/restaurant-chains/{chain_id}/
```

#### Delete Restaurant Chain
```http
DELETE /api/restaurant-chains/{chain_id}/
```

### Impact Records

**Note**: Impact records are read-only. They are automatically created when food items are distributed.

#### List Impact Records
```http
GET /api/impact/
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

#### Get Impact Record Details
```http
GET /api/impact/{id}/
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
  "error": "User ID required"
}
```

**Note**: This error occurs when the `X-USER-ID` header is missing or invalid.

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
