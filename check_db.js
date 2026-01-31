const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: './config/config.env' });

const checkCollections = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:');
        collections.forEach(c => console.log(' - ' + c.name));

        // Count docs
        const buyerCount = await mongoose.connection.db.collection('buyers').countDocuments();
        const farmerCount = await mongoose.connection.db.collection('farmers').countDocuments();
        const userCount = await mongoose.connection.db.collection('users').countDocuments();

        console.log(`Buyers count: ${buyerCount}`);
        console.log(`Farmers count: ${farmerCount}`);
        console.log(`Users count: ${userCount}`);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkCollections();
