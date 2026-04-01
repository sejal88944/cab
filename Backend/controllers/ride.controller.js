const rideService = require('../services/rideCore.service');
const { validationResult } = require('express-validator');
const mapService = require('../services/maps.service');
const rideModel = require('../models/rideCore.model');
const captainModel = require('../models/captain.model');
const userModel = require('../models/user.model');
const { decryptOtp } = require('../utils/otpSecure');

const { emitToUser, emitToCaptain } = require('../socket');

const RIDE_SEARCH_RADIUS_M = 5000;

function userIdOf(u) {
    if (!u) return null;
    return u._id ? u._id.toString() : u.toString();
}

/** Strip OTP material from ride objects sent over sockets or generic JSON. */
function publicRide(ride) {
    if (!ride) return ride;
    const o = ride.toObject ? ride.toObject({ virtuals: true }) : { ...ride };
    delete o.otpHash;
    delete o.otpCipher;
    delete o.otp;
    return o;
}

async function findNearbyDriverIds({ rideCity, vehicleType, pickupLng, pickupLat }) {
    if (pickupLng == null || pickupLat == null) return [];
    const drivers = await captainModel
        .find({
            approved: true,
            blocked: { $ne: true },
            status: 'active',
            subscriptionStatus: 'active',
            city: rideCity,
            vehicleType,
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [ pickupLng, pickupLat ] },
                    $maxDistance: RIDE_SEARCH_RADIUS_M,
                },
            },
        })
        .limit(40)
        .select('_id');
    return drivers.map((d) => d._id.toString());
}

/** When no one is within 5km (GPS mismatch / dev), still notify online drivers in same city + vehicle type. */
async function findCityFallbackDriverIds({ rideCity, vehicleType }) {
    const drivers = await captainModel
        .find({
            approved: true,
            blocked: { $ne: true },
            status: 'active',
            subscriptionStatus: 'active',
            city: rideCity,
            vehicleType,
        })
        .limit(40)
        .select('_id');
    return drivers.map((d) => d._id.toString());
}

function broadcastRideNew(rideDoc, driverIds) {
    const payload = publicRide(rideDoc);
    for (const id of driverIds) {
        emitToCaptain(id, 'ride:new', payload);
    }
}

