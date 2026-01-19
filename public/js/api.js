/**
 * API Client for Just Chiropractor
 * Handles all communication with the backend API
 */

const API = {
    baseUrl: '/api',
    token: localStorage.getItem('authToken'),

    // Set auth token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    },

    // Get auth headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    },

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            },
            credentials: 'include'
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // GET request
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST request
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT request
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Auth methods
    auth: {
        async login(email, password) {
            const response = await API.post('/auth/login', { email, password });
            if (response.token) {
                API.setToken(response.token);
            }
            return response;
        },

        async logout() {
            try {
                await API.post('/auth/logout', {});
            } finally {
                API.setToken(null);
            }
        },

        async getCurrentUser() {
            return API.get('/auth/me');
        },

        async changePassword(currentPassword, newPassword) {
            return API.post('/auth/change-password', { currentPassword, newPassword });
        },

        async verifyToken() {
            return API.get('/auth/verify');
        },

        isAuthenticated() {
            return !!API.token;
        }
    },

    // Chiropractor methods
    chiropractors: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/chiropractors${query ? '?' + query : ''}`);
        },

        async getById(id) {
            return API.get(`/chiropractors/${id}`);
        },

        async getByState(state) {
            return API.get(`/chiropractors/state/${encodeURIComponent(state)}`);
        },

        async getStates() {
            return API.get('/chiropractors/states');
        },

        async getRelated(id, limit = 6) {
            return API.get(`/chiropractors/${id}/related?limit=${limit}`);
        },

        async create(data) {
            return API.post('/chiropractors', data);
        },

        async update(id, data) {
            return API.put(`/chiropractors/${id}`, data);
        },

        async delete(id) {
            return API.delete(`/chiropractors/${id}`);
        }
    },

    // Blog methods
    blog: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/blog${query ? '?' + query : ''}`);
        },

        async getById(id) {
            return API.get(`/blog/${id}`);
        },

        async getBySlug(slug) {
            return API.get(`/blog/slug/${slug}`);
        },

        async getTags() {
            return API.get('/blog/meta/tags');
        },

        async create(data) {
            return API.post('/blog', data);
        },

        async update(id, data) {
            return API.put(`/blog/${id}`, data);
        },

        async delete(id) {
            return API.delete(`/blog/${id}`);
        }
    },

    // Admin methods
    admin: {
        async getDashboard() {
            return API.get('/admin/dashboard');
        },

        async getAllChiropractors(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/chiropractors${query ? '?' + query : ''}`);
        },

        async getAllBlogPosts(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/blog-posts${query ? '?' + query : ''}`);
        },

        async restoreChiropractor(id) {
            return API.post(`/admin/chiropractors/${id}/restore`, {});
        },

        async permanentDeleteChiropractor(id) {
            return API.delete(`/admin/chiropractors/${id}/permanent`);
        },

        async toggleBlogPublish(id) {
            return API.post(`/admin/blog-posts/${id}/toggle-publish`, {});
        },

        async getAuditLog(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/admin/audit-log${query ? '?' + query : ''}`);
        },

        async getUsers() {
            return API.get('/admin/users');
        },

        async createUser(data) {
            return API.post('/admin/users', data);
        },

        async toggleUserActive(id) {
            return API.post(`/admin/users/${id}/toggle-active`, {});
        },

        async exportData(type) {
            return API.get(`/admin/export/${type}`);
        }
    },

    // Settings methods
    settings: {
        async getPublic() {
            return API.get('/settings');
        },

        async getAll() {
            return API.get('/settings/all');
        },

        async update(key, value) {
            return API.put(`/settings/${key}`, { value });
        },

        async bulkUpdate(settings) {
            return API.post('/settings/bulk', { settings });
        },

        async create(data) {
            return API.post('/settings', data);
        },

        async delete(key) {
            return API.delete(`/settings/${key}`);
        }
    },

    // SEO methods
    seo: {
        async getPageSeo(page) {
            return API.get(`/seo/page/${page}`);
        },

        async getBlogSeo(slug) {
            return API.get(`/seo/blog/${slug}`);
        },

        async getChiropractorSeo(id) {
            return API.get(`/seo/chiropractor/${id}`);
        }
    }
};

// Export for use in other scripts
window.API = API;
