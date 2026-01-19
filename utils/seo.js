/**
 * SEO Utilities
 * Helper functions for generating SEO content
 */

const db = require('../config/database');

/**
 * Generate dynamic XML sitemap
 */
const generateSitemap = async () => {
    const baseUrl = process.env.SITE_URL || 'https://justchiropractor.com';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    const staticPages = [
        { url: '', priority: '1.0', changefreq: 'daily' },
        { url: 'directory', priority: '0.9', changefreq: 'daily' },
        { url: 'blog', priority: '0.8', changefreq: 'daily' }
    ];

    staticPages.forEach(page => {
        xml += `
    <url>
        <loc>${baseUrl}/${page.url}</loc>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
    </url>`;
    });

    try {
        // Get all states with chiropractors
        const statesResult = await db.query(`
            SELECT DISTINCT state FROM chiropractors WHERE is_active = true ORDER BY state
        `);

        statesResult.rows.forEach(row => {
            xml += `
    <url>
        <loc>${baseUrl}/directory?state=${encodeURIComponent(row.state)}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`;
        });

        // Get all published blog posts
        const postsResult = await db.query(`
            SELECT slug, updated_at FROM blog_posts WHERE is_published = true ORDER BY published_at DESC
        `);

        postsResult.rows.forEach(row => {
            const lastmod = row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : '';
            xml += `
    <url>
        <loc>${baseUrl}/blog/${row.slug}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
        ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    </url>`;
        });

        // Get all chiropractors
        const chirosResult = await db.query(`
            SELECT id, name, updated_at FROM chiropractors WHERE is_active = true ORDER BY name
        `);

        chirosResult.rows.forEach(row => {
            const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const lastmod = row.updated_at ? new Date(row.updated_at).toISOString().split('T')[0] : '';
            xml += `
    <url>
        <loc>${baseUrl}/chiropractor/${row.id}/${slug}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
        ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    </url>`;
        });

    } catch (error) {
        console.error('Error generating sitemap:', error);
    }

    xml += `
</urlset>`;

    return xml;
};

/**
 * Generate robots.txt content
 */
const generateRobotsTxt = () => {
    const baseUrl = process.env.SITE_URL || 'https://justchiropractor.com';

    return `# Robots.txt for Just Chiropractor
User-agent: *
Allow: /

# Disallow admin pages
Disallow: /admin
Disallow: /admin/
Disallow: /api/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1
`;
};

module.exports = {
    generateSitemap,
    generateRobotsTxt
};
