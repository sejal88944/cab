const { validationResult } = require('express-validator');
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const Captain = require('../models/captain.model');
const Ride = require('../models/rideCore.model');
const pricingService = require('../services/pricing.service');

/** Match ride.controller payRide / COMMISSION_PERCENT default (15%). */
function commissionPct() {
    return Number(process.env.COMMISSION_PERCENT || 15) / 100;
}

const DEFAULT_ADMIN_EMAIL = 'sm@gmail.com';
const DEFAULT_ADMIN_PASSWORD = '123456';

async function ensureDefaultAdmin() {
    let admin = await Admin.findOne({ email: DEFAULT_ADMIN_EMAIL }).select('+password');
    if (!admin) {
        const hashed = await Admin.hashPassword(DEFAULT_ADMIN_PASSWORD);
        admin = await Admin.create({ email: DEFAULT_ADMIN_EMAIL, password: hashed });
    }
    return admin;
}

module.exports.loginAdmin = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('ADMIN LOGIN validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    await ensureDefaultAdmin();

    const normalizedEmail = String(email ?? '').toLowerCase().trim();
    const normalizedPassword = String(password ?? '').trim();

    console.log('ADMIN LOGIN attempt:', { normalizedEmail, hasPassword: !!normalizedPassword });

    // Dev-friendly default admin bypass (prevents "stuck 401" when DB state is inconsistent)
    if (normalizedEmail === DEFAULT_ADMIN_EMAIL && normalizedPassword === DEFAULT_ADMIN_PASSWORD) {
        const admin = await ensureDefaultAdmin();
        const token = admin.generateAuthToken();
        console.log('ADMIN LOGIN success via DEFAULT bypass');
        return res.status(200).json({ token, admin: { _id: admin._id, email: admin.email } });
    }

    const admin = await Admin.findOne({ email: normalizedEmail }).select('+password');
    if (!admin) {
        console.log('ADMIN LOGIN failed: admin not found for', normalizedEmail);
        return res.status(401).json({ message: 'Admin not found for this email' });
    }

    const ok = await admin.comparePassword(normalizedPassword);
    if (!ok) {
        console.log('ADMIN LOGIN failed: bad password for', normalizedEmail);
        return res.status(401).json({ message: 'Password incorrect' });
    }

    const token = admin.generateAuthToken();
    console.log('ADMIN LOGIN success (DB)', { id: admin._id, email: admin.email });
    return res.status(200).json({ token, admin: { _id: admin._id, email: admin.email } });
};

