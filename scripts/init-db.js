/**
 * Database Initialization Script
 * Creates all necessary tables for the Just Chiropractor application
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const createTables = async () => {
    const client = await pool.connect();

    try {
        console.log('Starting database initialization...');

        await client.query('BEGIN');

        // Create users table (for admin authentication)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255),
                role VARCHAR(50) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created users table');

        // Create chiropractors table
        await client.query(`
            CREATE TABLE IF NOT EXISTS chiropractors (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                state VARCHAR(100) NOT NULL,
                address TEXT NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL,
                website VARCHAR(500),
                specialty VARCHAR(255),
                description TEXT,
                is_featured BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created chiropractors table');

        // Create blog_posts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id SERIAL PRIMARY KEY,
                title VARCHAR(500) NOT NULL,
                slug VARCHAR(500) UNIQUE NOT NULL,
                content TEXT NOT NULL,
                excerpt TEXT,
                author VARCHAR(255) NOT NULL,
                featured_image VARCHAR(500),
                tags TEXT[],
                meta_title VARCHAR(255),
                meta_description TEXT,
                is_published BOOLEAN DEFAULT true,
                views INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created blog_posts table');

        // Create site_settings table
        await client.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(255) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type VARCHAR(50) DEFAULT 'text',
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created site_settings table');

        // Create sessions table (for session management)
        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR(255) PRIMARY KEY,
                sess JSON NOT NULL,
                expire TIMESTAMP(6) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);
        `);
        console.log('Created sessions table');

        // Create audit_log table (for tracking admin actions)
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(100) NOT NULL,
                entity_type VARCHAR(100),
                entity_id INTEGER,
                old_values JSONB,
                new_values JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created audit_log table');

        // Create indexes for better query performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_chiropractors_state ON chiropractors(state);
            CREATE INDEX IF NOT EXISTS idx_chiropractors_name ON chiropractors(name);
            CREATE INDEX IF NOT EXISTS idx_chiropractors_specialty ON chiropractors(specialty);
            CREATE INDEX IF NOT EXISTS idx_chiropractors_active ON chiropractors(is_active);
            CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
            CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);
            CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON blog_posts(created_at DESC);
        `);
        console.log('Created indexes');

        // Create update trigger function
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

        // Apply triggers to tables
        const tables = ['users', 'chiropractors', 'blog_posts', 'site_settings'];
        for (const table of tables) {
            await client.query(`
                DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
                CREATE TRIGGER update_${table}_updated_at
                    BEFORE UPDATE ON ${table}
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);
        }
        console.log('Created update triggers');

        // Create default admin user
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@justchiropractor.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
        const hashedPassword = await bcrypt.hash(adminPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        await client.query(`
            INSERT INTO users (email, password, name, role)
            VALUES ($1, $2, 'Administrator', 'admin')
            ON CONFLICT (email) DO NOTHING;
        `, [adminEmail, hashedPassword]);
        console.log('Created default admin user');

        // Insert default site settings
        const defaultSettings = [
            ['site_name', 'Just Chiropractor', 'text', 'The name of the website'],
            ['site_description', 'Find trusted chiropractors across the USA', 'text', 'Default site description for SEO'],
            ['site_keywords', 'chiropractor, chiropractic care, spine health, wellness', 'text', 'Default keywords for SEO'],
            ['contact_email', 'contact@justchiropractor.com', 'text', 'Main contact email'],
            ['primary_color', '#2563eb', 'color', 'Primary brand color'],
            ['footer_text', '© 2025 Just Chiropractor. All rights reserved.', 'text', 'Footer copyright text'],
            ['google_analytics_id', '', 'text', 'Google Analytics tracking ID'],
            ['social_facebook', '', 'url', 'Facebook page URL'],
            ['social_twitter', '', 'url', 'Twitter profile URL'],
            ['social_linkedin', '', 'url', 'LinkedIn page URL']
        ];

        for (const [key, value, type, description] of defaultSettings) {
            await client.query(`
                INSERT INTO site_settings (setting_key, setting_value, setting_type, description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (setting_key) DO NOTHING;
            `, [key, value, type, description]);
        }
        console.log('Inserted default site settings');

        await client.query('COMMIT');
        console.log('Database initialization completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

createTables().catch(console.error);
