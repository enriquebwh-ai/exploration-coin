const API = {
    baseUrl: CONFIG.API_URL,

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = localStorage.getItem('sessionToken');

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body,
                credentials: 'include'
            });

            const data = await response.json();

            return data;

        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    auth: {
        async register(username, password) {
            return this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async login(username, password) {
            return this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async verifySession() {
            const token = localStorage.getItem('sessionToken');
            if (!token) return { success: false, valid: false };

            return this.request('/auth/verify', {
                method: 'POST'
            });
        },

        async logout() {
            return this.request('/auth/logout', {
                method: 'POST'
            });
        }
    },

    wallet: {
        async getBalance(address) {
            return this.request(`/wallet/balance/${address}`);
        },
        async getHistory(address) {
            return this.request(`/wallet/history/${address}`);
        },
        async getTokens(address) {
            return this.request(`/wallet/tokens/${address}`);
        }
    },

    game: {
        async explore(address, x, z) {
            return this.request('/game/explore', {
                method: 'POST',
                body: JSON.stringify({ address, x, z })
            });
        },
        async getMapState(address) {
            return this.request(`/game/map-state/${address}`);
        },
        async getConfig() {
            return this.request('/game/config');
        }
    },

    staking: {
        async getStatus(address) {
            return this.request(`/staking/status/${address}`);
        },
        async stake(address, amount) {
            return this.request('/staking/stake', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async unstake(address) {
            return this.request('/staking/unstake', {
                method: 'POST',
                body: JSON.stringify({ address })
            });
        }
    },

    transfers: {
        async transfer(fromAddress, toAddress, amount) {
            return this.request('/transfers/transfer', {
                method: 'POST',
                body: JSON.stringify({ fromAddress, toAddress, amount })
            });
        },
        async getFeeInfo() {
            return this.request('/transfers/fee-info');
        }
    },

    coldWallet: {
        async deposit(address, amount) {
            return this.request('/cold-wallet/deposit', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async withdraw(address, amount) {
            return this.request('/cold-wallet/withdraw', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async getBalance(address) {
            return this.request(`/cold-wallet/balance/${address}`);
        }
    },

    difficulty: {
        async getStatus() {
            return this.request('/difficulty/status');
        }
    },

    protocolRewards: {
        async getPoolStatus() {
            return this.request('/protocol-rewards/pool-status');
        },
        async getMyRewards(address) {
            return this.request(`/protocol-rewards/my-rewards/${address}`);
        }
    },

    halving: {
        async getStatus() {
            return this.request('/halving/status');
        }
    },

    stats: {
        async getGlobal() {
            return this.request('/stats/global');
        },
        async getLeaderboard() {
            return this.request('/stats/leaderboard');
        },
        async getBiomes() {
            return this.request('/stats/biomes');
        }
    }
};