module.exports.getAnalytics = async (req, res) => {
    try {
        const [
            totalUsers,
            totalDrivers,
            totalRides,
            completedRides,
            activeDriversOnline,
            completedRideCount,
            completedWithCaptainCount,
        ] = await Promise.all([
            User.countDocuments({}),
            Captain.countDocuments({}),
            Ride.countDocuments({}),
            Ride.find({ status: 'completed' }).select('price city'),
            Captain.countDocuments({
                status: 'active',
                subscriptionStatus: 'active',
                approved: true,
                blocked: { $ne: true },
            }),
            Ride.countDocuments({ status: 'completed' }),
            Ride.countDocuments({ status: 'completed', captain: { $exists: true, $ne: null } }),
        ]);

        const totalRevenue = completedRides.reduce((sum, r) => sum + (r.price || 0), 0);

        const pct = commissionPct();
        const platformAgg = await Ride.aggregate([
            { $match: { status: 'completed' } },
            {
                $addFields: {
                    effPlatformFee: {
                        $cond: [
                            { $gt: [ { $ifNull: [ '$platformFee', 0 ] }, 0 ] },
                            '$platformFee',
                            { $multiply: [ { $ifNull: [ '$price', 0 ] }, pct ] },
                        ],
                    },
                },
            },
            { $group: { _id: null, platformIncome: { $sum: '$effPlatformFee' } } },
        ]);
        const platformIncomeTotal = Math.round(platformAgg[0]?.platformIncome || 0);

        const cityAnalytics = { Pune: { rides: 0, drivers: 0, revenue: 0 }, Kolhapur: { rides: 0, drivers: 0, revenue: 0 } };

        const [ cityRideCounts, cityDriverCounts ] = await Promise.all([
            Ride.aggregate([
                { $group: { _id: '$city', rides: { $sum: 1 }, revenue: { $sum: '$price' } } }
            ]),
            Captain.aggregate([
                { $group: { _id: '$city', drivers: { $sum: 1 } } }
            ]),
        ]);

        cityRideCounts.forEach((c) => {
            const key = c._id;
            if (!cityAnalytics[key]) cityAnalytics[key] = { rides: 0, drivers: 0, revenue: 0 };
            cityAnalytics[key].rides = c.rides;
            cityAnalytics[key].revenue = c.revenue;
        });
        cityDriverCounts.forEach((c) => {
            const key = c._id;
            if (!cityAnalytics[key]) cityAnalytics[key] = { rides: 0, drivers: 0, revenue: 0 };
            cityAnalytics[key].drivers = c.drivers;
        });

        return res.status(200).json({
            totalUsers,
            totalDrivers,
            totalRides,
            totalRevenue,
            platformIncomeTotal,
            activeDriversOnline,
            /** Same DB as Atlas — if completedWithCaptain < completedRideCount, rides lack captain link. */
            completedRideCount,
            completedWithCaptainCount,
            cityAnalytics,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('name email phone city createdAt blocked')
            .sort({ createdAt: -1 })
            .limit(500);
        return res.status(200).json(users);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getDrivers = async (req, res) => {
    try {
        const pct = commissionPct();
        /** Must match Mongoose actual collection names (Atlas: `rides`, `drivers`). */
        const ridesColl = Ride.collection.collectionName;

        /**
         * Join drivers → rides by captain _id so ObjectId matching matches Atlas Browser.
         * Fallback: if no completed rides, show `totalEarnings` from driver document (ledger in MongoDB).
         */
        const enriched = await Captain.aggregate([
            { $sort: { createdAt: -1 } },
            { $limit: 500 },
            {
                $lookup: {
                    from: ridesColl,
                    let: { driverId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [ '$status', 'completed' ] },
                                        {
                                            $or: [
                                                { $eq: [ '$captain', '$$driverId' ] },
                                                {
                                                    $eq: [
                                                        { $toString: '$captain' },
                                                        { $toString: '$$driverId' },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $addFields: {
                                effPlatformFee: {
                                    $cond: [
                                        { $gt: [ { $ifNull: [ '$platformFee', 0 ] }, 0 ] },
                                        '$platformFee',
                                        { $multiply: [ { $ifNull: [ '$price', 0 ] }, pct ] },
                                    ],
                                },
                            },
                        },
                        {
                            $addFields: {
                                effDriverIncome: {
                                    $cond: [
                                        { $ne: [ '$captainNetEarning', null ] },
                                        '$captainNetEarning',
                                        { $subtract: [ { $ifNull: [ '$price', 0 ] }, '$effPlatformFee' ] },
                                    ],
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                completedRides: { $sum: 1 },
                                driverIncome: { $sum: '$effDriverIncome' },
                                platformFromDriver: { $sum: '$effPlatformFee' },
                            },
                        },
                    ],
                    as: 'agg',
                },
            },
            {
                $addFields: {
                    st: { $arrayElemAt: [ '$agg', 0 ] },
                },
            },
            {
                $addFields: {
                    completedRides: { $ifNull: [ '$st.completedRides', 0 ] },
                    _incomeFromRides: { $round: [ { $ifNull: [ '$st.driverIncome', 0 ] }, 0 ] },
                    platformShare: { $round: [ { $ifNull: [ '$st.platformFromDriver', 0 ] }, 0 ] },
                },
            },
            {
                $addFields: {
                    driverIncome: {
                        $cond: [
                            { $gt: [ '$completedRides', 0 ] },
                            '$_incomeFromRides',
                            { $ifNull: [ '$totalEarnings', 0 ] },
                        ],
                    },
                },
            },
            {
                $addFields: {
                    effectiveSubscriptionStatus: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: [ '$subscriptionStatus', 'active' ] },
                                    { $ne: [ '$subscriptionExpiresAt', null ] },
                                    { $lte: [ '$subscriptionExpiresAt', new Date() ] },
                                ],
                            },
                            'expired',
                            '$subscriptionStatus',
                        ],
                    },
                },
            },
            {
                $project: {
                    password: 0,
                    loginOtp: 0,
                    loginOtpExpiresAt: 0,
                    agg: 0,
                    st: 0,
                    _incomeFromRides: 0,
                },
            },
        ]);

        return res.status(200).json(enriched);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.approveDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await Captain.findByIdAndUpdate(id, { approved: true }, { new: true });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        return res.status(200).json(driver);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getRides = async (req, res) => {
    try {
        const rides = await Ride.find({})
            .select('city pickupLocation dropLocation price status')
            .sort({ createdAt: -1 })
            .limit(500);
        return res.status(200).json(rides);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getPayments = async (req, res) => {
    try {
        const rides = await Ride.find({ status: 'completed' })
            .select('price paymentMethod status createdAt')
            .sort({ createdAt: -1 })
            .limit(500);
        const payments = rides.map((r) => ({
            _id: r._id,
            type: 'ride_fare',
            amount: r.price,
            paymentMode: r.paymentMethod,
            status: r.status === 'completed' ? 'success' : 'pending',
            createdAt: r.createdAt,
        }));
        return res.status(200).json(payments);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getSubscriptions = async (req, res) => {
    try {
        const SUB_PLANS = {
            BIKE: { weekly: 29, monthly: 99, yearly: 999 },
            AUTO: { weekly: 49, monthly: 149, yearly: 1299 },
            MINI: { weekly: 69, monthly: 179, yearly: 1599 },
            CAR: { weekly: 79, monthly: 199, yearly: 1799 },
            SEDAN: { weekly: 79, monthly: 199, yearly: 1799 },
        };
        const drivers = await Captain.find({ subscriptionStatus: { $ne: 'none' } })
            .select('name email vehicleType subscriptionStatus createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .limit(500)
            .lean();
        const subs = drivers.map((d) => {
            const vt = d.vehicleType && SUB_PLANS[d.vehicleType] ? d.vehicleType : 'AUTO';
            const weekly = SUB_PLANS[vt]?.weekly ?? SUB_PLANS.AUTO.weekly;
            return {
                _id: d._id,
                driverName: d.name,
                email: d.email,
                vehicleType: d.vehicleType,
                plan: d.subscriptionStatus,
                weeklyChargeHint: weekly,
                status: d.subscriptionStatus,
                updatedAt: d.updatedAt,
            };
        });
        return res.status(200).json(subs);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.blockDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const { blocked } = req.body || {};
        if (typeof blocked !== 'boolean') return res.status(400).json({ message: 'blocked boolean required' });
        const driver = await Captain.findByIdAndUpdate(id, { blocked }, { new: true })
            .select('name email blocked approved');
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        return res.status(200).json(driver);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { blocked } = req.body || {};
        if (typeof blocked !== 'boolean') return res.status(400).json({ message: 'blocked boolean required' });
        const user = await User.findByIdAndUpdate(id, { blocked }, { new: true })
            .select('name email phone blocked');
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getPricing = async (req, res) => {
    try {
        const rates = await pricingService.getRates();
        return res.json({ rates });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.updatePricing = async (req, res) => {
    try {
        const rates = req.body?.rates || req.body;
        if (!rates || typeof rates !== 'object') return res.status(400).json({ message: 'rates object required' });
        const doc = await pricingService.updateRates(rates);
        return res.json({ rates: doc.rates });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

