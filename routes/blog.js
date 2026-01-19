/**
 * Blog Routes
 */

const express = require('express');
const db = require('../config/database');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { blogPostValidation, idValidation, paginationValidation, handleValidationErrors } = require('../middleware/validate');
const { param } = require('express-validator');

const router = express.Router();

// Helper function to create URL-friendly slugs
const createSlug = (title, id = '') => {
    const baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return id ? `${baseSlug}-${id}` : baseSlug;
};

// Get all blog posts (public)
router.get('/', paginationValidation, handleValidationErrors, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const tag = req.query.tag;
        const search = req.query.search;

        let queryText = `
            SELECT id, title, slug, excerpt, author, featured_image, tags, views, created_at, published_at
            FROM blog_posts
            WHERE is_published = true
        `;
        const params = [];
        let paramCount = 0;

        if (tag) {
            paramCount++;
            queryText += ` AND $${paramCount} = ANY(tags)`;
            params.push(tag);
        }

        if (search) {
            paramCount++;
            queryText += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Get total count
        const countQuery = queryText.replace(
            'SELECT id, title, slug, excerpt, author, featured_image, tags, views, created_at, published_at',
            'SELECT COUNT(*)'
        );
        const countResult = await db.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Add sorting and pagination
        queryText += ` ORDER BY published_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await db.query(queryText, params);

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
        console.error('Get blog posts error:', error);
        res.status(500).json({ error: 'Failed to fetch blog posts' });
    }
});

// Get single blog post by slug (public)
router.get('/slug/:slug', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, slug, content, excerpt, author, featured_image, tags,
                    meta_title, meta_description, views, created_at, published_at
             FROM blog_posts
             WHERE slug = $1 AND is_published = true`,
            [req.params.slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        // Increment view count
        await db.query(
            'UPDATE blog_posts SET views = views + 1 WHERE id = $1',
            [result.rows[0].id]
        );

        res.json({ post: result.rows[0] });

    } catch (error) {
        console.error('Get blog post error:', error);
        res.status(500).json({ error: 'Failed to fetch blog post' });
    }
});

// Get single blog post by ID (public)
router.get('/:id', idValidation, handleValidationErrors, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, title, slug, content, excerpt, author, featured_image, tags,
                    meta_title, meta_description, views, created_at, published_at
             FROM blog_posts
             WHERE id = $1 AND is_published = true`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        // Increment view count
        await db.query(
            'UPDATE blog_posts SET views = views + 1 WHERE id = $1',
            [result.rows[0].id]
        );

        res.json({ post: result.rows[0] });

    } catch (error) {
        console.error('Get blog post error:', error);
        res.status(500).json({ error: 'Failed to fetch blog post' });
    }
});

// Get all tags (public)
router.get('/meta/tags', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
            FROM blog_posts
            WHERE is_published = true AND tags IS NOT NULL
            GROUP BY tag
            ORDER BY count DESC, tag ASC
        `);

        res.json({ tags: result.rows });

    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ error: 'Failed to fetch tags' });
    }
});

// Create blog post (admin only)
router.post('/', verifyToken, isAdmin, blogPostValidation, handleValidationErrors, async (req, res) => {
    try {
        const { title, content, author, excerpt, featured_image, tags, meta_title, meta_description, is_published } = req.body;

        // Generate unique slug
        let slug = createSlug(title);

        // Check if slug exists
        const existingSlug = await db.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
        if (existingSlug.rows.length > 0) {
            slug = createSlug(title, Date.now().toString(36));
        }

        const result = await db.query(
            `INSERT INTO blog_posts (title, slug, content, excerpt, author, featured_image, tags, meta_title, meta_description, is_published, published_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                title, slug, content,
                excerpt || content.substring(0, 200),
                author,
                featured_image || null,
                tags || [],
                meta_title || title,
                meta_description || excerpt || content.substring(0, 160),
                is_published !== false,
                is_published !== false ? new Date() : null
            ]
        );

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values, ip_address)
             VALUES ($1, 'create', 'blog_post', $2, $3, $4)`,
            [req.user.id, result.rows[0].id, JSON.stringify(result.rows[0]), req.ip]
        );

        res.status(201).json({
            message: 'Blog post created successfully',
            post: result.rows[0]
        });

    } catch (error) {
        console.error('Create blog post error:', error);
        res.status(500).json({ error: 'Failed to create blog post' });
    }
});

// Update blog post (admin only)
router.put('/:id', verifyToken, isAdmin, idValidation, blogPostValidation, handleValidationErrors, async (req, res) => {
    try {
        const { title, content, author, excerpt, featured_image, tags, meta_title, meta_description, is_published } = req.body;

        // Get current values for audit log
        const current = await db.query('SELECT * FROM blog_posts WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        // Update slug if title changed
        let slug = current.rows[0].slug;
        if (title !== current.rows[0].title) {
            slug = createSlug(title);
            const existingSlug = await db.query('SELECT id FROM blog_posts WHERE slug = $1 AND id != $2', [slug, req.params.id]);
            if (existingSlug.rows.length > 0) {
                slug = createSlug(title, Date.now().toString(36));
            }
        }

        // Handle publishing
        let publishedAt = current.rows[0].published_at;
        if (is_published && !current.rows[0].is_published) {
            publishedAt = new Date();
        } else if (!is_published) {
            publishedAt = null;
        }

        const result = await db.query(
            `UPDATE blog_posts
             SET title = $1, slug = $2, content = $3, excerpt = $4, author = $5,
                 featured_image = $6, tags = $7, meta_title = $8, meta_description = $9,
                 is_published = $10, published_at = $11
             WHERE id = $12
             RETURNING *`,
            [
                title, slug, content,
                excerpt || content.substring(0, 200),
                author,
                featured_image || null,
                tags || [],
                meta_title || title,
                meta_description || excerpt || content.substring(0, 160),
                is_published !== false,
                publishedAt,
                req.params.id
            ]
        );

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
             VALUES ($1, 'update', 'blog_post', $2, $3, $4, $5)`,
            [req.user.id, req.params.id, JSON.stringify(current.rows[0]), JSON.stringify(result.rows[0]), req.ip]
        );

        res.json({
            message: 'Blog post updated successfully',
            post: result.rows[0]
        });

    } catch (error) {
        console.error('Update blog post error:', error);
        res.status(500).json({ error: 'Failed to update blog post' });
    }
});

// Delete blog post (admin only)
router.delete('/:id', verifyToken, isAdmin, idValidation, handleValidationErrors, async (req, res) => {
    try {
        // Get current values for audit log
        const current = await db.query('SELECT * FROM blog_posts WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        // Hard delete for blog posts
        await db.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);

        // Log the action
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_values, ip_address)
             VALUES ($1, 'delete', 'blog_post', $2, $3, $4)`,
            [req.user.id, req.params.id, JSON.stringify(current.rows[0]), req.ip]
        );

        res.json({ message: 'Blog post deleted successfully' });

    } catch (error) {
        console.error('Delete blog post error:', error);
        res.status(500).json({ error: 'Failed to delete blog post' });
    }
});

module.exports = router;
