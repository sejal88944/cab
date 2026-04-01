const Pricing = require('../models/pricing.model');

const DEFAULT_RATES = {
    BIKE: { baseFare: 15, perKm: 8, platformFee: 5 },
    AUTO: { baseFare: 25, perKm: 11, platformFee: 5 },
    MINI: { baseFare: 35, perKm: 11, platformFee: 8 },
    CAR: { baseFare: 40, perKm: 12, platformFee: 10 },
    SEDAN: { baseFare: 40, perKm: 12, platformFee: 10 },
};

async function getRates() {
    let doc = await Pricing.findOne({ key: 'global' });
    if (!doc) {
        doc = await Pricing.create({ key: 'global', rates: DEFAULT_RATES });
    }
    return { ...DEFAULT_RATES, ...(doc.rates || {}) };
}

async function updateRates(partial) {
    const current = await getRates();
    const next = { ...DEFAULT_RATES, ...current };
    for (const vt of Object.keys(partial || {})) {
        const p = partial[vt];
        if (p && typeof p === 'object' && next[vt]) {
            next[vt] = { ...next[vt], ...p };
        }
    }
    return Pricing.findOneAndUpdate(
        { key: 'global' },
        { $set: { rates: next } },
        { new: true, upsert: true }
    );
}

module.exports = {
    DEFAULT_RATES,
    getRates,
    updateRates,
};
