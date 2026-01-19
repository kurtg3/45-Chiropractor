/**
 * SEO Routes
 * Dynamic sitemap, robots.txt, and meta data
 */

const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get SEO data for a page
router.get('/page/:page', async (req, res) => {
    try {
        const { page } = req.params;

        // Get site settings
        const settingsResult = await db.query(
            `SELECT setting_key, setting_value FROM site_settings
             WHERE setting_key IN ('site_name', 'site_description', 'site_keywords', 'site_url')`
        );

        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        let seoData = {
            title: settings.site_name || 'Just Chiropractor',
            description: settings.site_description || 'Find trusted chiropractors across the USA',
            keywords: settings.site_keywords || 'chiropractor, chiropractic care, spine health',
            canonical: `${settings.site_url || 'https://justchiropractor.com'}/${page === 'home' ? '' : page}`,
            ogType: 'website',
            ogImage: `${settings.site_url || 'https://justchiropractor.com'}/images/og-default.jpg`
        };

        // Page-specific SEO
        switch (page) {
            case 'home':
                seoData.title = `${settings.site_name} - Find Chiropractors Across the USA`;
                break;
            case 'directory':
                seoData.title = `Chiropractor Directory - ${settings.site_name}`;
                seoData.description = 'Browse our comprehensive directory of chiropractors across all 50 states.';
                break;
            case 'blog':
                seoData.title = `Chiropractic Blog - ${settings.site_name}`;
                seoData.description = 'Read the latest articles about chiropractic care, health tips, and wellness advice.';
                break;
            default:
                break;
        }

        res.json({ seo: seoData });

    } catch (error) {
        console.error('Get SEO data error:', error);
        res.status(500).json({ error: 'Failed to fetch SEO data' });
    }
});

// Get SEO data for a blog post
router.get('/blog/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const result = await db.query(
            `SELECT title, excerpt, meta_title, meta_description, featured_image, author, published_at
             FROM blog_posts
             WHERE slug = $1 AND is_published = true`,
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
        }

        const post = result.rows[0];

        // Get site settings
        const settingsResult = await db.query(
            `SELECT setting_key, setting_value FROM site_settings
             WHERE setting_key IN ('site_name', 'site_url')`
        );

        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        const seoData = {
            title: post.meta_title || post.title,
            description: post.meta_description || post.excerpt,
            canonical: `${settings.site_url || 'https://justchiropractor.com'}/blog/${slug}`,
            ogType: 'article',
            ogImage: post.featured_image || `${settings.site_url || 'https://justchiropractor.com'}/images/og-default.jpg`,
            article: {
                author: post.author,
                publishedTime: post.published_at
            }
        };

        res.json({ seo: seoData });

    } catch (error) {
        console.error('Get blog SEO error:', error);
        res.status(500).json({ error: 'Failed to fetch SEO data' });
    }
});

// Get SEO data for a chiropractor
router.get('/chiropractor/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `SELECT name, state, specialty, address, phone, email
             FROM chiropractors
             WHERE id = $1 AND is_active = true`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chiropractor not found' });
        }

        const chiro = result.rows[0];

        // Get site settings
        const settingsResult = await db.query(
            `SELECT setting_key, setting_value FROM site_settings
             WHERE setting_key IN ('site_name', 'site_url')`
        );

        const settings = {};
        settingsResult.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        const seoData = {
            title: `${chiro.name} - ${chiro.state} Chiropractor | ${settings.site_name || 'Just Chiropractor'}`,
            description: `${chiro.name} - ${chiro.specialty || 'Chiropractor'} in ${chiro.state}. Contact: ${chiro.phone}. Find detailed information and contact this trusted chiropractic professional.`,
            keywords: `${chiro.name}, chiropractor ${chiro.state}, ${chiro.specialty || 'chiropractic care'}`,
            canonical: `${settings.site_url || 'https://justchiropractor.com'}/chiropractor/${id}`,
            ogType: 'profile',
            schema: {
                '@context': 'https://schema.org',
                '@type': 'MedicalBusiness',
                'name': chiro.name,
                'medicalSpecialty': chiro.specialty || 'Chiropractic',
                'address': {
                    '@type': 'PostalAddress',
                    'streetAddress': chiro.address,
                    'addressRegion': chiro.state,
                    'addressCountry': 'US'
                },
                'telephone': chiro.phone,
                'email': chiro.email
            }
        };

        res.json({ seo: seoData });

    } catch (error) {
        console.error('Get chiropractor SEO error:', error);
        res.status(500).json({ error: 'Failed to fetch SEO data' });
    }
});

// Generate dynamic sitemap data
router.get('/sitemap-data', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://justchiropractor.com';

        // Static pages
        const pages = [
            { url: '/', priority: 1.0, changefreq: 'daily' },
            { url: '/directory', priority: 0.9, changefreq: 'daily' },
            { url: '/blog', priority: 0.8, changefreq: 'daily' }
        ];

        // Get all states with chiropractors
        const statesResult = await db.query(`
            SELECT DISTINCT state FROM chiropractors WHERE is_active = true ORDER BY state
        `);

        statesResult.rows.forEach(row => {
            pages.push({
                url: `/directory?state=${encodeURIComponent(row.state)}`,
                priority: 0.7,
                changefreq: 'weekly'
            });
        });

        // Get all published blog posts
        const postsResult = await db.query(`
            SELECT slug, updated_at FROM blog_posts WHERE is_published = true ORDER BY published_at DESC
        `);

        postsResult.rows.forEach(row => {
            pages.push({
                url: `/blog/${row.slug}`,
                priority: 0.6,
                changefreq: 'monthly',
                lastmod: row.updated_at
            });
        });

        // Get all chiropractors
        const chirosResult = await db.query(`
            SELECT id, name, updated_at FROM chiropractors WHERE is_active = true ORDER BY name
        `);

        chirosResult.rows.forEach(row => {
            const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            pages.push({
                url: `/chiropractor/${row.id}/${slug}`,
                priority: 0.5,
                changefreq: 'monthly',
                lastmod: row.updated_at
            });
        });

        res.json({ baseUrl, pages });

    } catch (error) {
        console.error('Generate sitemap data error:', error);
        res.status(500).json({ error: 'Failed to generate sitemap data' });
    }
});

module.exports = router;
