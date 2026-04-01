const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const captainSchema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 2 },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    socketId: { type: String },
    vehicleType: { type: String, required: true, enum: [ 'BIKE', 'AUTO', 'MINI', 'CAR', 'SEDAN' ] },
    vehicleNumber: { type: String, required: true, minlength: 3 },
    license: { type: String, required: true, minlength: 5 },
    city: { type: String, required: true, enum: [ 'Pune', 'Kolhapur' ], default: 'Pune' },
    status: { type: String, enum: [ 'active', 'inactive' ], default: 'inactive' }, // online/offline
    approved: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    subscriptionStatus: { type: String, enum: [ 'active', 'expired', 'none' ], default: 'none' },
    /** weekly | monthly | yearly — last purchased plan */
    subscriptionPlan: { type: String, default: null },
    subscriptionStartedAt: { type: Date },
    subscriptionExpiresAt: { type: Date },
    location: {
        type: { type: String, enum: [ 'Point' ], default: 'Point' },
        coordinates: { type: [ Number ], default: [ 0, 0 ] }, // [lng, lat]
    },
    lastLocationUpdatedAt: { type: Date },
    walletBalance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    loginOtp: { type: String, select: false },
    loginOtpExpiresAt: { type: Date, select: false },
}, { timestamps: true, collection: 'drivers' });

captainSchema.index({ location: '2dsphere' });

captainSchema.virtual('averageRating').get(function () {
    if (!this.ratingCount) return 0;
    return Math.round((this.ratingSum / this.ratingCount) * 10) / 10;
});
captainSchema.set('toJSON', { virtuals: true });
captainSchema.set('toObject', { virtuals: true });

captainSchema.methods.generateAuthToken = function () {
    return jwt.sign({ _id: this._id, role: 'captain' }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

captainSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

captainSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model('captain', captainSchema);