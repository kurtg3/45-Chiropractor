/**
 * Admin Routes
 * Dashboard and management endpoints
 */

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const { body, query } = require('express-validator');

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(verifyToken);
router.use(isAdmin);

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        const stats = await Promise.all([
            db.query('SELECT COUNT(*) FROM chiropractors WHERE is_active = true'),
            db.query('SELECT COUNT(*) FROM blog_posts WHERE is_published = true'),
            db.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
            db.query('SELECT SUM(views) FROM blog_posts'),
            db.query(`
                SELECT state, COUNT(*) as count
                FROM chiropractors
                WHERE is_active = true
                GROUP BY state
                ORDER BY count DESC
                LIMIT 5
            `),
            db.query(`
                SELECT id, title, views, created_at
                FROM blog_posts
                WHERE is_published = true
                ORDER BY views DESC
                LIMIT 5
            `),
            db.query(`
                SELECT action, COUNT(*) as count
                FROM audit_log
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY action
                ORDER BY count DESC
            `)
        ]);

        res.json({
            totalChiropractors: parseInt(stats[0].rows[0].count),
            totalBlogPosts: parseInt(stats[1].rows[0].count),
            totalUsers: parseInt(stats[2].rows[0].count),
            totalBlogViews: parseInt(stats[3].rows[0].sum) || 0,
            topStates: stats[4].rows,
            popularPosts: stats[5].rows,
            recentActivity: stats[6].rows
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get all chiropractors (including inactive) for admin
router.get('/chiropractors', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const countResult = await db.query('SELECT COUNT(*) FROM chiropractors');
        const total = parseInt(countResult.rows[0].count);

        const result = await db.query(
            `SELECT * FROM chiropractors
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            chiropractors: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Admin get chiropractors error:', error);
        res.status(500).json({ error: 'Failed to fetch chiropractors' });
    }
});

// Get all blog posts (including unpublished) for admin
router.get('/blog-posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const countResult = await db.query('SELECT COUNT(*) FROM blog_posts');
        const total = parseInt(countResult.rows[0].count);

        const result = await db.query(
            `SELECT * FROM blog_posts
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            posts: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Admin get blog posts error:', error);
        res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
});

// Restore soft-deleted chiropractor
router.post('/chiropractors/:id/restore', async (req, res) => {
    try {
        const result = await db.query(
            `UPDATE chiropractors SET is_active = true WHERE id = $1 RETURNING *`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address)
             VALUES ($1, 'restore', 'chiropractor', $2, $3)`,
            [req.user.id, req.params.id, req.ip]
        );

        res.json({
            message: 'Chiropractor restored successfully',
            chiropractor: result.rows[0]
        });

    } catch (error) {
        console.error('Restore chiropractor error:', error);
        res.status(500).json({ error: 'Failed to restore chiropractor' });
    }
});

// Permanently delete chiropractor
router.delete('/chiropractors/:id/permanent', async (req, res) => {
    try {
        const current = await db.query('SELECT * FROM chiropractors WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        await db.query('DELETE FROM chiropractors WHERE id = $1', [req.params.id]);

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, ip_address)
             VALUES ($1, 'permanent_delete', 'chiropractor', $2, $3, $4)`,
            [req.user.id, req.params.id, JSON.stringify(current.rows[0]), req.ip]
        );

        res.json({ message: 'Chiropractor permanently deleted' });

    } catch (error) {
        console.error('Permanent delete chiropractor error:', error);
        res.status(500).json({ error: 'Failed to delete chiropractor' });
    }
});

// Toggle blog post publish status
router.post('/blog-posts/:id/toggle-publish', async (req, res) => {
    try {
        const current = await db.query('SELECT * FROM blog_posts WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        const newStatus = !current.rows[0].is_published;
        const publishedAt = newStatus ? (current.rows[0].published_at || new Date()) : null;

        const result = await db.query(
            `UPDATE blog_posts SET is_published = $1, published_at = $2 WHERE id = $3 RETURNING *`,
            [newStatus, publishedAt, req.params.id]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
             VALUES ($1, $2, 'blog_post', $3, $4, $5, $6)`,
            [
                req.user.id,
                newStatus ? 'publish' : 'unpublish',
                req.params.id,
                JSON.stringify({ is_published: current.rows[0].is_published }),
                JSON.stringify({ is_published: newStatus }),
                req.ip
            ]
        );

        res.json({
            message: `Blog post ${newStatus ? 'published' : 'unpublished'} successfully`,
            post: result.rows[0]
        });

    } catch (error) {
        console.error('Toggle publish error:', error);
        res.status(500).json({ error: 'Failed to toggle publish status' });
    }
});

// Get audit log
router.get('/audit-log', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const countResult = await db.query('SELECT COUNT(*) FROM audit_log');
        const total = parseInt(countResult.rows[0].count);

        const result = await db.query(
            `SELECT al.*, u.email as user_email, u.name as user_name
             FROM audit_log al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            logs: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get audit log error:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

// User management - get all users
router.get('/users', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, email, name, role, is_active, created_at, updated_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.json({ users: result.rows });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create new admin user
router.post('/users', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty()
], handleValidationErrors, async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if email already exists
        const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        const result = await db.query(
            `INSERT INTO users (email, password, name, role)
             VALUES ($1, $2, $3, 'admin')
             RETURNING id, email, name, role, created_at`,
            [email, hashedPassword, name]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address)
             VALUES ($1, 'create_user', 'user', $2, $3)`,
            [req.user.id, result.rows[0].id, req.ip]
        );

        res.status(201).json({
            message: 'User created successfully',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Toggle user active status
router.post('/users/:id/toggle-active', async (req, res) => {
    try {
        // Prevent self-deactivation
        if (parseInt(req.params.id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }

        const current = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const result = await db.query(
            `UPDATE users SET is_active = NOT is_active WHERE id = $1
             RETURNING id, email, name, role, is_active`,
            [req.params.id]
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address)
             VALUES ($1, $2, 'user', $3, $4)`,
            [req.user.id, result.rows[0].is_active ? 'activate_user' : 'deactivate_user', req.params.id, req.ip]
        );

        res.json({
            message: `User ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Toggle user active error:', error);
        res.status(500).json({ error: 'Failed to toggle user status' });
    }
});

// Export data
router.get('/export/:type', async (req, res) => {
    try {
        const { type } = req.params;
        let data;

        if (type === 'chiropractors') {
            const result = await db.query('SELECT * FROM chiropractors ORDER BY name');
            data = result.rows;
        } else if (type === 'blog-posts') {
            const result = await db.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
            data = result.rows;
        } else {
            return res.status(400).json({ error: 'Invalid export type' });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-export-${Date.now()}.json`);
        res.json(data);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

module.exports = router;
