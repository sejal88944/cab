const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }
}, { timestamps: true, collection: 'admins' });

adminSchema.methods.generateAuthToken = function () {
    return jwt.sign({ _id: this._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

adminSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

adminSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

module.exports = mongoose.model('admin', adminSchema);