module.exports.createRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        pickupLocation,
        dropLocation,
        city,
        vehicleType,
        paymentMethod,
        price,
        distanceKm,
        customerName,
        customerPhone,
    } = req.body;

    const rideCity = city || req.user?.city || 'Pune';

    try {
        const { ride, otpPlain } = await rideService.createRide({
            user: req.user._id,
            pickupLocation,
            dropLocation,
            city: rideCity,
            vehicleType: vehicleType || req.body.vehicleType,
            paymentMethod,
            price,
            distanceKm,
            customerName: customerName || req.user.name,
            customerPhone: customerPhone || req.user.phone,
        });

        const pickupCoordinates = await mapService.getAddressCoordinate(pickupLocation);
        const dropCoordinates = await mapService.getAddressCoordinate(dropLocation);
        await rideModel.updateOne(
            { _id: ride._id },
            {
                pickup: { type: 'Point', coordinates: [ pickupCoordinates.lng, pickupCoordinates.lat ] },
                drop: { type: 'Point', coordinates: [ dropCoordinates.lng, dropCoordinates.lat ] },
            }
        );

        const uid = userIdOf(req.user);
        emitToUser(uid, 'ride:status-update', {
            rideId: ride._id,
            status: 'searching',
        });

        const populated = await rideModel.findById(ride._id).populate('user').populate('captain');
        let driverIds = await findNearbyDriverIds({
            rideCity,
            vehicleType: populated.vehicleType,
            pickupLng: pickupCoordinates.lng,
            pickupLat: pickupCoordinates.lat,
        });
        if (!driverIds.length) {
            driverIds = await findCityFallbackDriverIds({
                rideCity,
                vehicleType: populated.vehicleType,
            });
        }
        broadcastRideNew(populated, driverIds);

        return res.status(201).json({
            ...publicRide(populated),
            otp: otpPlain,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.retryAssign = async (req, res) => {
    const rideId = req.params.id;
    try {
        const ride = await rideModel.findById(rideId).populate('user').populate('captain');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        const ownerId = ride.user?._id || ride.user;
        if (!ownerId || !ownerId.equals(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
        if (ride.status !== 'searching') return res.status(200).json(publicRide(ride));

        const pickupLng = ride.pickup?.coordinates?.[0];
        const pickupLat = ride.pickup?.coordinates?.[1];
        if (pickupLng == null || pickupLat == null) {
            return res.status(400).json({ message: 'Pickup coordinates missing' });
        }

        const hasCaptain = ride.captain && String(ride.captain._id || ride.captain) !== '';
        if (hasCaptain) return res.status(200).json(publicRide(ride));

        let driverIds = await findNearbyDriverIds({
            rideCity: ride.city,
            vehicleType: ride.vehicleType,
            pickupLng,
            pickupLat,
        });
        if (!driverIds.length) {
            driverIds = await findCityFallbackDriverIds({
                rideCity: ride.city,
                vehicleType: ride.vehicleType,
            });
        }
        broadcastRideNew(ride, driverIds);
        return res.status(200).json(publicRide(ride));
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getFare = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const pickup = (req.query.pickup || req.query.pickupLocation || '').toString().trim();
    const destination = (req.query.destination || req.query.dropLocation || '').toString().trim();

    if (!pickup || !destination) {
        return res.status(400).json({ message: 'Pickup and destination are required' });
    }

    try {
        const fare = await rideService.getFare(pickup, destination);
        return res.status(200).json(fare);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

function notifyPassengerAccepted(ride) {
    const uid = userIdOf(ride.user);
    if (!uid) return;
    emitToUser(uid, 'ride:accepted', publicRide(ride));
    emitToUser(uid, 'ride:status-update', {
        rideId: ride._id,
        status: 'accepted',
    });
}

module.exports.confirmRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });
        const full = await rideModel.findById(ride._id).populate('user').populate('captain');
        notifyPassengerAccepted(full);
        return res.status(200).json(publicRide(full));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};

module.exports.arriveRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;
    try {
        const ride = await rideService.markArrived({ rideId, captain: req.captain });
        const uid = userIdOf(ride.user);
        if (uid) {
            emitToUser(uid, 'ride:status-update', { rideId: ride._id, status: ride.status });
        }
        return res.status(200).json(publicRide(ride));
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.acceptRide = async (req, res) => {
    const rideId = req.params.id;
    if (!rideId) {
        return res.status(400).json({ message: 'Ride id is required' });
    }

    try {
        const ride = await rideService.confirmRide({ rideId, captain: req.captain });
        const full = await rideModel.findById(ride._id).populate('user').populate('captain');
        notifyPassengerAccepted(full);
        return res.status(200).json(publicRide(full));
    } catch (err) {
        console.error(err);
        const code = err.message?.includes('already assigned') ? 409 : 400;
        return res.status(code).json({ message: err.message });
    }
};

module.exports.rejectRide = async (req, res) => {
    const rideId = req.params.id;
    if (!rideId) return res.status(400).json({ message: 'Ride id is required' });
    try {
        const ride = await rideService.rejectRide({ rideId, captain: req.captain });
        const uid = userIdOf(ride.user);
        if (uid) {
            emitToUser(uid, 'ride:status-update', {
                rideId: ride._id,
                status: 'searching',
                captainUnassigned: true,
                message: 'A driver declined — still searching',
            });
        }
        return res.status(200).json(publicRide(ride));
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

module.exports.getRideById = async (req, res) => {
    const rideId = req.params.id;
    if (!rideId) {
        return res.status(400).json({ message: 'Ride id is required' });
    }

    try {
        const ride = await rideModel
            .findById(rideId)
            .populate('user', 'name phone email walletBalance')
            .populate('captain');

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        if (!ride.user?._id || !req.user?._id || !ride.user._id.equals(req.user._id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        return res.status(200).json(publicRide(ride));
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/** Passenger-only: OTP never emitted on sockets. */
module.exports.getPassengerOtp = async (req, res) => {
    const rideId = req.params.id;
    try {
        const ride = await rideModel.findOne({ _id: rideId, user: req.user._id }).select('+otpCipher');
        if (!ride) return res.status(404).json({ message: 'Ride not found' });
        if (![ 'searching', 'accepted', 'arrived' ].includes(ride.status)) {
            return res.status(400).json({ message: 'OTP not available for this ride state' });
        }
        const otp = decryptOtp(ride.otpCipher);
        if (!otp) return res.status(500).json({ message: 'OTP unavailable' });
        return res.json({ otp, expiresAt: ride.otpExpiresAt });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.startRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId, otp } = req.query;

    try {
        const ride = await rideService.startRide({ rideId, otp, captain: req.captain });
        const uid = userIdOf(ride.user);
        if (uid) {
            emitToUser(uid, 'ride:status-update', { rideId: ride._id, status: 'started' });
        }
        return res.status(200).json(publicRide(ride));
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

async function findPendingRidesForCaptain(cap, captainId) {
    // Prevent "ghost popups": ignore old searching rides that were never completed/cancelled.
    // (These remain in DB from previous tests and make driver panel show popups even when user didn't create a ride now.)
    const maxAgeMin = Number(process.env.PENDING_RIDE_MAX_AGE_MIN || 5);
    const createdAfter = new Date(Date.now() - maxAgeMin * 60 * 1000);
    const base = {
        status: 'searching',
        city: cap.city,
        vehicleType: cap.vehicleType,
        createdAt: { $gte: createdAfter },
        declinedBy: { $nin: [ captainId ] },
        $or: [ { captain: null }, { captain: { $exists: false } } ],
    };

    const coords = cap.location?.coordinates;
    const [ lng, lat ] = coords && coords.length >= 2 ? coords : [ null, null ];
    const hasRealGps = Number.isFinite(lat) && Number.isFinite(lng)
        && !(Math.abs(lat) < 0.02 && Math.abs(lng) < 0.02);

    const q = async (filter) => rideModel
        .find(filter)
        .populate('user', 'name phone email')
        .sort({ createdAt: -1 })
        .limit(20);

    if (!hasRealGps) {
        return q(base);
    }

    const geoFilter = {
        $and: [
            base,
            { 'pickup.coordinates.0': { $exists: true } },
            { 'pickup.coordinates.1': { $exists: true } },
            {
                pickup: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [ lng, lat ] },
                        $maxDistance: RIDE_SEARCH_RADIUS_M,
                    },
                },
            },
        ],
    };

    try {
        return await q(geoFilter);
    } catch (e) {
        console.error('getPendingRides geo query fallback:', e?.message || e);
        return q(base);
    }
}

module.exports.getPendingRides = async (req, res) => {
    try {
        const cap = await captainModel.findById(req.captain._id).select('location city vehicleType subscriptionStatus status blocked');
        if (!cap || cap.blocked || cap.subscriptionStatus !== 'active' || cap.status !== 'active') {
            res.set({ 'Cache-Control': 'no-store' });
            return res.status(200).json([]);
        }
        if (!cap.city || !cap.vehicleType) {
            res.set({ 'Cache-Control': 'no-store' });
            return res.status(200).json([]);
        }

        const rides = await findPendingRidesForCaptain(cap, req.captain._id);

        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        });
        res.status(200).json(rides.map((r) => publicRide(r)));
    } catch (err) {
        console.error('getPendingRides:', err);
        res.status(500).json({ message: err.message || 'pending rides failed' });
    }
};

module.exports.endRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.body;

    try {
        const ride = await rideService.endRide({ rideId, captain: req.captain });
        const updated = await rideModel.findById(ride._id).populate('user').populate('captain');
        const uid = userIdOf(ride.user);
        if (uid) {
            emitToUser(uid, 'ride:status-update', {
                rideId: ride._id,
                status: 'completed',
                ride: publicRide(updated),
            });
        }
        return res.status(200).json(publicRide(updated));
    } catch (err) {
        const msg = err?.message || 'Failed to end ride';
        return res.status(400).json({ message: msg });
    }
};

module.exports.payMock = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { rideId, method } = req.body;
    try {
        const ride = await rideModel.findOne({ _id: rideId, user: req.user._id, status: 'completed' });
        if (!ride) return res.status(400).json({ message: 'Completed ride not found' });
        if (ride.paymentStatus === 'success') {
            const u = await userModel.findById(req.user._id);
            return res.json({ ride: publicRide(ride), walletBalance: u?.walletBalance });
        }

        const norm = rideService.normalizePaymentMethod(method);
        const failMock = norm !== 'Cash' && Math.random() < 0.07;
        if (failMock) {
            ride.paymentStatus = 'failed';
            await ride.save();
            return res.status(402).json({ message: 'Mock payment failed — try again or Cash', ride: publicRide(ride) });
        }

        const user = await userModel.findById(req.user._id);
        if (norm === 'WALLET') {
            if ((user.walletBalance || 0) < ride.price) {
                return res.status(400).json({ message: 'Insufficient wallet balance' });
            }
            user.walletBalance = (user.walletBalance || 0) - ride.price;
            await user.save();
        }

        const pct = Number(process.env.COMMISSION_PERCENT || 15) / 100;
        const platformFee = Math.round(ride.price * pct);
        const net = ride.price - platformFee;

        ride.paymentMethod = norm;
        ride.paymentStatus = 'success';
        ride.platformFee = platformFee;
        ride.captainNetEarning = net;
        await ride.save();

        if (ride.captain) {
            await captainModel.findByIdAndUpdate(ride.captain, {
                $inc: { walletBalance: net, totalEarnings: net },
            });
        }

        const uid = userIdOf(req.user);
        const fresh = await rideModel.findById(ride._id).populate('captain');
        emitToUser(uid, 'ride:status-update', {
            rideId: ride._id,
            status: 'completed',
            paymentStatus: 'success',
            ride: publicRide(fresh),
        });
        if (ride.captain) {
            emitToCaptain(ride.captain.toString(), 'ride:status-update', {
                rideId: ride._id,
                status: 'completed',
                paymentStatus: 'success',
            });
        }

        const freshUser = await userModel.findById(req.user._id);
        return res.json({ ride: publicRide(fresh), walletBalance: freshUser?.walletBalance });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

/** Client-side UPI intent verification callback (webhook-like endpoint). */
module.exports.verifyUpiIntent = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { rideId, transactionRef, status, amount } = req.body;
    try {
        const ride = await rideModel.findOne({ _id: rideId, user: req.user._id });
        if (!ride) return res.status(404).json({ message: 'Ride not found' });

        const st = String(status || 'PENDING').toUpperCase();
        const isSuccess = st === 'SUCCESS';
        return res.json({
            ok: true,
            rideId: ride._id,
            transactionRef: String(transactionRef || ''),
            status: st,
            amount: Number(amount || 0),
            nextStep: isSuccess
                ? 'Payment confirmed. Continue with ride flow.'
                : 'Waiting for payment confirmation.',
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.userRideHistory = async (req, res) => {
    try {
        const rides = await rideModel
            .find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('captain', 'name phone vehicleType averageRating');
        res.json(rides.map((r) => publicRide(r)));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports.rateRide = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { rideId, rating, comment } = req.body;
    try {
        const ride = await rideService.rateRide({
            rideId,
            user: req.user._id,
            rating,
            comment: comment || '',
        });
        return res.status(200).json(publicRide(ride));
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};
