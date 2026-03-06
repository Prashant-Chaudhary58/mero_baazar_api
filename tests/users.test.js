const request = require('supertest');
const app = require('../app');
const setup = require('./setup');
const User = require('../models/user_model');
const mongoose = require('mongoose');

let userToken, otherUserToken;
let userId, otherUserId;

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    // jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.JWT_SECRET = 'user_secret_test';
    process.env.JWT_EXPIRE = '30d';
    await setup.connect();
});

afterAll(async () => {
    console.log.mockRestore();
    // console.error.mockRestore();
    await setup.closeDatabase();
});

beforeEach(async () => {
    await setup.clearDatabase();

    // Create main testing user
    const user = await User.create({
        fullName: 'Test User', phone: '9811111111', password: 'password', role: 'buyer', city: 'Kathmandu'
    });
    userToken = user.getSignedJwtToken();
    userId = user._id;

    // Create secondary user for authorization checks
    const otherUser = await User.create({
        fullName: 'Other User', phone: '9822222222', password: 'password', role: 'buyer'
    });
    otherUserToken = otherUser.getSignedJwtToken();
    otherUserId = otherUser._id;
});

describe('User API Endpoints', () => {

    describe('PUT /api/v1/users/:id', () => {
        it('should allow a user to update their own details', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    fullName: 'Updated Name',
                    city: 'Pokhara',
                    address: 'Lake Side'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.fullName).toBe('Updated Name');
            expect(res.body.data.city).toBe('Pokhara');
            expect(res.body.data.address).toBe('Lake Side');
        });

        it('should NOT allow a user to update another user\'s profile', async () => {
            // "otherUser" tries to update "user" Profile
            const res = await request(app)
                .put(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send({ fullName: 'Malicious Update' });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Not authorized to update this user');
        });

        it('should fail if no token is provided', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${userId}`)
                .send({ fullName: 'Anonymous Update' });

            expect(res.statusCode).toBe(401);
        });

        it('should ignore attempts to update protected fields like role or password directly via this route', async () => {
            // Note: In controller `updateUserDetails`, it explicitly maps over specific safe fields.
            // If they pass 'role', it should be ignored.
            const res = await request(app)
                .put(`/api/v1/users/${userId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: 'admin' });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.role).toBe('buyer'); // Still a buyer
        });
    });

});
