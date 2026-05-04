const GameUI = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            authScreen: document.getElementById('auth-screen'),
            gameScreen: document.getElementById('game-screen'),
            loginForm: document.getElementById('login-form'),
            registerForm: document.getElementById('register-form'),
            authError: document.getElementById('auth-error'),
            mnemonicDisplay: document.getElementById('mnemonic-display'),
            mnemonicText: document.getElementById('mnemonic-text'),
            confirmMnemonic: document.getElementById('confirm-mnemonic'),
            balance: document.getElementById('balance'),
            globalTokens: document.getElementById('global-tokens'),
            tokensRemaining: document.getElementById('tokens-remaining'),
            mapExplored: document.getElementById('map-explored'),
            currentBiome: document.getElementById('current-biome'),
            currentChance: document.getElementById('current-chance'),
            coordX: document.getElementById('coord-x'),
            coordZ: document.getElementById('coord-z'),
            eventLog: document.getElementById('event-log'),
            autoExploreBtn: document.getElementById('auto-explore-btn'),
            autoStatus: document.getElementById('auto-status'),
            topBalance: document.getElementById('top-balance'),
            topTokens: document.getElementById('top-tokens'),
            walletBtn: document.getElementById('wallet-btn'),
            walletAddress: document.getElementById('wallet-address'),
            walletModal: document.getElementById('wallet-modal'),
            modalAddress: document.getElementById('modal-address'),
            modalBalance: document.getElementById('modal-balance'),
            modalTokens: document.getElementById('modal-tokens'),
            showMnemonicBtn: document.getElementById('show-mnemonic-btn'),
            mnemonicModal: document.getElementById('mnemonic-modal'),
            modalMnemonic: document.getElementById('modal-mnemonic'),
            closeMnemonic: document.getElementById('close-mnemonic'),
            historyModal: document.getElementById('history-modal'),
            viewHistoryBtn: document.getElementById('view-history-btn'),
            txList: document.getElementById('tx-list'),
            tokenFoundModal: document.getElementById('token-found-modal'),
            tokenNumber: document.getElementById('token-number'),
            tokenBiome: document.getElementById('token-biome'),
            tokenX: document.getElementById('token-x'),
            tokenZ: document.getElementById('token-z'),
            claimToken: document.getElementById('claim-token'),
            notification: document.getElementById('notification'),
            notificationText: document.querySelector('.notification-text')
        };
    },

    bindEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        this.elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        this.elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        this.elements.autoExploreBtn.addEventListener('click', () => {
            AudioManager.play('uiClick');
            Exploration.toggleAutoExplore();
        });

        this.elements.walletBtn.addEventListener('click', () => this.showWalletModal());

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });

        this.elements.showMnemonicBtn?.addEventListener('click', () => this.showMnemonicModal());
        this.elements.closeMnemonic?.addEventListener('click', () => this.elements.mnemonicModal.classList.add('hidden'));
        this.elements.viewHistoryBtn?.addEventListener('click', () => this.loadTransactionHistory());
        this.elements.claimToken?.addEventListener('click', () => {
            this.elements.tokenFoundModal.classList.add('hidden');
        });
    },

    switchTab(tab) {
        AudioManager.play('click');

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.toggle('active', form.id === `${tab}-form`);
        });

        this.elements.authError.classList.add('hidden');
    },

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            AudioManager.play('click');
            this.showError('');

            const response = await API.auth.login(username, password);

            if (response.success) {
                localStorage.setItem('sessionToken', response.data.sessionToken);
                localStorage.setItem('userAddress', response.data.address);
                localStorage.setItem('username', response.data.username);

                GameState.setUser(response.data);

                AudioManager.play('exploreComplete');
                Game.startGame();
            }
        } catch (error) {
            AudioManager.play('error');
            this.showError(error.message);
        }
    },

    async handleRegister() {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        if (password !== passwordConfirm) {
            AudioManager.play('error');
            this.showError('Las contraseñas no coinciden');
            return;
        }

        try {
            AudioManager.play('click');
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

                this.elements.mnemonicText.textContent = response.data.mnemonic;
                this.elements.mnemonicDisplay.classList.remove('hidden');

                document.getElementById('confirm-mnemonic').onclick = () => {
                    this.elements.mnemonicDisplay.classList.add('hidden');
                    Game.startGame();
                };
            }
        } catch (error) {
            AudioManager.play('error');
            this.showError(error.message);
        }
    },

    confirmMnemonic() {
        this.elements.mnemonicDisplay.classList.add('hidden');
        GameState.setUser({
            address: localStorage.getItem('userAddress'),
            username: localStorage.getItem('username')
        });
        this.showGameScreen();
    },

    showGameScreen() {
        this.elements.authScreen.classList.remove('active');
        this.elements.gameScreen.classList.add('active');

        this.updateWalletDisplay();
        this.loadGlobalStats();
    },

    updateWalletDisplay() {
        const address = localStorage.getItem('userAddress') || GameState.address;
        const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x0000...0000';

        this.elements.walletAddress.textContent = shortAddress;
        this.elements.modalAddress.textContent = address;
    },

    async loadGlobalStats() {
        try {
            const stats = await API.stats.getGlobal();
            if (stats.success) {
                this.updateStats({
                    globalTokens: stats.data.totalTokens,
                    tokensRemaining: stats.data.tokensRemaining,
                    mapExplored: ((stats.data.totalExplored / (CONFIG.MAP_SIZE * CONFIG.MAP_SIZE)) * 100).toFixed(2)
                });
            }
        } catch (error) {
            console.error('Failed to load global stats:', error);
        }
    },

    updateStats(stats) {
        if (stats.balance !== undefined) {
            this.elements.balance.textContent = `${stats.balance} EXPL`;
            this.elements.topBalance.textContent = `${stats.balance} EXPL`;
        }
        if (stats.globalTokens !== undefined) {
            this.elements.globalTokens.textContent = stats.globalTokens.toLocaleString();
            this.elements.topTokens.textContent = stats.globalTokens.toLocaleString();
        }
        if (stats.tokensRemaining !== undefined) {
            this.elements.tokensRemaining.textContent = stats.tokensRemaining.toLocaleString();
        }
        if (stats.mapExplored !== undefined) {
            this.elements.mapExplored.textContent = `${stats.mapExplored}%`;
        }
    },

    updateCoordinates(x, z) {
        this.elements.coordX.textContent = x;
        this.elements.coordZ.textContent = z;
    },

    setBiome(biome) {
        const biomeNames = {
            bosque: '🌲 Bosque',
            desierto: '🏜️ Desierto',
            montana: '⛰️ Montaña',
            zona_oscura: '🌑 Zona Oscura',
            oceano: '🌊 Océano',
            volcan: '🌋 Volcán'
        };
        this.elements.currentBiome.textContent = biomeNames[biome] || biome;
    },

    setAutoStatus(active) {
        this.elements.autoExploreBtn.classList.toggle('active', active);
        this.elements.autoExploreBtn.innerHTML = active
            ? '<span class="btn-icon">⏸</span><span>Detener</span>'
            : '<span class="btn-icon">▶</span><span>Auto Explorar</span>';

        const statusDot = this.elements.autoStatus.querySelector('.status-dot');
        const statusText = this.elements.autoStatus.querySelector('span:last-child');

        statusDot.classList.toggle('active', active);
        statusText.textContent = active ? 'Explorando...' : 'Detenido';
    },

    addLog(message, type = 'system') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `> ${message}`;

        this.elements.eventLog.appendChild(entry);
        this.elements.eventLog.scrollTop = this.elements.eventLog.scrollHeight;

        while (this.elements.eventLog.children.length > 50) {
            this.elements.eventLog.removeChild(this.elements.eventLog.firstChild);
        }
    },

    updateMiningMessage(message, isSuccess = false) {
        const miningDisplay = document.getElementById('mining-display');
        if (miningDisplay) {
            miningDisplay.innerHTML = `
                <div class="mining-message ${isSuccess ? 'success' : ''}">
                    <div class="mining-spinner"></div>
                    <span>${message}</span>
                </div>
            `;
        }
    },

    clearMiningMessage() {
        const miningDisplay = document.getElementById('mining-display');
        if (miningDisplay) {
            setTimeout(() => {
                miningDisplay.innerHTML = '';
            }, 2000);
        }
    },

    showWalletModal() {
        AudioManager.play('click');
        this.elements.walletModal.classList.remove('hidden');

        const balance = localStorage.getItem('userBalance') || '0';
        this.elements.modalBalance.textContent = `${balance} EXPL`;
    },

    showMnemonicModal() {
        AudioManager.play('click');
        const mnemonic = localStorage.getItem('mnemonic') || GameState.mnemonic;
        this.elements.modalMnemonic.textContent = mnemonic;
        this.elements.mnemonicModal.classList.remove('hidden');
    },

    async loadTransactionHistory() {
        AudioManager.play('click');

        try {
            const address = localStorage.getItem('userAddress') || GameState.address;
            const response = await API.wallet.getHistory(address);

            if (response.success) {
                this.elements.txList.innerHTML = '';

                if (response.data.transactions.length === 0) {
                    this.elements.txList.innerHTML = '<p style="text-align: center; color: var(--text-dim);">No hay transacciones todavía</p>';
                } else {
                    response.data.transactions.forEach(tx => {
                        const item = document.createElement('div');
                        item.className = `tx-item ${tx.type === 'exploration_reward' ? 'reward' : ''}`;

                        const date = new Date(tx.timestamp).toLocaleString();

                        item.innerHTML = `
                            <div class="tx-hash">${tx.tx_hash.slice(0, 20)}...</div>
                            <div class="tx-details">
                                <span class="tx-type">${tx.type.replace('_', ' ')}</span>
                                <span class="tx-amount">+${tx.amount} EXPL</span>
                            </div>
                            <div class="tx-details" style="font-size: 0.75rem; color: var(--text-dim);">
                                <span>${date}</span>
                            </div>
                        `;

                        this.elements.txList.appendChild(item);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            this.elements.txList.innerHTML = '<p style="color: var(--error);">Error al cargar historial</p>';
        }
    },

    showTokenFoundModal(tokenNumber, bioma, x, z) {
        this.elements.tokenNumber.textContent = tokenNumber;
        this.elements.tokenBiome.textContent = bioma;
        this.elements.tokenX.textContent = x;
        this.elements.tokenZ.textContent = z;
        this.elements.tokenFoundModal.classList.remove('hidden');
    },

    showNotification(message, type = 'success') {
        this.elements.notificationText.textContent = message;
        this.elements.notification.className = `notification ${type}`;

        setTimeout(() => {
            this.elements.notification.classList.add('hidden');
        }, 3000);
    },

    closeAllModals() {
        AudioManager.play('click');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    },

    showError(message) {
        if (message) {
            this.elements.authError.textContent = message;
            this.elements.authError.classList.remove('hidden');
        } else {
            this.elements.authError.classList.add('hidden');
        }
    }
};
