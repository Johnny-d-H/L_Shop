# Dota 2 Market API Documentation

## Authentication Endpoints

### POST /api/register
Create a new user account.

**Request:**
```json
{
  "name": "username",
  "password": "password123",
  "email": "user@example.com",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "message": "Registered",
  "user": {
    "id": 1234567890,
    "name": "username"
  }
}
```

---

### POST /api/login
Authenticate user and create session.

**Request:**
```json
{
  "name": "username",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Logged in",
  "user": {
    "id": 1234567890,
    "name": "username"
  }
}
```

---

### POST /api/logout
End user session.

**Response (200):**
```json
{
  "message": "Logged out"
}
```

---

### GET /api/me
Get current authenticated user.

**Response (200):**
```json
{
  "user": {
    "id": 1234567890,
    "name": "username"
  }
}
```

---

## Localization Endpoints

### GET /api/locale
Get current locale and translations.

**Response (200):**
```json
{
  "locale": "ru",
  "translations": {
    "header": {
      "title": "Dota 2 Market",
      "login": "Войти"
    }
    // ... more translations
  }
}
```

---

### POST /api/locale
Change locale for current session.

**Request:**
```json
{
  "locale": "en"
}
```

**Response (200):**
```json
{
  "locale": "en",
  "translations": { /* ... */ }
}
```

---

### GET /api/locale/detect
Detect user locale from country.

**Response (200):**
```json
{
  "detectedLocale": "ru",
  "country": "RU"
}
```

---

## Product Endpoints

### GET /api/products
Get list of products with filtering and sorting.

**Query Parameters:**
- `search` - Search term
- `sort` - Sort option: `price_asc`, `price_desc`
- `hero` - Filter by hero
- `inStock` - Filter in-stock items: `true`

**Response (200):**
```json
[
  {
    "id": 1234567890,
    "name": "Arcana Dagger",
    "price": 500,
    "count": 5,
    "hero": "Phantom Assassin",
    "description": "Rare arcana",
    "rarity": "Mythical",
    "tags": ["arcana", "weapon"],
    "ownerId": 1234567890,
    "averageRating": 4.5,
    "reviewCount": 10
  }
]
```

---

### POST /api/products
Create new product (requires authentication).

**Request:**
```json
{
  "name": "Item Name",
  "price": 100,
  "count": 5,
  "hero": "Hero Name",
  "description": "Description",
  "rarity": "Common",
  "tags": "tag1,tag2,tag3"
}
```

**Response (201):**
```json
{
  "message": "Product added",
  "product": { /* product object */ }
}
```

---

### GET /api/my-lots
Get user's own products (requires authentication).

**Response (200):**
```json
[
  { /* product objects */ }
]
```

---

### DELETE /api/my-lots/:id
Delete a product (requires authentication and ownership).

**Response (200):**
```json
{
  "message": "Deleted"
}
```

---

## Reviews & Ratings Endpoints

### POST /api/reviews
Submit or update a review (requires authentication).

**Request:**
```json
{
  "productId": 1234567890,
  "rating": 5,
  "comment": "Great product!"
}
```

**Response (201):**
```json
{
  "message": "Review added",
  "review": {
    "id": 9876543210,
    "productId": 1234567890,
    "userId": 1234567890,
    "username": "reviewer_name",
    "rating": 5,
    "comment": "Great product!",
    "createdAt": "2026-05-23T12:34:56.000Z"
  }
}
```

---

### GET /api/reviews/:productId
Get all reviews and average rating for a product.

**Response (200):**
```json
{
  "reviews": [
    {
      "id": 9876543210,
      "productId": 1234567890,
      "userId": 1234567890,
      "username": "reviewer_name",
      "rating": 5,
      "comment": "Great product!",
      "createdAt": "2026-05-23T12:34:56.000Z"
    }
  ],
  "averageRating": 4.5,
  "count": 2
}
```

---

## Recommendations & Likes Endpoints

### POST /api/likes/:productId
Add product to liked items (requires authentication).

**Response (200):**
```json
{
  "message": "Product liked"
}
```

---

### GET /api/recommendations
Get recommended products based on liked items (requires authentication).

Recommendations are based on tags of liked products and expire after 3 days of inactivity.

**Response (200):**
```json
{
  "recommendations": [
    { /* product objects */ }
  ]
}
```

---

## Cart Endpoints

### GET /api/cart
Get user's cart (requires authentication).

**Response (200):**
```json
[
  {
    "productId": 1234567890,
    "qty": 2,
    "name": "Item Name",
    "price": 100
  }
]
```

