const GameUI = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements.authScreen = document.getElementById('auth-screen');
        this.elements.gameScreen = document.getElementById('game-screen');
        this.elements.loginForm = document.getElementById('login-form');
        this.elements.registerForm = document.getElementById('register-form');
        this.elements.authError = document.getElementById('auth-error');
        this.elements.mnemonicDisplay = document.getElementById('mnemonic-display');
        this.elements.mnemonicText = document.getElementById('mnemonic-text');
        this.elements.balance = document.getElementById('balance');
        this.elements.globalTokens = document.getElementById('global-tokens');
        this.elements.tokensRemaining = document.getElementById('tokens-remaining');
        this.elements.mapExplored = document.getElementById('map-explored');
        this.elements.currentBiome = document.getElementById('current-biome');
        this.elements.coordX = document.getElementById('coord-x');
        this.elements.coordZ = document.getElementById('coord-z');
        this.elements.eventLog = document.getElementById('event-log');
        this.elements.autoExploreBtn = document.getElementById('auto-explore-btn');
        this.elements.autoStatus = document.getElementById('auto-status');
        this.elements.topBalance = document.getElementById('top-balance');
        this.elements.topTokens = document.getElementById('top-tokens');
        this.elements.walletBtn = document.getElementById('wallet-btn');
        this.elements.walletAddress = document.getElementById('wallet-address');
        this.elements.walletModal = document.getElementById('wallet-modal');
        this.elements.modalAddress = document.getElementById('modal-address');
        this.elements.modalBalance = document.getElementById('modal-balance');
        this.elements.modalTokens = document.getElementById('modal-tokens');
        this.elements.showMnemonicBtn = document.getElementById('show-mnemonic-btn');
        this.elements.mnemonicModal = document.getElementById('mnemonic-modal');
        this.elements.modalMnemonic = document.getElementById('modal-mnemonic');
        this.elements.closeMnemonic = document.getElementById('close-mnemonic');
        this.elements.historyModal = document.getElementById('history-modal');
        this.elements.viewHistoryBtn = document.getElementById('view-history-btn');
        this.elements.txList = document.getElementById('tx-list');
        this.elements.tokenFoundModal = document.getElementById('token-found-modal');
        this.elements.tokenNumber = document.getElementById('token-number');
        this.elements.tokenBiome = document.getElementById('token-biome');
        this.elements.tokenX = document.getElementById('token-x');
        this.elements.tokenZ = document.getElementById('token-z');
        this.elements.claimToken = document.getElementById('claim-token');
        this.elements.notification = document.getElementById('notification');
        this.elements.notificationText = document.querySelector('.notification-text');
    },

    bindEvents() {
        console.log('Binding events, registerForm:', this.elements.registerForm);

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Tab clicked:', btn.dataset.tab);
                this.switchTab(btn.dataset.tab);
            });
        });

        if (this.elements.loginForm) {
            this.elements.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (this.elements.registerForm) {
            this.elements.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Register form submitted!');
                this.handleRegister();
            });
        } else {
            console.error('registerForm not found!');
        }

        this.elements.autoExploreBtn.addEventListener('click', () => {
            Exploration.toggleAutoExplore();
        });

        this.elements.walletBtn.addEventListener('click', () => this.showWalletModal());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        if (this.elements.showMnemonicBtn) {
            this.elements.showMnemonicBtn.addEventListener('click', () => this.showMnemonicModal());
        }
        if (this.elements.closeMnemonic) {
            this.elements.closeMnemonic.addEventListener('click', () => this.closeMnemonicModal());
        }
        if (this.elements.viewHistoryBtn) {
            this.elements.viewHistoryBtn.addEventListener('click', () => this.loadTransactionHistory());
        }
        if (this.elements.claimToken) {
            this.elements.claimToken.addEventListener('click', () => {
                this.elements.tokenFoundModal.classList.add('hidden');
            });
        }
    },

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}-form`);
        });
        this.elements.authError.classList.add('hidden');
        this.elements.authError.style.display = 'none';
    },

    async handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            this.showError('Enter username and password');
            return;
        }

        try {
            this.showError('');
            const response = await API.auth.login(username, password);

            if (response.success) {
                localStorage.setItem('sessionToken', response.data.sessionToken);
                localStorage.setItem('userAddress', response.data.address);
                localStorage.setItem('username', response.data.username);

                GameState.setUser({
                    address: response.data.address,
                    username: response.data.username,
                    balance: response.data.balance || 0
                });

                this.startGame();
            } else {
                this.showError(response.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Connection error. Is server running?');
        }
    },

    async handleRegister() {
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        if (!username || !password) {
            this.showError('Fill all fields');
            return;
        }

        if (password !== passwordConfirm) {
            this.showError('Passwords do not match');
            return;
        }

        if (username.length < 3) {
            this.showError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters');
            return;
        }

        try {
            this.showError('');
            const response = await API.auth.register(username, password);

            if (response.success) {
                localStorage.setItem('sessionToken', response.data.sessionToken);
                localStorage.setItem('userAddress', response.data.address);
                localStorage.setItem('username', response.data.username);
                localStorage.setItem('mnemonic', response.data.mnemonic);

                GameState.setUser({
                    address: response.data.address,
                    username: response.data.username,
                    mnemonic: response.data.mnemonic
                });

                this.showMnemonicScreen(response.data.mnemonic);
            } else {
                this.showError(response.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showError('Connection error. Is server running?');
        }
    },

    showMnemonicScreen(mnemonic) {
        document.getElementById('mnemonic-text').textContent = mnemonic;
        document.getElementById('mnemonic-display').classList.remove('hidden');
        document.getElementById('confirm-mnemonic').onclick = () => {
            document.getElementById('mnemonic-display').classList.add('hidden');
            this.startGame();
        };
    },

    showError(message) {
        if (message) {
            this.elements.authError.textContent = message;
            this.elements.authError.style.display = 'block';
        } else {
            this.elements.authError.style.display = 'none';
        }
    },

    startGame() {
        this.elements.authScreen.classList.remove('active');
        this.elements.authScreen.style.display = 'none';
        this.elements.gameScreen.classList.add('active');

        this.updateWalletDisplay();
        this.loadGlobalStats();
        this.addLog('Connected to Exploration Coin', 'system');
    },

    updateWalletDisplay() {
        const address = localStorage.getItem('userAddress') || GameState.address;
        const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x0000...0000';

        if (this.elements.walletAddress) this.elements.walletAddress.textContent = shortAddress;
        if (this.elements.modalAddress) this.elements.modalAddress.textContent = address;
    },

    async loadGlobalStats() {
        try {
            const stats = await API.stats.getGlobal();
            if (stats.success) {
                this.updateStats({
                    globalTokens: stats.data.totalTokens,
                    tokensRemaining: stats.data.tokensRemaining,
                    mapExplored: stats.data.mapExploredPercent
                });
            }
        } catch (error) {
            console.error('Failed to load global stats:', error);
        }
    },

    updateStats(stats) {
        if (stats.balance !== undefined) {
            const bal = parseFloat(stats.balance).toFixed(4);
            if (this.elements.balance) this.elements.balance.textContent = `${bal} EXPL`;
            if (this.elements.topBalance) this.elements.topBalance.textContent = `${bal} EXPL`;
        }
        if (stats.globalTokens !== undefined) {
            if (this.elements.globalTokens) this.elements.globalTokens.textContent = stats.globalTokens.toLocaleString();
            if (this.elements.topTokens) this.elements.topTokens.textContent = stats.globalTokens.toLocaleString();
        }
        if (stats.tokensRemaining !== undefined) {
            if (this.elements.tokensRemaining) this.elements.tokensRemaining.textContent = stats.tokensRemaining.toLocaleString();
        }
        if (stats.mapExplored !== undefined) {
            if (this.elements.mapExplored) this.elements.mapExplored.textContent = `${stats.mapExplored}%`;
        }
    },

    updateCoordinates(x, z) {
        if (this.elements.coordX) this.elements.coordX.textContent = x;
        if (this.elements.coordZ) this.elements.coordZ.textContent = z;
    },

    setBiome(biome) {
        const biomeNames = {
            bosque: 'Bosque',
            desierto: 'Desierto',
            montana: 'Montana',
            zona_oscura: 'Zona Oscura',
            oceano: 'Oceano',
            volcan: 'Volcan'
        };
        if (this.elements.currentBiome) {
            this.elements.currentBiome.textContent = biomeNames[biome] || biome;
        }
    },

    setAutoStatus(active) {
        if (!this.elements.autoExploreBtn) return;
        this.elements.autoExploreBtn.classList.toggle('active', active);
        this.elements.autoExploreBtn.innerHTML = active
            ? '<span class="btn-icon">⏸</span><span>Stop</span>'
            : '<span class="btn-icon">▶</span><span>Auto Explore</span>';

        const statusDot = this.elements.autoStatus.querySelector('.status-dot');
        const statusText = this.elements.autoStatus.querySelector('span:last-child');
        if (statusDot) statusDot.classList.toggle('active', active);
        if (statusText) statusText.textContent = active ? 'Exploring...' : 'Stopped';
    },

    addLog(message, type = 'system') {
        if (!this.elements.eventLog) return;
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `> ${message}`;
        this.elements.eventLog.appendChild(entry);
        this.elements.eventLog.scrollTop = this.elements.eventLog.scrollHeight;
        while (this.elements.eventLog.children.length > 50) {
            this.elements.eventLog.removeChild(this.elements.eventLog.firstChild);
        }
    },

    showWalletModal() {
        this.elements.walletModal.classList.remove('hidden');
        const balance = localStorage.getItem('userBalance') || '0';
        if (this.elements.modalBalance) {
            this.elements.modalBalance.textContent = `${parseFloat(balance).toFixed(4)} EXPL`;
        }
    },

    showMnemonicModal() {
        const mnemonic = localStorage.getItem('mnemonic') || GameState.mnemonic;
        if (this.elements.modalMnemonic) {
            this.elements.modalMnemonic.textContent = mnemonic;
        }
        this.elements.mnemonicModal.classList.remove('hidden');
    },

    closeMnemonicModal() {
        this.elements.mnemonicModal.classList.add('hidden');
    },

    async loadTransactionHistory() {
        try {
            const address = localStorage.getItem('userAddress') || GameState.address;
            const response = await API.wallet.getHistory(address);

            if (response.success && this.elements.txList) {
                this.elements.txList.innerHTML = '';
                if (response.data.transactions.length === 0) {
                    this.elements.txList.innerHTML = '<p style="text-align:center;color:#888">No transactions yet</p>';
                } else {
                    response.data.transactions.forEach(tx => {
                        const item = document.createElement('div');
                        item.className = 'tx-item';
                        item.innerHTML = `
                            <div class="tx-hash">${tx.tx_hash.slice(0, 20)}...</div>
                            <div class="tx-details">
                                <span class="tx-type">${tx.type}</span>
                                <span class="tx-amount">+${tx.amount}</span>
                            </div>
                        `;
                        this.elements.txList.appendChild(item);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    },

    showTokenFoundModal(tokenNumber, bioma, x, z) {
        if (this.elements.tokenNumber) this.elements.tokenNumber.textContent = tokenNumber;
        if (this.elements.tokenBiome) this.elements.tokenBiome.textContent = bioma;
        if (this.elements.tokenX) this.elements.tokenX.textContent = x;
        if (this.elements.tokenZ) this.elements.tokenZ.textContent = z;
        this.elements.tokenFoundModal.classList.remove('hidden');
    },

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }
};