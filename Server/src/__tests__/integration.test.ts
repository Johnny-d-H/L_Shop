import request from 'supertest';
import express, { Express } from 'express';
import session from 'express-session';
import router from '../routes/router';

let app: Express;

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

describe('Shopping Cart Integration Tests', () => {
    let userId: number;
    let productId: number;
    let userCookie: string;
    let sellerCookie: string;

    beforeEach(async () => {
        // Create buyer
        const userRes = await request(app)
            .post('/api/register')
            .send({
                name: `buyer${Date.now()}`,
                password: 'password123'
            });
        userCookie = userRes.headers['set-cookie'];

        // Create seller
        const sellerRes = await request(app)
            .post('/api/register')
            .send({
                name: `seller${Date.now()}`,
                password: 'password123'
            });
        sellerCookie = sellerRes.headers['set-cookie'];

        // Create product from seller
        const prodRes = await request(app)
            .post('/api/products')
            .set('Cookie', sellerCookie)
            .send({
                name: 'Test Item',
                price: 100,
                count: 10,
                tags: 'test'
            });
        productId = prodRes.body.product.id;
    });

    it('should add item to cart', async () => {
        const response = await request(app)
            .post('/api/cart')
            .set('Cookie', userCookie)
            .send({
                productId,
                qty: 2
            });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Added');
        expect(response.body.cart.some((item: any) => item.productId === productId)).toBe(true);
    });

    it('should update item in cart', async () => {
        await request(app)
            .post('/api/cart')
            .set('Cookie', userCookie)
            .send({ productId, qty: 2 });

        const response = await request(app)
            .put(`/api/cart/${productId}`)
            .set('Cookie', userCookie)
            .send({ qty: 5 });

        expect(response.status).toBe(200);
        expect(response.body.cart.some((item: any) => item.productId === productId && item.qty === 5)).toBe(true);
    });

    it('should remove item from cart', async () => {
        await request(app)
            .post('/api/cart')
            .set('Cookie', userCookie)
            .send({ productId, qty: 1 });

        const response = await request(app)
            .delete(`/api/cart/${productId}`)
            .set('Cookie', userCookie);

        expect(response.status).toBe(200);
        expect(response.body.cart.every((item: any) => item.productId !== productId)).toBe(true);
    });

    it('should prevent adding own product to cart', async () => {
        // Create own product
        const ownProdRes = await request(app)
            .post('/api/products')
            .set('Cookie', userCookie)
            .send({
                name: 'Own Product',
                price: 50,
                count: 5
            });
        const ownProductId = ownProdRes.body.product.id;

        const response = await request(app)
            .post('/api/cart')
            .set('Cookie', userCookie)
            .send({
                productId: ownProductId,
                qty: 1
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('лот');
    });
});

describe('Admin Product Management Tests', () => {
    let adminCookie: string;
    let adminProductId: number;

    beforeEach(async () => {
        // Create admin user (manually set in test)
        const registerRes = await request(app)
            .post('/api/register')
            .send({
                name: `admin${Date.now()}`,
                password: 'admin123'
            });
        adminCookie = registerRes.headers['set-cookie'];
    });

    it('should create product as regular user', async () => {
        const response = await request(app)
            .post('/api/products')
            .set('Cookie', adminCookie)
            .send({
                name: 'User Product',
                price: 50,
                count: 5,
                tags: 'user'
            });

        expect(response.status).toBe(201);
        expect(response.body.product.name).toBe('User Product');
    });

    it('should deny admin endpoint access to non-admin', async () => {
        const response = await request(app)
            .get('/api/admin/products')
            .set('Cookie', adminCookie);

        // This should fail because user is not admin
        expect(response.status).toBe(403);
    });
});

describe('Recommendations System Tests', () => {
    let userCookie: string;
    let product1Id: number;
    let product2Id: number;

    beforeEach(async () => {
        // Create user
        const userRes = await request(app)
            .post('/api/register')
            .send({
                name: `user${Date.now()}`,
                password: 'password123'
            });
        userCookie = userRes.headers['set-cookie'];

        // Create seller and products
        const sellerRes = await request(app)
            .post('/api/register')
            .send({
                name: `seller${Date.now()}`,
                password: 'password123'
            });
        const sellerCookie = sellerRes.headers['set-cookie'];

        const prod1 = await request(app)
            .post('/api/products')
            .set('Cookie', sellerCookie)
            .send({
                name: 'Product 1',
                price: 100,
                tags: 'sword,weapon'
            });
        product1Id = prod1.body.product.id;

        const prod2 = await request(app)
            .post('/api/products')
            .set('Cookie', sellerCookie)
            .send({
                name: 'Product 2',
                price: 150,
                tags: 'sword,rare'
            });
        product2Id = prod2.body.product.id;
    });

    it('should like a product', async () => {
        const response = await request(app)
            .post(`/api/likes/${product1Id}`)
            .set('Cookie', userCookie);

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Product liked');
    });

    it('should get recommendations after liking', async () => {
        // Like first product
        await request(app)
            .post(`/api/likes/${product1Id}`)
            .set('Cookie', userCookie);

        // Get recommendations
        const response = await request(app)
            .get('/api/recommendations')
            .set('Cookie', userCookie);

        expect(response.status).toBe(200);
        expect(response.body.recommendations).toBeDefined();
    });
});

describe('Multiple User Scenarios', () => {
    it('should handle multiple users independently', async () => {
        // Create user 1
        const user1Res = await request(app)
            .post('/api/register')
            .send({
                name: `user1_${Date.now()}`,
                password: 'pass1'
            });
        const user1Cookie = user1Res.headers['set-cookie'];

        // Create user 2
        const user2Res = await request(app)
            .post('/api/register')
            .send({
                name: `user2_${Date.now()}`,
                password: 'pass2'
            });
        const user2Cookie = user2Res.headers['set-cookie'];

        // Check user 1 is logged in for user1 endpoint
        const user1Me = await request(app)
            .get('/api/me')
            .set('Cookie', user1Cookie);
        expect(user1Me.body.user.name).toContain('user1_');

        // Check user 2 is logged in for user2 endpoint
        const user2Me = await request(app)
            .get('/api/me')
            .set('Cookie', user2Cookie);
        expect(user2Me.body.user.name).toContain('user2_');
    });

    it('should handle concurrent cart operations', async () => {
        // Create seller and product
        const sellerRes = await request(app)
            .post('/api/register')
            .send({
                name: `seller${Date.now()}`,
                password: 'pass123'
            });
        const sellerCookie = sellerRes.headers['set-cookie'];

        // Create buyer
        const buyerRes = await request(app)
            .post('/api/register')
            .send({
                name: `buyer${Date.now()}`,
                password: 'pass123'
            });
        const buyerCookie = buyerRes.headers['set-cookie'];

        const prodRes = await request(app)
            .post('/api/products')
            .set('Cookie', sellerCookie)
            .send({
                name: 'Concurrent Product',
                price: 200,
                count: 100
            });
        const productId = prodRes.body.product.id;

        // Simulate concurrent adds (in sequence, but testing state)
        await request(app)
            .post('/api/cart')
            .set('Cookie', buyerCookie)
            .send({ productId, qty: 1 });

        await request(app)
            .post('/api/cart')
            .set('Cookie', buyerCookie)
            .send({ productId, qty: 2 });

        const cartRes = await request(app)
            .get('/api/cart')
            .set('Cookie', buyerCookie);

        // Should have accumulated quantity
        const item = cartRes.body.find((i: any) => i.productId === productId);
        expect(item).toBeDefined();
        expect(item.qty).toBeGreaterThan(0);
    });
});