---

### POST /api/cart
Add item to cart (requires authentication).

**Request:**
```json
{
  "productId": 1234567890,
  "qty": 2
}
```

**Response (200):**
```json
{
  "message": "Added",
  "cart": [
    { /* cart items */ }
  ]
}
```

---

### PUT /api/cart/:productId
Update item quantity in cart (requires authentication).

**Request:**
```json
{
  "qty": 3
}
```

**Response (200):**
```json
{
  "message": "Updated",
  "cart": [
    { /* cart items */ }
  ]
}
```

---

### DELETE /api/cart/:productId
Remove item from cart (requires authentication).

**Response (200):**
```json
{
  "message": "Removed",
  "cart": [
    { /* cart items */ }
  ]
}
```

---

### POST /api/cart/checkout
Complete purchase of all items in cart (requires authentication).

**Response (200):**
```json
{
  "message": "Checkout completed",
  "results": [
    {
      "productId": 1234567890,
      "status": "purchased",
      "purchase": { /* purchase object */ }
    }
  ]
}
```

---

## Purchase History Endpoints

### GET /api/inventory
Get user's purchase history (requires authentication).

**Response (200):**
```json
[
  {
    "id": 9876543210,
    "productId": 1234567890,
    "name": "Item Name",
    "price": 100,
    "boughtAt": "2026-05-23T12:34:56.000Z",
    "qty": 1
  }
]
```

---

### POST /api/buy/:id
Purchase a single product directly (requires authentication).

**Response (200):**
```json
{
  "message": "Purchased",
  "purchase": { /* purchase object */ }
}
```

---

## Admin Endpoints

All admin endpoints require authentication with `role: 'admin'`.

### POST /api/admin/products
Create a new product (admin only).

**Request:**
```json
{
  "name": "Product Name",
  "price": 100,
  "count": 5,
  "hero": "Hero",
  "description": "Description",
  "rarity": "Common",
  "tags": "tag1,tag2"
}
```

**Response (201):**
```json
{
  "message": "Product added",
  "product": { /* product object */ }
}
```

---

### GET /api/admin/products
Get all products owned by admin (admin only).

**Response (200):**
```json
[
  { /* product objects */ }
]
```

---

### PUT /api/admin/products/:id
Update a product (admin only).

**Request:**
```json
{
  "name": "Updated Name",
  "price": 150,
  "count": 10,
  "description": "Updated description",
  "tags": "tag1,tag3"
}
```

**Response (200):**
```json
{
  "message": "Product updated",
  "product": { /* updated product object */ }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Name and password required"
}
```

### 401 Unauthorized
```json
{
  "message": "Login required"
}
```

### 403 Forbidden
```json
{
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "message": "Product not found"
}
```

---

## Data Models

### User
```typescript
interface User {
  id: number;
  name: string;
  password: string;
  role: 'user' | 'admin';
  email?: string;
  phone?: string;
}
```

### Product
```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  count: number;
  hero?: string;
  description?: string;
  rarity?: string;
  ownerId?: number;
  tags?: string[];
  averageRating?: number;
  reviewCount?: number;
}
```

### Review
```typescript
interface Review {
  id: number;
  productId: number;
  userId: number;
  username: string;
  rating: number;
  comment: string;
  createdAt: string;
}
```

### Purchase
```typescript
interface Purchase {
  id: number;
  productId: number;
  name: string;
  price: number;
  sellerId?: number;
  buyerId: number;
  boughtAt: string;
  qty: number;
}
```

### Cart
```typescript
interface Cart {
  userId: number;
  items: CartItem[];
}

interface CartItem {
  productId: number;
  qty: number;
}
```

---

## Features

### Localization
- Supports Russian (ru) and English (en) languages
- Session-based locale selection (resets on browser close)
- Automatic locale detection from country
- All UI text translatable

### Reviews & Ratings
- Users can submit and update reviews (one per user per product)
- 5-star rating system
- Average rating and review count displayed on product pages
- Only authenticated users can submit reviews

### Recommendations
- Tag-based recommendation system
- Tags automatically added when user likes a product
- Recommendations expire after 3 days of inactivity
- Displayed alongside regular product listings

### Admin Features
- Admin role for shop owners
- Full product management (create, read, update, delete)
- Admin-specific product creation and editing interface
- Admin products can have rich details (hero, rarity, tags, description)

---

## Session Management

- Sessions expire after 1 hour of inactivity
- Sessions are tied to browser cookies (httpOnly)
- Admin sessions automatically expire on logout
- Locale preference stored in session (not persisted)

