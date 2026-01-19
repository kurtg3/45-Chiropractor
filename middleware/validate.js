/**
 * Validation Middleware
 * Input validation and sanitization
 */

const { body, param, query, validationResult } = require('express-validator');
const xss = require('xss');

// Custom XSS sanitizer
const sanitizeInput = (value) => {
    if (typeof value === 'string') {
        return xss(value.trim());
    }
    return value;
};

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Chiropractor validation rules
const chiropractorValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters')
        .customSanitizer(sanitizeInput),
    body('state')
        .trim()
        .notEmpty().withMessage('State is required')
        .isLength({ max: 100 }).withMessage('State must be less than 100 characters')
        .customSanitizer(sanitizeInput),
    body('address')
        .trim()
        .notEmpty().withMessage('Address is required')
        .isLength({ max: 500 }).withMessage('Address must be less than 500 characters')
        .customSanitizer(sanitizeInput),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone is required')
        .matches(/^[\d\s\-\(\)\+\.]+$/).withMessage('Invalid phone number format')
        .isLength({ max: 50 }).withMessage('Phone must be less than 50 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),
    body('website')
        .optional({ checkFalsy: true })
        .trim()
        .isURL({ protocols: ['http', 'https'] }).withMessage('Invalid website URL')
        .isLength({ max: 500 }).withMessage('Website URL must be less than 500 characters'),
    body('specialty')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 255 }).withMessage('Specialty must be less than 255 characters')
        .customSanitizer(sanitizeInput),
    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .customSanitizer(sanitizeInput)
];

// Blog post validation rules
const blogPostValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required')
        .isLength({ min: 5, max: 500 }).withMessage('Title must be between 5 and 500 characters')
        .customSanitizer(sanitizeInput),
    body('content')
        .trim()
        .notEmpty().withMessage('Content is required')
        .isLength({ min: 50 }).withMessage('Content must be at least 50 characters')
        .customSanitizer(sanitizeInput),
    body('author')
        .trim()
        .notEmpty().withMessage('Author is required')
        .isLength({ max: 255 }).withMessage('Author must be less than 255 characters')
        .customSanitizer(sanitizeInput),
    body('excerpt')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 }).withMessage('Excerpt must be less than 500 characters')
        .customSanitizer(sanitizeInput),
    body('featured_image')
        .optional({ checkFalsy: true })
        .trim()
        .isURL({ protocols: ['http', 'https'] }).withMessage('Invalid image URL'),
    body('tags')
        .optional()
        .isArray().withMessage('Tags must be an array'),
    body('tags.*')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Each tag must be less than 50 characters')
        .customSanitizer(sanitizeInput),
    body('meta_title')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 255 }).withMessage('Meta title must be less than 255 characters')
        .customSanitizer(sanitizeInput),
    body('meta_description')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 }).withMessage('Meta description must be less than 500 characters')
        .customSanitizer(sanitizeInput)
];

// Login validation rules
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

// Password change validation
const passwordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number')
];

// Settings validation
const settingsValidation = [
    body('setting_key')
        .trim()
        .notEmpty().withMessage('Setting key is required')
        .isLength({ max: 255 }).withMessage('Setting key must be less than 255 characters')
        .matches(/^[a-z_]+$/).withMessage('Setting key must be lowercase letters and underscores only'),
    body('setting_value')
        .optional()
        .customSanitizer(sanitizeInput)
];

// ID parameter validation
const idValidation = [
    param('id')
        .isInt({ min: 1 }).withMessage('Invalid ID')
];

// Pagination query validation
const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort')
        .optional()
        .isIn(['asc', 'desc']).withMessage('Sort must be asc or desc')
];

module.exports = {
    handleValidationErrors,
    chiropractorValidation,
    blogPostValidation,
    loginValidation,
    passwordValidation,
    settingsValidation,
    idValidation,
    paginationValidation,
    sanitizeInput
};
