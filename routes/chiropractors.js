/**
 * Chiropractor Routes
 */

const express = require('express');
const db = require('../config/database');
const { verifyToken, isAdmin, optionalAuth } = require('../middleware/auth');
const { chiropractorValidation, idValidation, paginationValidation, handleValidationErrors } = require('../middleware/validate');
const { query } = require('express-validator');

const router = express.Router();

// Get all chiropractors (public)
router.get('/', paginationValidation, handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const state = req.query.state;
        const search = req.query.search;

        let queryText = `
            SELECT id, name, state, address, phone, email, website, specialty, is_featured, created_at
            FROM chiropractors
            WHERE is_active = true
        `;
        const params = [];
        let paramCount = 0;

        if (state) {
            paramCount++;
            queryText += ` AND state = $${paramCount}`;
            params.push(state);
        }

        if (search) {
            paramCount++;
            queryText += ` AND (
                name ILIKE $${paramCount} OR
                specialty ILIKE $${paramCount} OR
                address ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
        }

        // Get total count
        const countQuery = queryText.replace(
            'SELECT id, name, state, address, phone, email, website, specialty, is_featured, created_at',
            'SELECT COUNT(*)'
        );
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Add sorting and pagination
        queryText += ` ORDER BY is_featured DESC, name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await db.query(queryText, params);

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
        console.error('Get chiropractors error:', error);
        res.status(500).json({ error: 'Failed to fetch chiropractors' });
    }
});

// Get chiropractors by state (public)
router.get('/state/:state', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, state, address, phone, email, website, specialty, is_featured
             FROM chiropractors
             WHERE state = $1 AND is_active = true
             ORDER BY is_featured DESC, name ASC`,
            [req.params.state]
        );

        res.json({ chiropractors: result.rows });

    } catch (error) {
        console.error('Get chiropractors by state error:', error);
        res.status(500).json({ error: 'Failed to fetch chiropractors' });
    }
});

// Get states with chiropractor counts (public)
router.get('/states', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT state, COUNT(*) as count
            FROM chiropractors
            WHERE is_active = true
            GROUP BY state
            ORDER BY state ASC
        `);

        res.json({ states: result.rows });

    } catch (error) {
        console.error('Get states error:', error);
        res.status(500).json({ error: 'Failed to fetch states' });
    }
});

// Get single chiropractor (public)
router.get('/:id', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, state, address, phone, email, website, specialty, description, is_featured, created_at
             FROM chiropractors
             WHERE id = $1 AND is_active = true`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        res.json({ chiropractor: result.rows[0] });

    } catch (error) {
        console.error('Get chiropractor error:', error);
        res.status(500).json({ error: 'Failed to fetch chiropractor' });
    }
});

// Create chiropractor (admin only)
router.post('/', verifyToken, isAdmin, chiropractorValidation, handleValidationErrors, async (req, res) => {
    try {
        const { name, state, address, phone, email, website, specialty, description, is_featured } = req.body;

        const result = await db.query(
            `INSERT INTO chiropractors (name, state, address, phone, email, website, specialty, description, is_featured)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [name, state, address, phone, email, website || null, specialty || null, description || null, is_featured || false]
        );

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values, ip_address)
             VALUES ($1, 'create', 'chiropractor', $2, $3, $4)`,
            [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
        );

        res.status(201).json({
            message: 'Chiropractor created successfully',
            chiropractor: result.rows[0]
        });

    } catch (error) {
        console.error('Create chiropractor error:', error);
        res.status(500).json({ error: 'Failed to create chiropractor' });
    }
});

// Update chiropractor (admin only)
router.put('/:id', verifyToken, isAdmin, idValidation, chiropractorValidation, handleValidationErrors, async (req, res) => {
    try {
        const { name, state, address, phone, email, website, specialty, description, is_featured } = req.body;

        // Get current values for audit log
        const current = await db.query('SELECT * FROM chiropractors WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        const result = await db.query(
            `UPDATE chiropractors
             SET name = $1, state = $2, address = $3, phone = $4, email = $5,
                 website = $6, specialty = $7, description = $8, is_featured = $9
             WHERE id = $10
             RETURNING *`,
            [name, state, address, phone, email, website || null, specialty || null, description || null, is_featured || false, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
             VALUES ($1, 'update', 'chiropractor', $2, $3, $4, $5)`,
            [req.user.id, req.params.id, JSON.stringify(current.rows[0]), JSON.stringify(result.rows[0]), req.ip]
        );

        res.json({
            message: 'Chiropractor updated successfully',
            chiropractor: result.rows[0]
        });

    } catch (error) {
        console.error('Update chiropractor error:', error);
        res.status(500).json({ error: 'Failed to update chiropractor' });
    }
});

// Delete chiropractor (admin only - soft delete)
router.delete('/:id', verifyToken, isAdmin, idValidation, handleValidationErrors, async (req, res) => {
    try {
        // Get current values for audit log
        const current = await db.query('SELECT * FROM chiropractors WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        // Soft delete
        const result = await db.query(
            `UPDATE chiropractors SET is_active = false WHERE id = $1 RETURNING id`,
            [req.params.id]
        );

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, ip_address)
             VALUES ($1, 'delete', 'chiropractor', $2, $3, $4)`,
            [req.user.id, req.params.id, JSON.stringify(current.rows[0]), req.ip]
        );

        res.json({ message: 'Chiropractor deleted successfully' });

    } catch (error) {
        console.error('Delete chiropractor error:', error);
        res.status(500).json({ error: 'Failed to delete chiropractor' });
    }
});

// Get related chiropractors (same state)
router.get('/:id/related', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 6;

        // First get the chiropractor's state
        const chiroResult = await db.query(
            'SELECT state FROM chiropractors WHERE id = $1 AND is_active = true',
            [req.params.id]
        );

        if (chiroResult.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        // Get related chiropractors from same state
        const result = await db.query(
            `SELECT id, name, state, address, phone, specialty
             FROM chiropractors
             WHERE state = $1 AND id != $2 AND is_active = true
             ORDER BY is_featured DESC, RANDOM()
             LIMIT $3`,
            [chiroResult.rows[0].state, req.params.id, limit]
        );

        res.json({ related: result.rows });

    } catch (error) {
        console.error('Get related chiropractors error:', error);
        res.status(500).json({ error: 'Failed to fetch related chiropractors' });
    }
});

module.exports = router;
