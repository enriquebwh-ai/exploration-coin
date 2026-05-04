const API = {
    baseUrl: 'http://localhost:3006',

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = localStorage.getItem('sessionToken');

        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    auth: {
        async register(username, password) {
            return this.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async login(username, password) {
            return this.request('/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async verifySession() {
            const token = localStorage.getItem('sessionToken');
            if (!token) return { success: false, valid: false };
            return this.request('/api/auth/verify', { method: 'POST' });
        }
    },

    wallet: {
        async getBalance(address) { return this.request(`/api/wallet/balance/${address}`); },
        async getHistory(address) { return this.request(`/api/wallet/history/${address}`); },
        async getTokens(address) { return this.request(`/api/wallet/tokens/${address}`); }
    },

    game: {
        async explore(address, x, z) {
            return this.request('/api/game/explore', {
                method: 'POST',
                body: JSON.stringify({ address, x, z })
            });
        },
        async getMapState(address) { return this.request(`/api/game/map-state/${address}`); },
        async getConfig() { return this.request('/api/game/config'); }
    },

    staking: {
        async getStatus(address) { return this.request(`/api/staking/status/${address}`); },
        async stake(address, amount) {
            return this.request('/api/staking/stake', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async unstake(address) {
            return this.request('/api/staking/unstake', {
                method: 'POST',
                body: JSON.stringify({ address })
            });
        }
    },

    stats: {
        async getGlobal() { return this.request('/api/stats/global'); },
        async getLeaderboard() { return this.request('/api/stats/leaderboard'); },
        async getBiomes() { return this.request('/api/stats/biomes'); }
    }
};