// US States List
const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
    'Wisconsin', 'Wyoming'
];

// Initialize sample data if needed
function initializeSampleData() {
    if (!localStorage.getItem('chiropractors')) {
        const sampleChiropractors = [
            {
                id: generateId(),
                name: 'Dr. Sarah Johnson',
                state: 'California',
                address: '123 Main Street, Los Angeles, CA 90001',
                phone: '(555) 123-4567',
                email: 'sarah.johnson@chiro.com',
                specialty: 'Sports Injury & Rehabilitation',
                website: 'https://www.sarahjohnsonchiro.com'
            },
            {
                id: generateId(),
                name: 'Dr. Michael Chen',
                state: 'New York',
                address: '456 Broadway Ave, New York, NY 10001',
                phone: '(555) 234-5678',
                email: 'michael.chen@chiro.com',
                specialty: 'Pediatric Chiropractic',
                website: 'https://www.chenpediatricchiro.com'
            },
            {
                id: generateId(),
                name: 'Dr. Emily Rodriguez',
                state: 'Texas',
                address: '789 Oak Lane, Houston, TX 77001',
                phone: '(555) 345-6789',
                email: 'emily.rodriguez@chiro.com',
                specialty: 'General Chiropractic Care',
                website: 'https://www.rodriguezchiro.com'
            },
            {
                id: generateId(),
                name: 'Dr. James Wilson',
                state: 'Florida',
                address: '321 Palm Drive, Miami, FL 33101',
                phone: '(555) 456-7890',
                email: 'james.wilson@chiro.com',
                specialty: 'Spinal Decompression',
                website: 'https://www.wilsonspinalcare.com'
            },
            {
                id: generateId(),
                name: 'Dr. Lisa Anderson',
                state: 'Illinois',
                address: '654 Lake Shore Dr, Chicago, IL 60601',
                phone: '(555) 567-8901',
                email: 'lisa.anderson@chiro.com',
                specialty: 'Prenatal & Postnatal Care',
                website: 'https://www.andersonwellness.com'
            },
            {
                id: generateId(),
                name: 'Dr. Robert Taylor',
                state: 'Washington',
                address: '987 Pine Street, Seattle, WA 98101',
                phone: '(555) 678-9012',
                email: 'robert.taylor@chiro.com',
                specialty: 'Corrective Exercise & Wellness',
                website: 'https://www.taylorcorrectivecare.com'
            }
        ];
        localStorage.setItem('chiropractors', JSON.stringify(sampleChiropractors));
    }

    if (!localStorage.getItem('blogPosts')) {
        const samplePosts = [
            {
                id: generateId(),
                title: '5 Benefits of Regular Chiropractic Care',
                content: 'Regular chiropractic care offers numerous benefits beyond just pain relief. From improved posture to enhanced athletic performance, discover how consistent chiropractic adjustments can transform your overall health and wellness. Many patients report better sleep quality, reduced stress levels, and improved immune function. Chiropractic care focuses on the relationship between the spine and the nervous system, which controls every function in your body. By maintaining proper spinal alignment, you can experience better overall health outcomes.',
                author: 'Dr. Sarah Johnson',
                date: new Date().toISOString(),
                tags: ['Health', 'Wellness', 'Benefits'],
                featuredImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop'
            },
            {
                id: generateId(),
                title: 'Understanding Spinal Alignment',
                content: 'Spinal alignment is crucial for overall health and wellbeing. Learn about the importance of maintaining proper posture and how chiropractic care can help correct misalignments. Poor spinal alignment can lead to chronic pain, reduced mobility, and even affect your internal organs. Through gentle adjustments and corrective exercises, chiropractors help restore natural spinal curves and improve nervous system function. This article explores the biomechanics of the spine and how small adjustments can make a big difference in your daily life.',
                author: 'Dr. Michael Chen',
                date: new Date(Date.now() - 86400000 * 5).toISOString(),
                tags: ['Education', 'Spine Health'],
                featuredImage: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop'
            },
            {
                id: generateId(),
                title: 'Sports Injury Prevention Through Chiropractic',
                content: 'Athletes of all levels can benefit from chiropractic care to prevent injuries and enhance performance. Discover how regular adjustments can keep you at the top of your game. Sports chiropractors work with athletes to identify biomechanical imbalances that could lead to injury. Through targeted adjustments, soft tissue therapy, and personalized exercise programs, chiropractic care helps optimize athletic performance while reducing injury risk. Learn about specific techniques used for different sports and how to incorporate chiropractic care into your training regimen.',
                author: 'Dr. Emily Rodriguez',
                date: new Date(Date.now() - 86400000 * 10).toISOString(),
                tags: ['Sports', 'Prevention', 'Athletes'],
                featuredImage: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=800&h=400&fit=crop'
            }
        ];
        localStorage.setItem('blogPosts', JSON.stringify(samplePosts));
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Chiropractor Management Functions
function getChiropractors() {
    const data = localStorage.getItem('chiropractors');
    return data ? JSON.parse(data) : [];
}

function saveChiropractors(chiropractors) {
    localStorage.setItem('chiropractors', JSON.stringify(chiropractors));
}

function addChiropractor(chiropractor) {
    const chiropractors = getChiropractors();
    chiropractor.id = generateId();
    chiropractors.push(chiropractor);
    saveChiropractors(chiropractors);
    return chiropractor;
}

function updateChiropractor(id, updatedData) {
    const chiropractors = getChiropractors();
    const index = chiropractors.findIndex(c => c.id === id);
    if (index !== -1) {
        chiropractors[index] = { ...chiropractors[index], ...updatedData };
        saveChiropractors(chiropractors);
        return true;
    }
    return false;
}

function deleteChiropractor(id) {
    const chiropractors = getChiropractors();
    const filtered = chiropractors.filter(c => c.id !== id);
    saveChiropractors(filtered);
    return true;
}

function getChiropractorsByState(state) {
    const chiropractors = getChiropractors();
    return chiropractors.filter(c => c.state === state);
}

function getChiropractorById(id) {
    const chiropractors = getChiropractors();
    return chiropractors.find(c => c.id === id);
}

function createSlug(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Blog Post Management Functions
function getBlogPosts() {
    const data = localStorage.getItem('blogPosts');
    const posts = data ? JSON.parse(data) : [];
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function saveBlogPosts(posts) {
    localStorage.setItem('blogPosts', JSON.stringify(posts));
}

function addBlogPost(post) {
    const posts = getBlogPosts();
    post.id = generateId();
    post.date = new Date().toISOString();
    posts.push(post);
    saveBlogPosts(posts);
    return post;
}

function updateBlogPost(id, updatedData) {
    const posts = getBlogPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index !== -1) {
        posts[index] = { ...posts[index], ...updatedData };
        saveBlogPosts(posts);
        return true;
    }
    return false;
}

function deleteBlogPost(id) {
    const posts = getBlogPosts();
    const filtered = posts.filter(p => p.id !== id);
    saveBlogPosts(filtered);
    return true;
}

function getBlogPostById(id) {
    const posts = getBlogPosts();
    return posts.find(p => p.id === id);
}

// Utility Functions
function populateStateSelector(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    US_STATES.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Initialize data on page load
initializeSampleData();
