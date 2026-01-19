/**
 * Settings Routes
 */

const express = require('express');
const db = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { settingsValidation, handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// Get all settings (public, but some settings may be filtered)
router.get('/', async (req, res) => {
    try {
        // Public settings (non-sensitive)
        const publicSettings = [
            'site_name', 'site_description', 'site_keywords',
            'primary_color', 'footer_text',
            'social_facebook', 'social_twitter', 'social_linkedin'
        ];

        const result = await db.query(
            `SELECT setting_key, setting_value, setting_type
             FROM site_settings
             WHERE setting_key = ANY($1)`,
            [publicSettings]
        );

        // Convert to object for easier use
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        res.json({ settings });

    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Get all settings (admin only)
router.get('/all', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT setting_key, setting_value, setting_type, description, updated_at
             FROM site_settings
             ORDER BY setting_key`
        );

        // Convert to object
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = {
                value: row.setting_value,
                type: row.setting_type,
                description: row.description,
                updatedAt: row.updated_at
            };
        });

        res.json({ settings });

    } catch (error) {
        console.error('Get all settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update a single setting (admin only)
router.put('/:key', verifyToken, isAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Get current value for audit
        const current = await db.query(
            'SELECT * FROM site_settings WHERE setting_key = $1',
            [key]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        const result = await db.query(
            `UPDATE site_settings
             SET setting_value = $1
             WHERE setting_key = $2
             RETURNING *`,
            [value, key]
        );

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
             VALUES ($1, 'update', 'setting', $2, $3, $4, $5)`,
            [
                req.user.id,
                current.rows[0].id,
                JSON.stringify({ setting_value: current.rows[0].setting_value }),
                JSON.stringify({ setting_value: value }),
                req.ip
            ]
        );

        res.json({
            message: 'Setting updated successfully',
            setting: {
                key: result.rows[0].setting_key,
                value: result.rows[0].setting_value
            }
        });

    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// Bulk update settings (admin only)
router.post('/bulk', verifyToken, isAdmin, async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Invalid settings data' });
        }

        const updated = [];
        for (const [key, value] of Object.entries(settings)) {
            const result = await db.query(
                `UPDATE site_settings
                 SET setting_value = $1
                 WHERE setting_key = $2
                 RETURNING setting_key, setting_value`,
                [value, key]
            );

            if (result.rows.length > 0) {
                updated.push(result.rows[0]);
            }
        }

        // Log bulk update
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, new_values, ip_address)
             VALUES ($1, 'bulk_update', 'settings', $2, $3)`,
            [req.user.id, JSON.stringify(settings), req.ip]
        );

        res.json({
            message: `Updated ${updated.length} settings successfully`,
            updated
        });

    } catch (error) {
        console.error('Bulk update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Create new setting (admin only)
router.post('/', verifyToken, isAdmin, settingsValidation, handleValidationErrors, async (req, res) => {
    try {
        const { setting_key, setting_value, setting_type, description } = req.body;

        // Check if setting already exists
        const existing = await db.query(
            'SELECT id FROM site_settings WHERE setting_key = $1',
            [setting_key]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Setting already exists' });
        }

        const result = await db.query(
            `INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [setting_key, setting_value || '', setting_type || 'text', description || '']
        );

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values, ip_address)
             VALUES ($1, 'create', 'setting', $2, $3, $4)`,
            [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
        );

        res.status(201).json({
            message: 'Setting created successfully',
            setting: result.rows[0]
        });

    } catch (error) {
        console.error('Create setting error:', error);
        res.status(500).json({ error: 'Failed to create setting' });
    }
});

// Delete setting (admin only)
router.delete('/:key', verifyToken, isAdmin, async (req, res) => {
    try {
        const { key } = req.params;

        // Prevent deletion of core settings
        const coreSettings = ['site_name', 'site_description', 'contact_email'];
        if (coreSettings.includes(key)) {
            return res.status(400).json({ error: 'Cannot delete core settings' });
        }

        const current = await db.query(
            'SELECT * FROM site_settings WHERE setting_key = $1',
            [key]
        );

        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        await db.query('DELETE FROM site_settings WHERE setting_key = $1', [key]);

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, old_values, ip_address)
             VALUES ($1, 'delete', 'setting', $2, $3)`,
            [req.user.id, JSON.stringify(current.rows[0]), req.ip]
        );

        res.json({ message: 'Setting deleted successfully' });

    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({ error: 'Failed to delete setting' });
    }
});

module.exports = router;
