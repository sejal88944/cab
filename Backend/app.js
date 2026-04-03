require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectToDb = require('./config/db');
const { expressCorsOptions } = require('./config/cors.config');

const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const mapsRoutes = require('./routes/maps.routes');
const rideRoutes = require('./routes/ride.routes');
const adminRoutes = require('./routes/admin.routes');
const driverSubscriptionRoutes = require('./routes/driverSubscriptions.routes');
const healthRoutes = require('./routes/health.routes');
const webhooksController = require('./controllers/webhooks.controller');

connectToDb();

const app = express();

app.set('etag', false);
app.set('trust proxy', 1);

const corsOptions = expressCorsOptions();

// Optional: set CORS_DEBUG=true to log Origin on each request
if (process.env.CORS_DEBUG === 'true') {
    app.use((req, res, next) => {
        console.log('[CORS debug]', req.method, req.path, 'origin=', req.headers.origin || '(none)');
        next();
    });
}

// CORS before routes / body parsers (preflight must succeed)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Optional HTTPS enforcement (useful behind reverse proxies/load balancers)
if (process.env.FORCE_HTTPS === 'true') {
    app.use((req, res, next) => {
        if (req.secure) return next();
        const host = req.headers.host;
        if (!host) return next();
        return res.redirect(301, `https://${host}${req.originalUrl}`);
    });
}

// Optional error monitoring (Sentry)
let Sentry = null;
try {
    Sentry = require('@sentry/node');
} catch (e) {
    Sentry = null;
}
if (Sentry?.init && process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    });

    if (Sentry.Handlers?.requestHandler) {
        app.use(Sentry.Handlers.requestHandler());
    }
    if (Sentry.Handlers?.tracingHandler) {
        app.use(Sentry.Handlers.tracingHandler());
    }
}

/** Razorpay needs raw body for signature — before express.json() */
app.post('/webhooks/razorpay', express.raw({ type: 'application/json', limit: '256kb' }), webhooksController.razorpayWebhook);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 400),
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(apiLimiter);

app.get('/', (req, res) => res.send('OK'));
app.use('/health', healthRoutes);

app.use('/users', userRoutes);
app.use('/captains', captainRoutes);
app.use('/maps', mapsRoutes);
app.use('/rides', rideRoutes);
app.use('/admin', adminRoutes);
app.use('/driver-subscriptions', driverSubscriptionRoutes);

if (Sentry?.Handlers?.errorHandler) {
    app.use(Sentry.Handlers.errorHandler());
}

module.exports = app;
