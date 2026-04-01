const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, minlength: 2 },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    city: { type: String, enum: [ 'Pune', 'Kolhapur' ], default: 'Pune' },
    bankDetails: {
        accountHolderName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        upiId: { type: String, default: '' },
        verified: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: null },
    },
    password: { type: String, required: true, select: false },
    socketId: { type: String },
    walletBalance: { type: Number, default: 500 },
    blocked: { type: Boolean, default: false },
    loginOtp: { type: String, select: false },
    loginOtpExpiresAt: { type: Date, select: false },
}, { timestamps: true, collection: 'users' });

userSchema.methods.generateAuthToken = function () {
    return jwt.sign({ _id: this._id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model('user', userSchema);

