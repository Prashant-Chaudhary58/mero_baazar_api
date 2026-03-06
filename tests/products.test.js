const request = require('supertest');
const app = require('../app');
const setup = require('./setup');
const User = require('../models/user_model');
const Product = require('../models/product_model');
const mongoose = require('mongoose');

let buyerToken, seller1Token, seller2Token, adminToken;
let seller1Id, seller2Id;
let product1Id, product2Id;

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.JWT_SECRET = 'product_secret_test';
    process.env.JWT_EXPIRE = '30d';
    await setup.connect();
});

afterAll(async () => {
    console.log.mockRestore();
    console.error.mockRestore();
    await setup.closeDatabase();
});

beforeEach(async () => {
    await setup.clearDatabase();

    // Create a buyer
    const buyer = await User.create({
        fullName: 'Buyer Bob', phone: '9800000001', password: 'password123', role: 'buyer'
    });
    buyerToken = buyer.getSignedJwtToken();

    // Create seller 1
    const seller1 = await User.create({
        fullName: 'Seller Sam', phone: '9800000002', password: 'password123', role: 'seller'
    });
    seller1Token = seller1.getSignedJwtToken();
    seller1Id = seller1._id;

    // Create seller 2
    const seller2 = await User.create({
        fullName: 'Seller Sally', phone: '9800000003', password: 'password123', role: 'seller'
    });
    seller2Token = seller2.getSignedJwtToken();
    seller2Id = seller2._id;

    // Create admin
    const admin = await User.create({
        fullName: 'Admin Alex', phone: '9800000004', password: 'password123', role: 'admin'
    });
    adminToken = admin.getSignedJwtToken();

    // Create Initial Products
    const p1 = await Product.create({
        name: 'Fresh Tomatoes', description: 'Red and juicy', price: 100, quantity: '10kg', category: 'Vegetables', seller: seller1Id, isVerified: true
    });
    product1Id = p1._id;

    const p2 = await Product.create({
        name: 'Organic Apples', description: 'Sweet apples', price: 200, quantity: '5kg', category: 'Fruits', seller: seller2Id, isVerified: true
    });
    product2Id = p2._id;
});

describe('Product API Endpoints', () => {

    describe('GET /api/v1/products', () => {
        it('should get all verified products', async () => {
             const res = await request(app).get('/api/v1/products');
             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(true);
             expect(res.body.count).toBe(2);
             expect(res.body.data.length).toBe(2);
        });
    });

    describe('GET /api/v1/products/:id', () => {
        it('should get a single product by valid ID', async () => {
             const res = await request(app).get(`/api/v1/products/${product1Id}`);
             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(true);
             expect(res.body.data.name).toBe('Fresh Tomatoes');
        });

        it('should return 404 for a non-existent product ID', async () => {
             const fakeId = new mongoose.Types.ObjectId();
             const res = await request(app).get(`/api/v1/products/${fakeId}`);
             expect(res.statusCode).toBe(404);
             expect(res.body.success).toBe(false);
        });

        it('should return 400 for a malformed product ID', async () => {
             const res = await request(app).get(`/api/v1/products/invalid-id-format`);
             expect(res.statusCode).toBe(400);
             expect(res.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/products', () => {
        const newProduct = {
            name: 'Carrots', description: 'Crunchy orange carrots', price: 50, quantity: '2kg', category: 'Vegetables'
        };

        it('should allow a seller to create a product', async () => {
             const res = await request(app)
                 .post('/api/v1/products')
                 .set('Authorization', `Bearer ${seller1Token}`)
                 .send(newProduct);
             
             expect(res.statusCode).toBe(201);
             expect(res.body.success).toBe(true);
             expect(res.body.data.name).toBe('Carrots');
             expect(res.body.data.seller.toString()).toBe(seller1Id.toString());
        });

        it('should NOT allow a buyer to create a product', async () => {
             const res = await request(app)
                 .post('/api/v1/products')
                 .set('Authorization', `Bearer ${buyerToken}`)
                 .send(newProduct);
             
             expect(res.statusCode).toBe(403);
             expect(res.body.success).toBe(false);
             expect(res.body.error).toContain('User role buyer is not authorized');
        });

        it('should fail if required fields are missing', async () => {
             const res = await request(app)
                 .post('/api/v1/products')
                 .set('Authorization', `Bearer ${seller1Token}`)
                 .send({ name: 'Carrots' }); // Missing price, category, etc
             
             expect(res.statusCode).toBe(400);
             expect(res.body.success).toBe(false);
        });

        it('should fail if no token is provided', async () => {
             const res = await request(app)
                 .post('/api/v1/products')
                 .send(newProduct);
             
             expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/v1/products/my-products', () => {
        it('should return products belonging only to the logged-in seller', async () => {
             const res = await request(app)
                 .get('/api/v1/products/my-products')
                 .set('Authorization', `Bearer ${seller1Token}`);
             
             expect(res.statusCode).toBe(200);
             expect(res.body.count).toBe(1);
             expect(res.body.data[0].name).toBe('Fresh Tomatoes');
        });

        it('should reject a buyer trying to access seller products route', async () => {
             const res = await request(app)
                 .get('/api/v1/products/my-products')
                 .set('Authorization', `Bearer ${buyerToken}`);
             
             expect(res.statusCode).toBe(403);
             expect(res.body.success).toBe(false);
        });
    });

    describe('PUT /api/v1/products/:id', () => {
        it('should allow the owner/seller to update their own product', async () => {
             const res = await request(app)
                 .put(`/api/v1/products/${product1Id}`)
                 .set('Authorization', `Bearer ${seller1Token}`)
                 .send({ price: 150 });
             
             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(true);
             expect(res.body.data.price).toBe(150);
        });

        it('should allow an admin to update any product', async () => {
             const res = await request(app)
                 .put(`/api/v1/products/${product1Id}`)
                 .set('Authorization', `Bearer ${adminToken}`)
                 .send({ name: 'Admin Edited Tomato' });
             
             expect(res.statusCode).toBe(200);
             expect(res.body.data.name).toBe('Admin Edited Tomato');
        });

        it('should NOT allow a seller to update another seller\'s product', async () => {
             const res = await request(app)
                 .put(`/api/v1/products/${product1Id}`)
                 .set('Authorization', `Bearer ${seller2Token}`) // seller2 trying to edit seller1's product
                 .send({ price: 999 });
             
             expect(res.statusCode).toBe(401); // Or 403 depending on implementation
             expect(res.body.success).toBe(false);
        });
    });

    describe('DELETE /api/v1/products/:id', () => {
        it('should allow the owner/seller to delete their product', async () => {
             const res = await request(app)
                 .delete(`/api/v1/products/${product1Id}`)
                 .set('Authorization', `Bearer ${seller1Token}`);
             
             expect(res.statusCode).toBe(200);
             expect(res.body.success).toBe(true);

             const check = await Product.findById(product1Id);
             expect(check).toBeNull();
        });

        it('should allow an admin to delete any product', async () => {
             const res = await request(app)
                 .delete(`/api/v1/products/${product1Id}`)
                 .set('Authorization', `Bearer ${adminToken}`);
             
             expect(res.statusCode).toBe(200);
        });

        it('should NOT allow a seller to delete another seller\'s product', async () => {
             const res = await request(app)
                 .delete(`/api/v1/products/${product1Id}`)
                 .set('Authorization', `Bearer ${seller2Token}`);
             
             expect(res.statusCode).toBe(401);
             
             const check = await Product.findById(product1Id);
             expect(check).toBeDefined(); // Still exists
        });
    });
});
