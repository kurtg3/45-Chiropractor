/**
 * Database Seeding Script
 * Populates the database with sample data
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const seedData = async () => {
    const client = await pool.connect();

    try {
        console.log('Starting database seeding...');

        await client.query('BEGIN');

        // Sample chiropractors
        const chiropractors = [
            {
                name: 'Dr. Sarah Johnson',
                state: 'California',
                address: '123 Main Street, Los Angeles, CA 90001',
                phone: '(555) 123-4567',
                email: 'sarah.johnson@chiro.com',
                specialty: 'Sports Injury & Rehabilitation',
                website: 'https://www.sarahjohnsonchiro.com',
                description: 'Dr. Sarah Johnson specializes in sports injury rehabilitation and has over 15 years of experience helping athletes recover from injuries.'
            },
            {
                name: 'Dr. Michael Chen',
                state: 'New York',
                address: '456 Broadway Ave, New York, NY 10001',
                phone: '(555) 234-5678',
                email: 'michael.chen@chiro.com',
                specialty: 'Pediatric Chiropractic',
                website: 'https://www.chenpediatricchiro.com',
                description: 'Specializing in gentle pediatric chiropractic care for infants, children, and adolescents.'
            },
            {
                name: 'Dr. Emily Rodriguez',
                state: 'Texas',
                address: '789 Oak Lane, Houston, TX 77001',
                phone: '(555) 345-6789',
                email: 'emily.rodriguez@chiro.com',
                specialty: 'General Chiropractic Care',
                website: 'https://www.rodriguezchiro.com',
                description: 'Providing comprehensive chiropractic care for the whole family with a focus on preventive wellness.'
            },
            {
                name: 'Dr. James Wilson',
                state: 'Florida',
                address: '321 Palm Drive, Miami, FL 33101',
                phone: '(555) 456-7890',
                email: 'james.wilson@chiro.com',
                specialty: 'Spinal Decompression',
                website: 'https://www.wilsonspinalcare.com',
                description: 'Expert in non-surgical spinal decompression therapy for herniated discs and chronic back pain.'
            },
            {
                name: 'Dr. Lisa Anderson',
                state: 'Illinois',
                address: '654 Lake Shore Dr, Chicago, IL 60601',
                phone: '(555) 567-8901',
                email: 'lisa.anderson@chiro.com',
                specialty: 'Prenatal & Postnatal Care',
                website: 'https://www.andersonwellness.com',
                description: 'Specialized care for expecting mothers and new moms, using gentle techniques safe for pregnancy.'
            },
            {
                name: 'Dr. Robert Taylor',
                state: 'Washington',
                address: '987 Pine Street, Seattle, WA 98101',
                phone: '(555) 678-9012',
                email: 'robert.taylor@chiro.com',
                specialty: 'Corrective Exercise & Wellness',
                website: 'https://www.taylorcorrectivecare.com',
                description: 'Combining chiropractic adjustments with corrective exercise programs for lasting results.'
            }
        ];

        for (const chiro of chiropractors) {
            await client.query(`
                INSERT INTO chiropractors (name, state, address, phone, email, specialty, website, description, is_featured)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT DO NOTHING;
            `, [chiro.name, chiro.state, chiro.address, chiro.phone, chiro.email, chiro.specialty, chiro.website, chiro.description, true]);
        }
        console.log('Inserted sample chiropractors');

        // Helper function to create URL-friendly slugs
        const createSlug = (title) => {
            return title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
        };

        // Sample blog posts
        const blogPosts = [
            {
                title: '5 Benefits of Regular Chiropractic Care',
                content: `Regular chiropractic care offers numerous benefits beyond just pain relief. From improved posture to enhanced athletic performance, discover how consistent chiropractic adjustments can transform your overall health and wellness.

Many patients report better sleep quality, reduced stress levels, and improved immune function. Chiropractic care focuses on the relationship between the spine and the nervous system, which controls every function in your body.

By maintaining proper spinal alignment, you can experience better overall health outcomes. Here are the top 5 benefits:

1. **Pain Relief Without Medication** - Chiropractic care addresses the root cause of pain rather than masking symptoms with drugs.

2. **Improved Posture** - Regular adjustments help correct postural imbalances caused by sitting at desks and using electronic devices.

3. **Enhanced Athletic Performance** - Athletes benefit from increased flexibility, range of motion, and faster recovery times.

4. **Better Sleep Quality** - Proper spinal alignment reduces tension and discomfort that can interfere with sleep.

5. **Stronger Immune System** - A healthy nervous system supports optimal immune function.`,
                author: 'Dr. Sarah Johnson',
                tags: ['Health', 'Wellness', 'Benefits'],
                featured_image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop',
                excerpt: 'Discover how regular chiropractic care can improve your overall health and wellness beyond just pain relief.'
            },
            {
                title: 'Understanding Spinal Alignment',
                content: `Spinal alignment is crucial for overall health and wellbeing. Learn about the importance of maintaining proper posture and how chiropractic care can help correct misalignments.

Poor spinal alignment can lead to chronic pain, reduced mobility, and even affect your internal organs. Through gentle adjustments and corrective exercises, chiropractors help restore natural spinal curves and improve nervous system function.

**The Spine and Nervous System Connection**

Your spine protects the spinal cord, which is the main pathway for communication between your brain and body. When vertebrae become misaligned (known as subluxations), they can put pressure on nerves and interfere with this vital communication.

**Signs of Poor Spinal Alignment**

- Uneven shoulders or hips
- Chronic neck or back pain
- Frequent headaches
- Numbness or tingling in extremities
- Reduced range of motion

**How Chiropractic Care Helps**

Chiropractors use precise adjustments to restore proper alignment, reduce nerve interference, and promote natural healing. Combined with exercises and lifestyle modifications, patients can achieve lasting improvements.`,
                author: 'Dr. Michael Chen',
                tags: ['Education', 'Spine Health'],
                featured_image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop',
                excerpt: 'Learn about the importance of spinal alignment and how it affects your overall health and nervous system function.'
            },
            {
                title: 'Sports Injury Prevention Through Chiropractic',
                content: `Athletes of all levels can benefit from chiropractic care to prevent injuries and enhance performance. Discover how regular adjustments can keep you at the top of your game.

Sports chiropractors work with athletes to identify biomechanical imbalances that could lead to injury. Through targeted adjustments, soft tissue therapy, and personalized exercise programs, chiropractic care helps optimize athletic performance while reducing injury risk.

**Common Sports Injuries Treated**

- Sprains and strains
- Tennis elbow and golfer's elbow
- Rotator cuff injuries
- Runner's knee
- Plantar fasciitis
- Back and neck pain

**Preventive Strategies**

1. **Pre-Season Screening** - Identify potential problems before they become injuries
2. **Regular Maintenance** - Keep your body in optimal condition throughout the season
3. **Recovery Support** - Speed up recovery between training sessions and competitions
4. **Biomechanical Analysis** - Improve movement patterns for better efficiency

**Working with Professional Athletes**

Many professional sports teams employ chiropractors as part of their medical staff. From the NFL to the Olympics, athletes rely on chiropractic care to stay competitive and healthy.`,
                author: 'Dr. Emily Rodriguez',
                tags: ['Sports', 'Prevention', 'Athletes'],
                featured_image: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&h=400&fit=crop',
                excerpt: 'Learn how athletes use chiropractic care to prevent injuries and optimize their performance.'
            }
        ];

        for (const post of blogPosts) {
            const slug = createSlug(post.title);
            await client.query(`
                INSERT INTO blog_posts (title, slug, content, excerpt, author, tags, featured_image, meta_title, meta_description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (slug) DO NOTHING;
            `, [post.title, slug, post.content, post.excerpt, post.author, post.tags, post.featured_image, post.title, post.excerpt]);
        }
        console.log('Inserted sample blog posts');

        await client.query('COMMIT');
        console.log('Database seeding completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

seedData().catch(console.error);
