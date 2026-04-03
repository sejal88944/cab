/**
 * CORS for Express + Socket.IO (Render production + local dev).
 * Never use origin: '*' with credentials: true — browsers reject it.
 */

/** Always allow this frontend when NODE_ENV=production (even if CORS_ORIGINS env is missing). */
const FALLBACK_PRODUCTION_ORIGINS = [
    'https://rideeasy-web.onrender.com',
];

function parseOrigins() {
    return (process.env.CORS_ORIGINS || process.env.CLIENT_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function isProductionLike() {
    return process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
}

function getAllowedOriginsList() {
    const fromEnv = parseOrigins();
    if (isProductionLike()) {
        return [ ...new Set([ ...fromEnv, ...FALLBACK_PRODUCTION_ORIGINS ]) ];
    }
    return fromEnv;
}

function isLocalDevOrigin(origin) {
    if (!origin) return false;
    return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

function corsOriginCallback(origin, cb) {
    const allowedList = getAllowedOriginsList();
    const isProd = isProductionLike();

    if (!origin) {
        return cb(null, true);
    }

    if (isLocalDevOrigin(origin)) {
        if (process.env.CORS_DEBUG === 'true') {
            console.log('[CORS] allow local dev origin:', origin);
        }
        return cb(null, origin);
    }

    if (!allowedList.length) {
        if (isProd && process.env.CORS_ALLOW_ALL !== 'true') {
            console.error('[CORS] blocked (no allowed origins):', origin);
            return cb(new Error('CORS_ORIGINS not set in production'), false);
        }
        if (process.env.CORS_DEBUG === 'true') {
            console.log('[CORS] allow (dev / CORS_ALLOW_ALL):', origin);
        }
        return cb(null, origin);
    }

    if (allowedList.includes(origin)) {
        if (process.env.CORS_DEBUG === 'true') {
            console.log('[CORS] allow listed origin:', origin);
        }
        return cb(null, origin);
    }

    console.error('[CORS] blocked origin:', origin, 'allowed:', allowedList);
    return cb(new Error('CORS: origin not allowed'), false);
}

function expressCorsOptions() {
    return {
        origin: corsOriginCallback,
        credentials: true,
        methods: [ 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS' ],
        allowedHeaders: [ 'Content-Type', 'Authorization', 'X-Requested-With' ],
        optionsSuccessStatus: 204,
    };
}

function socketIoCorsOrigin(origin, callback) {
    const allowedList = getAllowedOriginsList();
    const isProd = isProductionLike();

    if (!origin) {
        return callback(null, true);
    }

    if (isLocalDevOrigin(origin)) {
        return callback(null, origin);
    }

    if (!allowedList.length) {
        if (isProd && process.env.CORS_ALLOW_ALL !== 'true') {
            return callback(null, false);
        }
        return callback(null, origin);
    }

    if (allowedList.includes(origin)) {
        return callback(null, origin);
    }

    return callback(null, false);
}

function socketIoCorsConfig() {
    return {
        origin: socketIoCorsOrigin,
        methods: [ 'GET', 'POST' ],
        credentials: true,
    };
}

module.exports = {
    parseOrigins,
    getAllowedOriginsList,
    isProductionLike,
    isLocalDevOrigin,
    corsOriginCallback,
    expressCorsOptions,
    socketIoCorsConfig,
    FALLBACK_PRODUCTION_ORIGINS,
};
