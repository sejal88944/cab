const rideModel = require('../models/rideCore.model');
const captainModel = require('../models/captain.model');
const mapService = require('./maps.service');
const crypto = require('crypto');
const { expiresInMinutes } = require('../utils/otp');
const { encryptOtp, hashOtp, verifyOtp } = require('../utils/otpSecure');
const pricingService = require('./pricing.service');

function getOtp(num) {
    return crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
}

function normalizePaymentMethod(pm) {
    const s = String(pm || 'Cash').trim().toLowerCase();
    if (s === 'wallet') return 'WALLET';
    if (s === 'upi') return 'UPI';
    if (s === 'qr') return 'QR';
    return 'Cash';
}
module.exports.normalizePaymentMethod = normalizePaymentMethod;

async function buildFarePayload(pickup, destination) {
    if (!pickup || !destination) throw new Error('Pickup and destination are required');
    const distanceTime = await mapService.getDistanceTime(pickup, destination);
    const distanceKm = distanceTime.distance.value / 1000;
    const rates = await pricingService.getRates();
    const fare = {};
    for (const vt of Object.keys(rates)) {
        const cfg = rates[vt];
        if (!cfg) continue;
        fare[vt] = Math.round(cfg.baseFare + distanceKm * cfg.perKm + cfg.platformFee);
    }
    return {
        distanceKm: Math.round(distanceKm * 100) / 100,
        distanceMeters: distanceTime.distance.value,
        durationSeconds: distanceTime.duration.value,
        durationMinutes: Math.round(distanceTime.duration.value / 60),
        ...fare,
    };
}

module.exports.getFare = async (pickup, destination) => buildFarePayload(pickup, destination);

module.exports.createRide = async ({
    user,
    pickupLocation,
    dropLocation,
    city,
    vehicleType,
    paymentMethod,
    price,
    distanceKm,
    customerName,
    customerPhone,
}) => {
    const plain = getOtp(6);
    const [ otpHash, otpCipher ] = await Promise.all([
        hashOtp(plain),
        Promise.resolve(encryptOtp(plain)),
    ]);
    const ride = await rideModel.create({
        user,
        pickupLocation,
        dropLocation,
        city: city || 'Pune',
        vehicleType: String(vehicleType).toUpperCase(),
        distance: distanceKm || 0,
        price,
        status: 'searching',
        paymentMethod: normalizePaymentMethod(paymentMethod),
        paymentStatus: 'pending',
        otpHash,
        otpCipher,
        otpExpiresAt: expiresInMinutes(5),
        customerName,
        customerPhone,
    });
    return { ride, otpPlain: plain };
};

/** First driver wins — atomic claim while status is searching and no captain. */
module.exports.confirmRide = async ({ rideId, captain }) => {
    const plain = getOtp(6);
    const [ otpHash, otpCipher ] = await Promise.all([
        hashOtp(plain),
        Promise.resolve(encryptOtp(plain)),
    ]);
    const ride = await rideModel.findOneAndUpdate(
        {
            _id: rideId,
            status: 'searching',
            $or: [ { captain: null }, { captain: { $exists: false } } ],
        },
        {
            $set: {
                captain: captain._id,
                status: 'accepted',
                acceptedAt: new Date(),
                otpHash,
                otpCipher,
                otpExpiresAt: expiresInMinutes(5),
            },
        },
        { new: true }
    ).populate('user').populate('captain');

    if (!ride) {
        const exists = await rideModel.findById(rideId);
        if (!exists) throw new Error('Ride not found');
        throw new Error('Ride already assigned or no longer available');
    }
    return ride;
};

module.exports.rejectRide = async ({ rideId, captain }) => {
    const ride = await rideModel.findOne({ _id: rideId, status: 'searching' });
    if (!ride) throw new Error('Ride not found or already assigned');
    await rideModel.updateOne(
        { _id: rideId },
        { $addToSet: { declinedBy: captain._id } }
    );
    return rideModel.findById(rideId).populate('user', 'name phone email').populate('captain');
};

module.exports.markArrived = async ({ rideId, captain }) => {
    const ride = await rideModel.findOneAndUpdate(
        { _id: rideId, captain: captain._id, status: 'accepted' },
        { status: 'arrived', arrivedAt: new Date() },
        { new: true }
    ).populate('user').populate('captain');
    if (!ride) throw new Error('Ride not found / not accepted');
    return ride;
};

module.exports.startRide = async ({ rideId, otp, captain }) => {
    const ride = await rideModel.findOne({ _id: rideId, captain: captain._id })
        .populate('user')
        .populate('captain')
        .select('+otpHash');
    if (!ride) throw new Error('Ride not found');
    if (ride.status !== 'arrived') throw new Error('Driver has not arrived');
    const ok = await verifyOtp(String(otp || '').trim(), ride.otpHash);
    if (!ok) throw new Error('Invalid OTP');
    if (ride.otpExpiresAt && ride.otpExpiresAt < new Date()) throw new Error('OTP expired — ask passenger for new code');
    await rideModel.updateOne({ _id: rideId }, { status: 'started', startedAt: new Date() });
    return rideModel.findById(rideId).populate('user').populate('captain');
};

module.exports.endRide = async ({ rideId, captain }) => {
    const ride = await rideModel.findOne({ _id: rideId, captain: captain._id }).populate('user').populate('captain');
    if (!ride) throw new Error('Ride not found');
    if (ride.status !== 'started') throw new Error('Ride not started');
    await rideModel.updateOne({ _id: rideId }, { status: 'completed', completedAt: new Date() });
    return rideModel.findById(rideId).populate('user').populate('captain');
};

module.exports.rateRide = async ({ rideId, user, rating, comment }) => {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) throw new Error('Rating must be between 1 and 5');
    const ride = await rideModel.findOne({
        _id: rideId,
        user,
        status: 'completed',
        paymentStatus: 'success',
    });
    if (!ride) throw new Error('Ride not found or payment not completed');
    if (ride.rating) throw new Error('Already rated');
    ride.rating = r;
    ride.ratingComment = (comment || '').slice(0, 500);
    await ride.save();
    if (ride.captain) {
        await captainModel.findByIdAndUpdate(ride.captain, { $inc: { ratingSum: r, ratingCount: 1 } });
    }
    return ride;
};
