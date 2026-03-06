const request = require('supertest');
const app = require('../app');
const setup = require('./setup');
const User = require('../models/user_model');
const Product = require('../models/product_model');
const Review = require('../models/review_model');

let buyer1Token, buyer2Token, sellerToken, adminToken;
let buyer1Id, buyer2Id;
let productId1, productId2;
let review1Id;

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.JWT_SECRET = 'review_secret_test';
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

    // Users
    const buyer1 = await User.create({ fullName: 'Buyer One', phone: '9811111111', password: 'password', role: 'buyer' });
    buyer1Token = buyer1.getSignedJwtToken();
    buyer1Id = buyer1._id;

    const buyer2 = await User.create({ fullName: 'Buyer Two', phone: '9822222222', password: 'password', role: 'buyer' });
    buyer2Token = buyer2.getSignedJwtToken();
    buyer2Id = buyer2._id;

    const seller = await User.create({ fullName: 'Seller', phone: '9833333333', password: 'password', role: 'seller' });
    sellerToken = seller.getSignedJwtToken();

    const admin = await User.create({ fullName: 'Admin', phone: '9844444444', password: 'password', role: 'admin' });
    adminToken = admin.getSignedJwtToken();

    // Products
    const p1 = await Product.create({ name: 'Apples', description: 'Fresh', price: 100, quantity: '1kg', category: 'Fruits', seller: seller._id, isVerified: true });
    productId1 = p1._id;

    const p2 = await Product.create({ name: 'Carrots', description: 'Fresh', price: 50, quantity: '1kg', category: 'Vegetables', seller: seller._id, isVerified: true });
    productId2 = p2._id;

    // Initial Review by Buyer 1 on Product 1
    const r1 = await Review.create({
        rating: 4,
        title: 'Great fruit',
        text: 'Good apples',
        product: productId1,
        user: buyer1Id
    });
    review1Id = r1._id;
});

describe('Review API Endpoints', () => {
    describe('GET /api/v1/reviews', () => {
        it('should get all reviews across all products', async () => {
            const res = await request(app).get('/api/v1/reviews');
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].text).toBe('Good apples');
        });
    });

    describe('GET /api/v1/products/:productId/reviews', () => {
        it('should get reviews for a specific product', async () => {
            const res = await request(app).get(`/api/v1/products/${productId1}/reviews`);
            expect(res.statusCode).toBe(200);
            expect(res.body.count).toBe(1);
            expect(res.body.data[0].text).toBe('Good apples');
        });

        it('should return empty for a product with no reviews', async () => {
            const res = await request(app).get(`/api/v1/products/${productId2}/reviews`);
            expect(res.statusCode).toBe(200);
            expect(res.body.count).toBe(0);
        });
    });

    describe('GET /api/v1/reviews/:id', () => {
        it('should get a single review by valid ID', async () => {
            const res = await request(app).get(`/api/v1/reviews/${review1Id}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.data.rating).toBe(4);
        });

        it('should return 404 for invalid review ID', async () => {
            const fakeId = '111111111111111111111111'; // 24 hex char fake ObjectId
            const res = await request(app).get(`/api/v1/reviews/${fakeId}`);
            expect(res.statusCode).toBe(404);
        });
    });

    describe('POST /api/v1/products/:productId/reviews', () => {
        it('should allow a buyer to add a review', async () => {
            const res = await request(app)
                .post(`/api/v1/products/${productId1}/reviews`)
                .set('Authorization', `Bearer ${buyer2Token}`)
                .send({
                    rating: 5,
                    title: 'Excellent',
                    text: 'Excellent apples'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.rating).toBe(5);
        });

        it('should NOT allow a seller to add a review', async () => {
            const res = await request(app)
                .post(`/api/v1/products/${productId1}/reviews`)
                .set('Authorization', `Bearer ${sellerToken}`)
                .send({ rating: 5, title: 'Invalid', text: 'I am the seller' });

            // Seller cannot review
            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should update the review instead of failing if a buyer submits two reviews for the same product', async () => {
            // Buyer 1 already reviewed Product 1 in beforeEach
            const res = await request(app)
                .post(`/api/v1/products/${productId1}/reviews`)
                .set('Authorization', `Bearer ${buyer1Token}`)
                .send({ rating: 3, title: 'Changed', text: 'Changing my mind' });

            expect(res.statusCode).toBe(200); // Controller updates existing reviews
            expect(res.body.success).toBe(true);
            expect(res.body.data.rating).toBe(3);
        });
    });

    describe('PUT /api/v1/reviews/:id', () => {
        it('should allow the review author to update it', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${review1Id}`)
                .set('Authorization', `Bearer ${buyer1Token}`)
                .send({ rating: 2, title: 'Bad', text: 'Actually they are bad' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.rating).toBe(2);
            expect(res.body.data.text).toBe('Actually they are bad');
        });

        it('should NOT allow another buyer to update someone else\'s review', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${review1Id}`)
                .set('Authorization', `Bearer ${buyer2Token}`) // Buyer 2 trying to edit Buyer 1's review
                .send({ rating: 1 });

            expect(res.statusCode).toBe(401); 
        });

        it('should allow an admin to update any review', async () => {
            const res = await request(app)
                .put(`/api/v1/reviews/${review1Id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Moderated', text: 'Moderated by Admin' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.text).toBe('Moderated by Admin');
        });
    });

    describe('DELETE /api/v1/reviews/:id', () => {
        it('should allow the review author to delete it', async () => {
            const res = await request(app)
                .delete(`/api/v1/reviews/${review1Id}`)
                .set('Authorization', `Bearer ${buyer1Token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const check = await Review.findById(review1Id);
            expect(check).toBeNull();
        });

        it('should NOT allow another buyer to delete someone else\'s review', async () => {
            const res = await request(app)
                .delete(`/api/v1/reviews/${review1Id}`)
                .set('Authorization', `Bearer ${buyer2Token}`);

            expect(res.statusCode).toBe(401);
            
            const check = await Review.findById(review1Id);
            expect(check).toBeDefined(); // Still exists
        });

        it('should allow an admin to delete any review', async () => {
            const res = await request(app)
                .delete(`/api/v1/reviews/${review1Id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
        });
    });
});
