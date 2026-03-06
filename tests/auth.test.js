const request = require('supertest');
const app = require('../app');
const setup = require('./setup');
const User = require('../models/user_model');
const Otp = require('../models/otp_model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

beforeAll(async () => {
    // Avoid console errors cluttering test outputs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.JWT_SECRET = 'testsecret123';
    process.env.JWT_EXPIRE = '30d';
    process.env.JWT_COOKIE_EXPIRE = '30';
    await setup.connect();
});

afterEach(async () => {
    await setup.clearDatabase();
});

afterAll(async () => {
    console.log.mockRestore();
    console.error.mockRestore();
    await setup.closeDatabase();
});

describe('Auth API Endpoints', () => {
    
    describe('POST /api/v1/auth/register', () => {
        it('should successfully register a new user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    fullName: 'Test User',
                    phone: '9841000000',
                    password: 'password123',
                    role: 'buyer'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();

            const user = await User.findOne({ phone: '9841000000' });
            expect(user).toBeTruthy();
            expect(user.fullName).toBe('Test User');
        });

        it('should fail if required fields are missing', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    fullName: 'Test User'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toContain('Please add a phone number');
        });

        it('should fail if phone is duplicate', async () => {
            await User.create({
                fullName: 'Existing', phone: '9841000000', password: 'password123'
            });

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    fullName: 'Test User',
                    phone: '9841000000',
                    password: 'securepass'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should hash the password before saving', async () => {
            await request(app)
                .post('/api/v1/auth/register')
                .send({
                    fullName: 'Test User', phone: '9841112222', password: 'password123'
                });

            const user = await User.findOne({ phone: '9841112222' }).select('+password');
            expect(user.password).not.toBe('password123'); // Should be hashed
            const isMatch = await bcrypt.compare('password123', user.password);
            expect(isMatch).toBe(true);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            await User.create({
                fullName: 'Login User', phone: '9841223344', password: 'password123'
            });
        });

        it('should login an existing user', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    phone: '9841223344',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
        });

        it('should fail with invalid credentials', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    phone: '9841223344',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should fail with non-existent phone', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    phone: '9999999999',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should fail if phone and password are not arrayed', async () => {
             const res = await request(app)
                 .post('/api/v1/auth/login')
                 .send({ phone: '9841223344' }); // Missing PW
             
             expect(res.statusCode).toBe(400);
             expect(res.body.success).toBe(false);
             expect(res.body.error).toBe('Please provide phone and password');
        });
    });

    describe('GET /api/v1/auth/me', () => {
        let token;
        beforeEach(async () => {
            const user = await User.create({
                fullName: 'Me User', phone: '9841334455', password: 'password123', role: 'buyer'
            });
            token = user.getSignedJwtToken();
        });

        it('should return user details with a valid token', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.fullName).toBe('Me User');
        });

        it('should fail without a token', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me');

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error).toBe('Not authorized to access this route');
        });
    });

    describe('OTP and Password Reset Flow', () => {
        let user;
        beforeEach(async () => {
            user = await User.create({
                fullName: 'Reset User', phone: '9841998877', password: 'password123', role: 'buyer'
            });
        });

        describe('POST /api/v1/auth/send-otp', () => {
            it('should successfully generate and save an OTP for a valid phone', async () => {
                const res = await request(app)
                    .post('/api/v1/auth/send-otp')
                    .send({ phone: '9841998877' });
                
                expect(res.statusCode).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.message).toBe('OTP sent to phone');

                const otpRecord = await Otp.findOne({ phone: '9841998877' });
                expect(otpRecord).toBeTruthy();
                expect(otpRecord.otp).toBeDefined();
            });

            it('should fail if phone number is not registered', async () => {
                const res = await request(app)
                    .post('/api/v1/auth/send-otp')
                    .send({ phone: '9999999999' });

                expect(res.statusCode).toBe(404);
                expect(res.body.success).toBe(false);
                expect(res.body.error).toBe('No user found with this phone number');
            });
        });

        describe('POST /api/v1/auth/verify-otp-reset', () => {
            beforeEach(async () => {
                await Otp.create({ phone: '9841998877', otp: '123456' });
            });

            it('should return a resetToken for a valid OTP', async () => {
                const res = await request(app)
                    .post('/api/v1/auth/verify-otp-reset')
                    .send({ phone: '9841998877', otp: '123456' });

                expect(res.statusCode).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data.resetToken).toBeDefined();

                // OTP should be deleted after successful verification
                const otpRecord = await Otp.findOne({ phone: '9841998877' });
                expect(otpRecord).toBeNull();
            });

            it('should fail with an invalid OTP', async () => {
                const res = await request(app)
                    .post('/api/v1/auth/verify-otp-reset')
                    .send({ phone: '9841998877', otp: '654321' });

                expect(res.statusCode).toBe(400);
                expect(res.body.success).toBe(false);
                expect(res.body.error).toBe('Invalid or expired OTP');
            });

            it('should fail if OTP does not exist', async () => {
                const res = await request(app)
                    .post('/api/v1/auth/verify-otp-reset')
                    .send({ phone: '1111111111', otp: '123456' });

                expect(res.statusCode).toBe(400);
                expect(res.body.success).toBe(false);
            });
        });

        describe('PUT /api/v1/auth/reset-password', () => {
            let resetToken;
            beforeEach(async () => {
                // Generate a token mathematically identical to the controller behavior
                resetToken = crypto.randomBytes(20).toString("hex");
                const resetPasswordToken = crypto
                    .createHash("sha256")
                    .update(resetToken)
                    .digest("hex");
                
                await User.findByIdAndUpdate(user._id, {
                    resetPasswordToken,
                    resetPasswordExpire: Date.now() + 10 * 60 * 1000
                });
            });

            it('should successfully reset the password with a valid token', async () => {
                const res = await request(app)
                    .put('/api/v1/auth/reset-password')
                    .send({
                        resetToken,
                        password: 'newpassword456'
                    });

                expect(res.statusCode).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.token).toBeDefined();

                // Verify the hash actually updated
                const updatedUser = await User.findById(user._id).select('+password');
                const isMatch = await bcrypt.compare('newpassword456', updatedUser.password);
                expect(isMatch).toBe(true);
            });

            it('should fail with an invalid token', async () => {
                const res = await request(app)
                    .put('/api/v1/auth/reset-password')
                    .send({
                        resetToken: 'invalidtoken',
                        password: 'newpassword456'
                    });

                expect(res.statusCode).toBe(400);
                expect(res.body.success).toBe(false);
                expect(res.body.error).toBe('Invalid token or token has expired');
            });

            it('should fail with an expired token', async () => {
                 await User.findByIdAndUpdate(user._id, {
                    resetPasswordExpire: Date.now() - 1000 // Expired
                });

                const res = await request(app)
                    .put('/api/v1/auth/reset-password')
                    .send({
                        resetToken,
                        password: 'newpassword456'
                    });

                expect(res.statusCode).toBe(400);
                expect(res.body.success).toBe(false);
            });
        });
    });
    
    // Total Auth tests: 17
});
