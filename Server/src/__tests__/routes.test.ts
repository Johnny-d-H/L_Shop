import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import router from '../routes/router';
import fs from 'fs';
import path from 'path';

let app: Express;
const dataDir = path.join(__dirname, '..', 'data');

beforeAll(() => {
    app = express();
    app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true }
    }));
    app.use(express.json());
    app.use('/api', router);
});

beforeEach(() => {
    // Clean up test data
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
});

describe('Auth Endpoints', () => {
    describe('POST /api/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    name: `testuser${Date.now()}`,
                    password: 'password123',
                    email: 'test@example.com',
                    phone: '+1234567890'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Registered');
            expect(response.body.user.name).toContain('testuser');
        });

        it('should fail if name or password missing', async () => {
            const response = await request(app)
                .post('/api/register')
                .send({
                    name: 'testuser'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Name and password required');
        });

        it('should prevent duplicate usernames', async () => {
            await request(app)
                .post('/api/register')
                .send({
                    name: 'duplicate',
                    password: 'pass123'
                });

            const response = await request(app)
                .post('/api/register')
                .send({
                    name: 'duplicate',
                    password: 'pass123'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('User exists');
        });
    });

    describe('POST /api/login', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/register')
                .send({
                    name: 'testuser',
                    password: 'password123'
                });
        });

        it('should login with correct credentials', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    name: 'testuser',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Logged in');
            expect(response.body.user.name).toBe('testuser');
        });

        it('should fail with incorrect password', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    name: 'testuser',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid credentials');
        });

        it('should fail if user not found', async () => {
            const response = await request(app)
                .post('/api/login')
                .send({
                    name: 'nonexistent',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/me', () => {
        it('should return null for unauthenticated user', async () => {
            const response = await request(app)
                .get('/api/me');

            expect(response.status).toBe(200);
            expect(response.body.user).toBeNull();
        });
    });
});

