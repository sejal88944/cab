const { validationResult } = require('express-validator');
const captainModel = require('../models/captain.model');
const blackListTokenModel = require('../models/blackListToken.model');
const rideModel = require('../models/rideCore.model');
const { getAuthCookieOptions } = require('../utils/authCookie');
const { randomSixDigit, expiresInMinutes } = require('../utils/otp');
const { expiresAfterPlan, syncSubscriptionState, isSubscriptionValid } = require('../services/subscriptionDriver.service');

module.exports.registerCaptain = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone, email, password, vehicleType, vehicleNumber, license, city } = req.body;
    const selectedPlan = [ 'weekly', 'monthly', 'yearly' ].includes(req.body?.subscriptionPlan) ? req.body.subscriptionPlan : 'monthly';
    const existing = await captainModel.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Driver already exist' });

    const hashed = await captainModel.hashPassword(password);
    const started = new Date();
    const captain = await captainModel.create({
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: String(email).toLowerCase().trim(),
        password: hashed,
        vehicleType: String(vehicleType).toUpperCase(),
        vehicleNumber: String(vehicleNumber).trim(),
        license: String(license).trim(),
        city: city || 'Pune',
        approved: true,
        /** Active so new drivers receive ride:new / pending without extra subscribe step (use mock subscribe to renew in prod). */
        subscriptionStatus: 'active',
        subscriptionPlan: selectedPlan,
        subscriptionStartedAt: started,
        subscriptionExpiresAt: expiresAfterPlan(selectedPlan, started),
    });

    const token = captain.generateAuthToken();
    res.cookie('token', token, getAuthCookieOptions());
    return res.status(201).json({ token, captain });
};

module.exports.loginCaptain = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const captain = await captainModel.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!captain) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await captain.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const fresh = await syncSubscriptionState(captain);
    const token = fresh.generateAuthToken();
    res.cookie('token', token, getAuthCookieOptions());
    return res.status(200).json({
        token,
        captain: fresh,
        subscription: {
            status: fresh.subscriptionStatus,
            plan: fresh.subscriptionPlan || null,
            startedAt: fresh.subscriptionStartedAt || null,
            expiresAt: fresh.subscriptionExpiresAt || null,
        },
    });
};

module.exports.getCaptainProfile = async (req, res) => {
    const fresh = await syncSubscriptionState(req.captain);
    return res.status(200).json({
        captain: fresh,
        subscription: {
            status: fresh.subscriptionStatus,
            plan: fresh.subscriptionPlan || null,
            startedAt: fresh.subscriptionStartedAt || null,
            expiresAt: fresh.subscriptionExpiresAt || null,
        },
    });
};

module.exports.logoutCaptain = async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) await blackListTokenModel.create({ token });
    res.clearCookie('token', getAuthCookieOptions());
    return res.status(200).json({ message: 'Logout successfully' });
};

module.exports.updateStatus = async (req, res) => {
    const { status } = req.body || {};
    if (![ 'active', 'inactive' ].includes(status)) return res.status(400).json({ message: 'Status must be active or inactive' });
    if (status === 'inactive') {
        await captainModel.findByIdAndUpdate(req.captain._id, { status });
        return res.status(200).json({ status });
    }
    let cap = await captainModel.findById(req.captain._id);
    cap = await syncSubscriptionState(cap);
    if (!cap.approved) {
        return res.status(403).json({ message: 'Admin approval required before going online.' });
    }
    if (cap.blocked) {
        return res.status(403).json({ message: 'Account blocked.' });
    }
    if (!isSubscriptionValid(cap)) {
        return res.status(403).json({ message: 'Active subscription required. Renew if expired.' });
    }
    await captainModel.findByIdAndUpdate(req.captain._id, { status });
    return res.status(200).json({ status });
};

module.exports.getEarnings = async (req, res) => {
    try {
        const captainId = req.captain._id;
        const cap = await captainModel.findById(captainId);
        const completed = await rideModel.find({ captain: captainId, status: 'completed' })
            .select('price captainNetEarning completedAt createdAt paymentStatus');
        const totalFromRides = completed.reduce((sum, r) => sum + (r.captainNetEarning != null ? r.captainNetEarning : (r.price || 0)), 0);
        const count = completed.length;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayRides = completed.filter((r) => {
            const t = r.completedAt || r.createdAt;
            return t && new Date(t) >= todayStart;
        });
        const todayEarnings = todayRides.reduce((sum, r) => sum + (r.captainNetEarning != null ? r.captainNetEarning : (r.price || 0)), 0);

        return res.status(200).json({
            totalEarnings: cap?.totalEarnings ?? totalFromRides,
            walletBalance: cap?.walletBalance ?? 0,
            count,
            todayEarnings,
            todayRides: todayRides.length,
        });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.getRideHistory = async (req, res) => {
    try {
        const rides = await rideModel.find({ captain: req.captain._id })
            .sort({ createdAt: -1 })
            .limit(40)
            .select('pickupLocation dropLocation price status createdAt completedAt vehicleType paymentMethod')
            .lean();
        return res.status(200).json({ rides });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};

module.exports.sendDriverPhoneOtp = async (req, res) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (phone.length < 10) return res.status(400).json({ message: 'Valid phone required' });
    const captain = await captainModel.findOne({ phone }).select('+loginOtp +loginOtpExpiresAt');
    if (!captain) return res.status(404).json({ message: 'No driver with this phone — register first' });
    const otp = randomSixDigit();
    captain.loginOtp = otp;
    captain.loginOtpExpiresAt = expiresInMinutes(5);
    await captain.save();
    console.log(`[MOCK SMS] Driver OTP for ${phone}: ${otp}`);
    return res.json({ message: 'OTP sent (server console)' });
};

module.exports.verifyDriverPhoneOtp = async (req, res) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    const otp = String(req.body?.otp || '');
    if (phone.length < 10 || otp.length !== 6) return res.status(400).json({ message: 'Phone and OTP required' });
    const captain = await captainModel.findOne({ phone }).select('+loginOtp +loginOtpExpiresAt');
    if (!captain?.loginOtp) return res.status(400).json({ message: 'Request OTP first' });
    if (captain.loginOtp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (captain.loginOtpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    captain.loginOtp = undefined;
    captain.loginOtpExpiresAt = undefined;
    await captain.save();
    const token = captain.generateAuthToken();
    const safe = captain.toObject();
    delete safe.password;
    return res.json({ token, captain: safe });
};

