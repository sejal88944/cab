const mongoose = require('mongoose');

/** Singleton-style config for admin-editable fare multipliers (per vehicle type). */
const pricingSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true },
    rates: {
        BIKE: { baseFare: Number, perKm: Number, platformFee: Number },
        AUTO: { baseFare: Number, perKm: Number, platformFee: Number },
        MINI: { baseFare: Number, perKm: Number, platformFee: Number },
        CAR: { baseFare: Number, perKm: Number, platformFee: Number },
        SEDAN: { baseFare: Number, perKm: Number, platformFee: Number },
    },
}, { timestamps: true });

module.exports = mongoose.model('Pricing', pricingSchema);