describe('Localization Endpoints', () => {
    describe('GET /api/locale', () => {
        it('should return default locale (ru)', async () => {
            const response = await request(app)
                .get('/api/locale');

            expect(response.status).toBe(200);
            expect(response.body.locale).toBe('ru');
            expect(response.body.translations).toBeDefined();
        });
    });

    describe('POST /api/locale', () => {
        it('should change locale to English', async () => {
            const response = await request(app)
                .post('/api/locale')
                .send({ locale: 'en' });

            expect(response.status).toBe(200);
            expect(response.body.locale).toBe('en');
        });

        it('should reject invalid locale', async () => {
            const response = await request(app)
                .post('/api/locale')
                .send({ locale: 'invalid' });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/locale/detect', () => {
        it('should detect locale from country header', async () => {
            const response = await request(app)
                .get('/api/locale/detect');

            expect(response.status).toBe(200);
            expect(response.body.detectedLocale).toBeDefined();
        });
    });
});

describe('Products Endpoints', () => {
    let userId: number;
    let sessionCookie: string;

    beforeEach(async () => {
        const registerRes = await request(app)
            .post('/api/register')
            .send({
                name: `user${Date.now()}`,
                password: 'password123'
            });

        const loginRes = await request(app)
            .post('/api/login')
            .send({
                name: `user${Date.now()}`,
                password: 'password123'
            });

        sessionCookie = loginRes.headers['set-cookie'];
    });

    describe('GET /api/products', () => {
        it('should return empty products list initially', async () => {
            const response = await request(app)
                .get('/api/products');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should support search query', async () => {
            const response = await request(app)
                .get('/api/products?search=dota');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should support sorting', async () => {
            const response = await request(app)
                .get('/api/products?sort=price_asc');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('POST /api/products', () => {
        it('should require login', async () => {
            const response = await request(app)
                .post('/api/products')
                .send({
                    name: 'Test Item',
                    price: 100,
                    count: 5,
                    tags: ['test', 'item']
                });

            expect(response.status).toBe(403);
        });

        it('should create product when authenticated', async () => {
            const registerRes = await request(app)
                .post('/api/register')
                .send({
                    name: `seller${Date.now()}`,
                    password: 'password123'
                });

            const cookie = registerRes.headers['set-cookie'];

            const response = await request(app)
                .post('/api/products')
                .set('Cookie', cookie)
                .send({
                    name: 'Arcana Sword',
                    price: 500,
                    count: 10,
                    hero: 'Phantom Assassin',
                    description: 'Rare arcana',
                    rarity: 'Mythical',
                    tags: 'arcana,weapon,rare'
                });

            expect(response.status).toBe(201);
            expect(response.body.product.name).toBe('Arcana Sword');
        });

        it('should preserve tags and return product review metadata', async () => {
            const sellerRes = await request(app)
                .post('/api/register')
                .send({
                    name: `sellerTag${Date.now()}`,
                    password: 'password123'
                });
            const sellerCookie = sellerRes.headers['set-cookie'];

            const productRes = await request(app)
                .post('/api/products')
                .set('Cookie', sellerCookie)
                .send({
                    name: 'Reviewable Sword',
                    price: 250,
                    count: 3,
                    tags: 'sword,blade'
                });
            expect(productRes.status).toBe(201);
            const productId = productRes.body.product.id;
            expect(productRes.body.product.tags).toEqual(['sword', 'blade']);

            const reviewerRes = await request(app)
                .post('/api/register')
                .send({
                    name: `reviewer${Date.now()}`,
                    password: 'password123'
                });
            const reviewerCookie = reviewerRes.headers['set-cookie'];

            await request(app)
                .post('/api/reviews')
                .set('Cookie', reviewerCookie)
                .send({
                    productId,
                    rating: 4,
                    comment: 'Very good'
                });

            const listRes = await request(app).get('/api/products');
            const product = listRes.body.find((item: any) => item.id === productId);
            expect(product).toBeDefined();
            expect(product.averageRating).toBe(4);
            expect(product.reviewCount).toBe(1);
        });

        it('should fail without name or price', async () => {
            const registerRes = await request(app)
                .post('/api/register')
                .send({
                    name: `seller${Date.now()}`,
                    password: 'password123'
                });

            const cookie = registerRes.headers['set-cookie'];

            const response = await request(app)
                .post('/api/products')
                .set('Cookie', cookie)
                .send({
                    name: 'Test Item'
                });

            expect(response.status).toBe(400);
        });
    });
});

describe('Reviews Endpoints', () => {
    let productId: number;
    let userCookie: string;

    beforeEach(async () => {
        // Create user
        const userRes = await request(app)
            .post('/api/register')
            .send({
                name: `user${Date.now()}`,
                password: 'password123'
            });
        userCookie = userRes.headers['set-cookie'];

        // Create product
        const prodRes = await request(app)
            .post('/api/products')
            .set('Cookie', userCookie)
            .send({
                name: 'Test Product',
                price: 100,
                count: 5,
                tags: 'test'
            });

        productId = prodRes.body.product.id;
    });

    describe('POST /api/reviews', () => {
        it('should require login', async () => {
            const response = await request(app)
                .post('/api/reviews')
                .send({
                    productId,
                    rating: 5,
                    comment: 'Great product!'
                });

            expect(response.status).toBe(401);
        });

        it('should add review successfully', async () => {
            const response = await request(app)
                .post('/api/reviews')
                .set('Cookie', userCookie)
                .send({
                    productId,
                    rating: 5,
                    comment: 'Excellent product!'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Review added');
        });

        it('should validate rating range', async () => {
            const response = await request(app)
                .post('/api/reviews')
                .set('Cookie', userCookie)
                .send({
                    productId,
                    rating: 10,
                    comment: 'Too high rating'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/reviews/:productId', () => {
        it('should return empty reviews for new product', async () => {
            const response = await request(app)
                .get(`/api/reviews/${productId}`);

            expect(response.status).toBe(200);
            expect(response.body.reviews).toEqual([]);
            expect(response.body.averageRating).toBe(0);
        });

        it('should return reviews with average rating', async () => {
            await request(app)
                .post('/api/reviews')
                .set('Cookie', userCookie)
                .send({
                    productId,
                    rating: 4,
                    comment: 'Good product'
                });

            const response = await request(app)
                .get(`/api/reviews/${productId}`);

            expect(response.status).toBe(200);
            expect(response.body.reviews.length).toBe(1);
            expect(response.body.averageRating).toBe(4);
        });
    });
});
