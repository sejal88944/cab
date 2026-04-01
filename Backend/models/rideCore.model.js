const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    captain: { type: mongoose.Schema.Types.ObjectId, ref: 'captain', default: null },
    declinedBy: { type: [ { type: mongoose.Schema.Types.ObjectId, ref: 'captain' } ], default: [] },

    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },

    pickup: {
        type: { type: String, enum: [ 'Point' ], default: 'Point' },
        coordinates: { type: [ Number ] }, // [lng, lat]
    },
    drop: {
        type: { type: String, enum: [ 'Point' ], default: 'Point' },
        coordinates: { type: [ Number ] }, // [lng, lat]
    },

    city: { type: String, enum: [ 'Pune', 'Kolhapur' ], required: true },
    vehicleType: { type: String, enum: [ 'BIKE', 'AUTO', 'MINI', 'CAR', 'SEDAN' ], required: true },
    distance: { type: Number, required: true }, // km
    price: { type: Number, required: true },

    status: {
        type: String,
        enum: [ 'searching', 'accepted', 'arrived', 'started', 'completed', 'cancelled' ],
        default: 'searching',
    },

    paymentMethod: { type: String, enum: [ 'UPI', 'QR', 'Cash', 'WALLET' ], required: true },
    paymentStatus: { type: String, enum: [ 'pending', 'success', 'failed' ], default: 'pending' },
    duration: { type: Number }, // seconds

    /** bcrypt hash — verify only */
    otpHash: { type: String, select: false },
    /** AES-GCM ciphertext — passenger OTP display via HTTPS only */
    otpCipher: { type: String, select: false },
    otpExpiresAt: { type: Date },
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: { type: String, maxlength: 500 },
    captainNetEarning: { type: Number },
    platformFee: { type: Number },
    customerName: { type: String },
    customerPhone: { type: String },
}, { timestamps: true });

rideSchema.index({ pickup: '2dsphere' });

module.exports = mongoose.model('ride', rideSchema);

