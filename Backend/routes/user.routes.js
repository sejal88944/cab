const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register',
    body('name').isString().isLength({ min: 2 }),
    body('phone').isString().isLength({ min: 6 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('city').optional().isIn([ 'Pune', 'Kolhapur' ]),
    body('bankDetails.accountHolderName').isString().isLength({ min: 2 }),
    body('bankDetails.accountNumber').isString().isLength({ min: 9, max: 18 }),
    body('bankDetails.ifscCode').isString().isLength({ min: 11, max: 11 }),
    body('bankDetails.upiId').isString().isLength({ min: 5 }),
    userController.registerUser
);

router.post('/login',
    body('email').isEmail(),
    body('password').isString().isLength({ min: 1 }),
    userController.loginUser
);

router.post('/phone/send-otp', body('phone').isString().isLength({ min: 10 }), userController.sendPhoneOtp);
router.post('/phone/verify-otp',
    body('phone').isString().isLength({ min: 10 }),
    body('otp').isString().isLength({ min: 6, max: 6 }),
    userController.verifyPhoneOtp
);

router.get('/profile', auth.authUser, userController.getProfile);
router.get('/logout', auth.authUser, userController.logoutUser);

module.exports = router;

