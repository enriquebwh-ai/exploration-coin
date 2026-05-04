const Exploration = {
    isAutoExploring: false,
    autoInterval: null,
    exploringTiles: new Set(),
    explorationCooldown: false,
    miningMessageIndex: 0,

    getMiningMessage(type = 'computing', biome = null) {
        const messages = CONFIG.MINING_MESSAGES;

        if (type === 'biome' && biome && messages.biome_specific[biome]) {
            const biomeMessages = messages.biome_specific[biome];
            return biomeMessages[Math.floor(Math.random() * biomeMessages.length)];
        }

        if (type === 'computing') {
            return messages.computing[Math.floor(Math.random() * messages.computing.length)];
        }

        if (type === 'success') {
            return messages.success[Math.floor(Math.random() * messages.success.length)];
        }

        if (type === 'searching') {
            return messages.searching[Math.floor(Math.random() * messages.searching.length)];
        }

        return messages.searching[0];
    },

    async explore(x, z) {
        const key = `${x},${z}`;

        if (this.exploringTiles.has(key)) {
            return { success: false, error: 'Already exploring this tile' };
        }

        if (this.explorationCooldown) {
            return { success: false, error: 'Please wait...' };
        }

        this.exploringTiles.add(key);
        this.explorationCooldown = true;

        const biome = Terrain.getBiomeData(x, z).biome;

        AudioManager.play('explore');

        const searchMessage = this.getMiningMessage('searching', biome);
        GameUI.addLog(`🔍 ${searchMessage}`, 'system');

        const computingMessage = this.getMiningMessage('computing', biome);
        GameUI.updateMiningMessage(computingMessage);

        GameUI.addLog(`📍 Explorando sector X:${x} Z:${z}`, 'system');
        GameUI.updateCoordinates(x, z);
        GameUI.setBiome(biome);

        Effects.showExplorationEffect(x, z);

        const delay = Math.random() * 1000 + 500;
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            const response = await API.game.explore(GameState.address, x, z);

            setTimeout(() => {
                this.explorationCooldown = false;
                this.exploringTiles.delete(key);
            }, 300);

            if (response.success) {
                const result = response.data;

                if (result.tokenDiscovered) {
                    const successMessage = this.getMiningMessage('success', biome);
                    GameUI.updateMiningMessage(successMessage, true);
                }

                Terrain.exploreArea(x, z, 3);

                if (result.tokenDiscovered) {
                    AudioManager.play('tokenFound');
                    Effects.showTokenFoundEffect(x, z);

                    GameUI.showTokenFoundModal(result.tokenNumber, result.bioma, x, z);
                    GameUI.addLog(`🪙 ¡TOKEN #${result.tokenNumber} DESCUBIERTO!`, 'success');
                    GameUI.addLog(`⚡ ${this.getMiningMessage('success', result.bioma)}`, 'success');

                    GameUI.updateStats({
                        balance: result.stats.playerBalance,
                        globalTokens: result.stats.totalTokens,
                        tokensRemaining: result.stats.tokensRemaining,
                        mapExplored: result.stats.mapExploredPercent
                    });
                } else {
                    AudioManager.play('exploreComplete');
                    GameUI.addLog(`📋 Sin hallazgos en ${CONFIG.BIOMES[result.bioma]?.name || result.bioma}`, 'system');
                }

                GameUI.clearMiningMessage();

                return { success: true, data: result };
            }

            if (response.data?.alreadyExplored) {
                GameUI.addLog(`⚠️ Sector ya explorado`, 'warning');
                GameUI.updateMiningMessage('Sector previamente cartografiado...', false);
            }

            return response;
        } catch (error) {
            this.exploringTiles.delete(key);
            this.explorationCooldown = false;
            AudioManager.play('error');
            GameUI.addLog(`❌ Error: ${error.message}`, 'error');
            GameUI.clearMiningMessage();

            return { success: false, error: error.message };
        }
    },

    async exploreAtPlayer() {
        const pos = Player.getGridPosition();
        return this.explore(pos.x, pos.z);
    },

    startAutoExplore() {
        if (this.isAutoExploring) return;

        this.isAutoExploring = true;
        AudioManager.play('autoStart');

        GameUI.setAutoStatus(true);
        GameUI.addLog('🤖 Modo automático activado', 'success');
        GameUI.addLog('💻 Iniciando proceso de mining...', 'system');

        const exploreNext = async () => {
            if (!this.isAutoExploring) return;

            const candidates = Terrain.getUnexploredTile();
            if (candidates.length > 0) {
                const target = candidates[Math.floor(Math.random() * Math.min(5, candidates.length))];
                await this.explore(target.x, target.z);
            }

            if (this.isAutoExploring) {
                this.autoInterval = setTimeout(exploreNext, 2500);
            }
        };

        setTimeout(exploreNext, 1000);
    },

    stopAutoExplore() {
        if (!this.isAutoExploring) return;

        this.isAutoExploring = false;
        if (this.autoInterval) {
            clearTimeout(this.autoInterval);
            this.autoInterval = null;
        }

        AudioManager.play('autoStop');
        GameUI.setAutoStatus(false);
        GameUI.addLog('⏹️ Exploración automática detenida', 'system');
        GameUI.clearMiningMessage();
    },

    toggleAutoExplore() {
        if (this.isAutoExploring) {
            this.stopAutoExplore();
        } else {
            this.startAutoExplore();
        }
    },

    reset() {
        this.stopAutoExplore();
        this.exploringTiles.clear();
        this.explorationCooldown = false;
    }
};
