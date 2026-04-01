const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const adminModel = require('../models/admin.model');
const blackListTokenModel = require('../models/blackListToken.model');

async function extractToken(req) {
    return req.cookies?.token || req.headers.authorization?.split(' ')[1] || null;
}

async function ensureNotBlacklisted(token) {
    if (!token) return;
    const isBlacklisted = await blackListTokenModel.findOne({ token });
    if (isBlacklisted) {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
    }
}

module.exports.authUser = async (req, res, next) => {
    try {
        const token = await extractToken(req);
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        await ensureNotBlacklisted(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded._id);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });
        if (user.blocked) return res.status(403).json({ message: 'Account suspended' });
        req.user = user;
        return next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports.authCaptain = async (req, res, next) => {
    try {
        const token = await extractToken(req);
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        await ensureNotBlacklisted(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const captain = await captainModel.findById(decoded._id);
        if (!captain) return res.status(401).json({ message: 'Unauthorized' });
        if (captain.blocked) return res.status(403).json({ message: 'Account suspended' });
        req.captain = captain;
        return next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports.authAdmin = async (req, res, next) => {
    try {
        const token = await extractToken(req);
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        await ensureNotBlacklisted(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
        const admin = await adminModel.findById(decoded._id);
        if (!admin) return res.status(401).json({ message: 'Unauthorized' });
        req.admin = admin;
        return next();
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

// Accept either user token or captain token.
module.exports.authUserOrCaptain = async (req, res, next) => {
    try {
        const token = await extractToken(req);
        if (!token) return res.status(401).json({ message: 'Unauthorized' });
        await ensureNotBlacklisted(token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded._id);
        if (user) {
            if (user.blocked) return res.status(403).json({ message: 'Account suspended' });
            req.user = user;
            req.authRole = 'user';
            return next();
        }

        const captain = await captainModel.findById(decoded._id);
        if (captain) {
            if (captain.blocked) return res.status(403).json({ message: 'Account suspended' });
            req.captain = captain;
            req.authRole = 'captain';
            return next();
        }

        return res.status(401).json({ message: 'Unauthorized' });
    } catch {
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

