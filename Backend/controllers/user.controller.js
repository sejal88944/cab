const { validationResult } = require('express-validator');
const userModel = require('../models/user.model');
const blackListTokenModel = require('../models/blackListToken.model');
const { randomSixDigit, expiresInMinutes } = require('../utils/otp');
const { getAuthCookieOptions } = require('../utils/authCookie');

function verifyBankDetails({ accountHolderName, accountNumber, ifscCode, upiId }) {
    const holder = String(accountHolderName || '').trim();
    const account = String(accountNumber || '').replace(/\s+/g, '');
    const ifsc = String(ifscCode || '').trim().toUpperCase();
    const upi = String(upiId || '').trim().toLowerCase();

    if (holder.length < 2) return { ok: false, message: 'Account holder name is required' };
    if (!/^\d{9,18}$/.test(account)) return { ok: false, message: 'Invalid account number' };
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return { ok: false, message: 'Invalid IFSC code' };
    if (!/^[a-z0-9.\-_]{2,}@[a-z]{2,}$/.test(upi)) return { ok: false, message: 'Invalid UPI ID' };

    // Mock bank verification pass (can be replaced with penny-drop API later).
    return {
        ok: true,
        normalized: {
            accountHolderName: holder,
            accountNumber: account,
            ifscCode: ifsc,
            upiId: upi,
            verified: true,
            verifiedAt: new Date(),
        },
    };
}

module.exports.registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, phone, email, password, city, bankDetails } = req.body;
    const existing = await userModel.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const verification = verifyBankDetails(bankDetails || {});
    if (!verification.ok) return res.status(400).json({ message: verification.message });

    const hashed = await userModel.hashPassword(password);
    const user = await userModel.create({
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: String(email).toLowerCase().trim(),
        city: city || 'Pune',
        bankDetails: verification.normalized,
        password: hashed,
    });

    const token = user.generateAuthToken();
    res.cookie('token', token, getAuthCookieOptions());
    return res.status(201).json({ token, user });
};

module.exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await userModel.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const token = user.generateAuthToken();
    res.cookie('token', token, getAuthCookieOptions());
    return res.status(200).json({ token, user });
};

module.exports.getProfile = async (req, res) => {
    return res.status(200).json({ user: req.user });
};

module.exports.logoutUser = async (req, res) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (token) await blackListTokenModel.create({ token });
    res.clearCookie('token', getAuthCookieOptions());
    return res.status(200).json({ message: 'Logout successfully' });
};

/** Phone OTP — mock SMS via console */
module.exports.sendPhoneOtp = async (req, res) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (phone.length < 10) return res.status(400).json({ message: 'Valid phone required' });
    const otp = randomSixDigit();
    const exposeOtp = process.env.OTP_DEBUG === 'true' || process.env.NODE_ENV !== 'production';
    let user = await userModel.findOne({ phone });
    if (!user) {
        const syntheticEmail = `${phone}@phone.rideeasy.local`;
        const hashed = await userModel.hashPassword(randomSixDigit() + 'Aa1!');
        user = await userModel.create({
            name: 'Rider',
            phone,
            email: syntheticEmail,
            password: hashed,
            walletBalance: 500,
        });
    }
    user = await userModel.findById(user._id).select('+loginOtp +loginOtpExpiresAt');
    user.loginOtp = otp;
    user.loginOtpExpiresAt = expiresInMinutes(5);
    await user.save();
    console.log(`[MOCK SMS] Passenger OTP for ${phone}: ${otp}`);
    return res.json({
        message: exposeOtp ? 'OTP generated (dev)' : 'OTP sent',
        expiresIn: 300,
        ...(exposeOtp ? { debugOtp: otp } : {}),
    });
};

module.exports.verifyPhoneOtp = async (req, res) => {
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    const otp = String(req.body?.otp || '');
    const name = req.body?.name;
    if (phone.length < 10 || otp.length !== 6) {
        return res.status(400).json({ message: 'Phone and 6-digit OTP required' });
    }
    const user = await userModel.findOne({ phone }).select('+loginOtp +loginOtpExpiresAt');
    if (!user?.loginOtp) return res.status(400).json({ message: 'Request OTP first' });
    if (user.loginOtp !== otp) return res.status(400).json({ message: 'Invalid OTP' });
    if (user.loginOtpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired' });
    user.loginOtp = undefined;
    user.loginOtpExpiresAt = undefined;
    if (name && String(name).trim().length >= 2) user.name = String(name).trim();
    await user.save();
    const token = user.generateAuthToken();
    return res.json({ token, user });
};

