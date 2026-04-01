const mongoose = require('mongoose');

async function connectToDb() {
    // Use IPv4 by default to avoid Windows ::1 connection issues
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rideeasy';
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected ✅');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
}

module.exports = connectToDb;

