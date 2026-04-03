/**
 * Single source of truth for CORS (Express + Socket.IO).
 * With credentials: true, Access-Control-Allow-Origin must be the request origin string — never '*'.
 */

function parseOrigins() {
    return (process.env.CORS_ORIGINS || process.env.CLIENT_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function isLocalDevOrigin(origin) {
    if (!origin) return false;
    return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

/**
 * Express cors `origin` callback — pass explicit origin string when allowing (required with credentials).
 */
function corsOriginCallback(origin, cb) {
    const allowedList = parseOrigins();
    const isProd = process.env.NODE_ENV === 'production';

    if (!origin) {
        return cb(null, true);
    }

    if (isLocalDevOrigin(origin)) {
        return cb(null, origin);
    }

    if (!allowedList.length) {
        if (isProd && process.env.CORS_ALLOW_ALL !== 'true') {
            return cb(new Error('CORS_ORIGINS not set in production'), false);
        }
        if (isProd && process.env.CORS_ALLOW_ALL === 'true') {
            console.warn('[CORS] CORS_ALLOW_ALL=true — reflecting origin:', origin);
            return cb(null, origin);
        }
        return cb(null, origin);
    }

    if (allowedList.includes(origin)) {
        return cb(null, origin);
    }

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

/** Socket.IO: same allow-list; callback must echo origin string (not true) when credentials: true */
function socketIoCorsOrigin(origin, callback) {
    const allowedList = parseOrigins();
    const isProd = process.env.NODE_ENV === 'production';

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
    isLocalDevOrigin,
    corsOriginCallback,
    expressCorsOptions,
    socketIoCorsConfig,
};
