const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
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
                ...options,
                headers,
                credentials: 'same-origin'
            });

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

    auth: {
        async register(username, password) {
            return API.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async login(username, password) {
            return API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async verifySession(token) {
            return API.request('/auth/verify-session', {
                method: 'POST',
                body: JSON.stringify({ sessionToken: token })
            });
        },

        async logout(token) {
            return API.request('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ sessionToken: token })
            });
        }
    },

    wallet: {
        async getBalance(address) {
            return API.request(`/wallet/balance/${address}`);
        },

        async getHistory(address) {
            return API.request(`/wallet/history/${address}`);
        },

        async getTokens(address) {
            return API.request(`/wallet/tokens/${address}`);
        }
    },

    game: {
        async explore(address, x, z) {
            return API.request('/game/explore', {
                method: 'POST',
                body: JSON.stringify({ address, x, z })
            });
        },

        async getMapState(address) {
            return API.request(`/game/map-state/${address}`);
        },

        async getConfig() {
            return API.request('/game/config');
        }
    },

    staking: {
        async getStatus(address) {
            return API.request(`/staking/status/${address}`);
        },
        async stake(address, amount) {
            return API.request('/staking/stake', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async unstake(address) {
            return API.request('/staking/unstake', {
                method: 'POST',
                body: JSON.stringify({ address })
            });
        }
    },

    transfers: {
        async transfer(fromAddress, toAddress, amount) {
            return API.request('/transfers/transfer', {
                method: 'POST',
                body: JSON.stringify({ fromAddress, toAddress, amount })
            });
        },
        async getFeeInfo() {
            return API.request('/transfers/fee-info');
        }
    },

    coldWallet: {
        async deposit(address, amount) {
            return API.request('/cold-wallet/deposit', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async withdraw(address, amount) {
            return API.request('/cold-wallet/withdraw', {
                method: 'POST',
                body: JSON.stringify({ address, amount })
            });
        },
        async getBalance(address) {
            return API.request(`/cold-wallet/balance/${address}`);
        }
    },

    difficulty: {
        async getStatus() {
            return API.request('/difficulty/status');
        }
    },

    protocolRewards: {
        async getPoolStatus() {
            return API.request('/protocol-rewards/pool-status');
        },
        async getMyRewards(address) {
            return API.request(`/protocol-rewards/my-rewards/${address}`);
        }
    },

    halving: {
        async getStatus() {
            return API.request('/halving/status');
        }
    },

    stats: {
        async getGlobal() {
            return API.request('/stats/global');
        },

        async getLeaderboard() {
            return API.request('/stats/leaderboard');
        },

        async getBiomes() {
            return API.request('/stats/biomes');
        }
    }
};
