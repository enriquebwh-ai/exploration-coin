const Terrain = {
    scene: null,
    tiles: {},
    tileSize: CONFIG.TILE_SIZE,
    mapSize: CONFIG.MAP_SIZE,
    tileGroup: null,
    highlightMesh: null,
    pendingTiles: [],
    maxVisibleTiles: 600,
    chunkSize: 30,
    tilePool: [],

    init(scene) {
        this.scene = scene;
        this.tileGroup = new THREE.Group();
        this.tileGroup.name = 'terrain';
        scene.add(this.tileGroup);
        this.createHighlight();
        this.createBasePlane();
        this.startProceduralGeneration();
    },

    createBasePlane() {
        const geometry = new THREE.PlaneGeometry(
            this.mapSize * this.tileSize * 3,
            this.mapSize * this.tileSize * 3
        );
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color: 0x050510,
            roughness: 1,
            metalness: 0,
            transparent: true,
            opacity: 0.95
        });

        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(
            (this.mapSize * this.tileSize) / 2 - this.tileSize / 2,
            -1.5,
            (this.mapSize * this.tileSize) / 2 - this.tileSize / 2
        );
        plane.name = 'basePlane';
        plane.receiveShadow = true;
        this.scene.add(plane);
    },

    createHighlight() {
        const geometry = new THREE.BoxGeometry(
            this.tileSize * 0.95,
            0.3,
            this.tileSize * 0.95
        );

        const material = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.highlight,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        this.highlightMesh = new THREE.Mesh(geometry, material);
        this.highlightMesh.visible = false;
        this.highlightMesh.position.y = 0.15;
        this.scene.add(this.highlightMesh);

        const glowGeometry = new THREE.BoxGeometry(
            this.tileSize * 1.4,
            0.15,
            this.tileSize * 1.4
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.COLORS.highlight,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = -0.1;
        this.highlightMesh.add(glow);
    },

    startProceduralGeneration() {
        this.generationInterval = setInterval(() => {
            if (this.pendingTiles.length > 0 && Object.keys(this.tiles).length < this.maxVisibleTiles) {
                const tile = this.pendingTiles.shift();
                this.createTile(tile.x, tile.z);
            }
        }, 20);
    },

    getBiomeData(x, z) {
        const centerX = this.mapSize / 2;
        const centerZ = this.mapSize / 2;
        const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2));
        const maxDist = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerZ, 2));
        const normalizedDist = distFromCenter / maxDist;

        const noise1 = Math.sin(x * 0.03) * Math.cos(z * 0.03);
        const noise2 = Math.sin(x * 0.01 + z * 0.01) * 0.5;
        const noise3 = Math.sin(x * 0.05 - z * 0.03) * 0.3;
        const combinedNoise = (noise1 + noise2 + noise3) / 1.8;

        if (normalizedDist > 0.88) return { biome: 'zona_oscura', noise: combinedNoise };
        if (normalizedDist > 0.78) return { biome: 'volcan', noise: combinedNoise };
        if (normalizedDist > 0.65) return { biome: 'montana', noise: combinedNoise };
        if (normalizedDist > 0.5) return { biome: 'oceano', noise: combinedNoise };
        if ((x + z) % 5 === 0) return { biome: 'desierto', noise: combinedNoise };
        if (combinedNoise > 0.4) return { biome: 'oceano', noise: combinedNoise };
        if (combinedNoise < -0.4) return { biome: 'zona_oscura', noise: combinedNoise };
        return { biome: 'bosque', noise: combinedNoise };
    },

    getBiomeColor(biomeData) {
        const biome = CONFIG.BIOMES[biomeData.biome];
        if (!biome) return CONFIG.BIOMES.bosque;

        const noise = biomeData.noise || 0;
        const color = new THREE.Color(biome.color);

        if (noise > 0.3) {
            color.lerp(new THREE.Color(0xffffff), (noise - 0.3) * 0.4);
        } else if (noise < -0.3) {
            color.lerp(new THREE.Color(0x000000), Math.abs(noise) * 0.4);
        }

        return color;
    },

    createTile(x, z) {
        const key = `${x},${z}`;
        if (this.tiles[key]) return null;

        const biomeData = this.getBiomeData(x, z);
        const biome = CONFIG.BIOMES[biomeData.biome];
        const height = biome.height || 1;

        let geometry, material;

        if (biomeData.biome === 'oceano') {
            geometry = new THREE.BoxGeometry(
                this.tileSize * 0.88,
                0.5,
                this.tileSize * 0.88
            );
            material = new THREE.MeshPhysicalMaterial({
                color: this.getBiomeColor(biomeData),
                roughness: 0.1,
                metalness: 0.8,
                transparent: true,
                opacity: 0.92,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                reflectivity: 1.0
            });
            height = 0.5;
        } else if (biomeData.biome === 'montana') {
            const coneRadius = this.tileSize * 0.4 + Math.abs(biomeData.noise) * 0.2;
            const coneHeight = height * 2 + Math.abs(biomeData.noise) * 1.5;
            geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 6);
            material = new THREE.MeshStandardMaterial({
                color: this.getBiomeColor(biomeData),
                roughness: 0.75,
                metalness: 0.2,
                flatShading: true
            });
        } else if (biomeData.biome === 'volcan') {
            geometry = new THREE.CylinderGeometry(
                this.tileSize * 0.3,
                this.tileSize * 0.5,
                height * 3,
                8
            );
            material = new THREE.MeshStandardMaterial({
                color: this.getBiomeColor(biomeData),
                roughness: 0.6,
                metalness: 0.4,
                emissive: new THREE.Color(biome.emissive || 0x330000),
                emissiveIntensity: 0.5
            });
        } else if (biomeData.biome === 'zona_oscura') {
            geometry = new THREE.BoxGeometry(
                this.tileSize * 0.85,
                height * 1.5,
                this.tileSize * 0.85
            );
            material = new THREE.MeshStandardMaterial({
                color: this.getBiomeColor(biomeData),
                roughness: 0.5,
                metalness: 0.5,
                emissive: new THREE.Color(biome.emissive || 0x110022),
                emissiveIntensity: 0.5
            });
        } else if (biomeData.biome === 'desierto') {
            geometry = new THREE.BoxGeometry(
                this.tileSize * 0.88,
                height * 0.7,
                this.tileSize * 0.88
            );
            material = new THREE.MeshStandardMaterial({
                color: this.getBiomeColor(biomeData),
                roughness: 0.9,
                metalness: 0.1,
                flatShading: true
            });
        } else {
            geometry = new THREE.BoxGeometry(
                this.tileSize * 0.88,
                height,
                this.tileSize * 0.88
            );
            material = new THREE.MeshStandardMaterial({
                color: this.getBiomeColor(biomeData),
                roughness: 0.7,
                metalness: 0.3,
                flatShading: false
            });
        }

        const tile = new THREE.Mesh(geometry, material);
        tile.position.set(
            x * this.tileSize,
            height / 2 - 0.5,
            z * this.tileSize
        );
        tile.userData = {
            x,
            z,
            biome: biomeData.biome,
            explored: false,
            noise: biomeData.noise,
            tokenFound: false
        };
        tile.castShadow = true;
        tile.receiveShadow = true;

        this.tiles[key] = tile;
        this.tileGroup.add(tile);

        this.addTileDetails(tile, biomeData);
        this.addGlowBorder(tile, biomeData);

        return tile;
    },

    addTileDetails(tile, biomeData) {
        const rand = Math.random();
        if (biomeData.biome === 'bosque' && rand < 0.4) {
            this.addTree(tile);
        } else if (biomeData.biome === 'montana' && rand < 0.3) {
            this.addRock(tile);
        } else if (biomeData.biome === 'desierto' && rand < 0.25) {
            this.addCactus(tile);
        } else if (biomeData.biome === 'zona_oscura' && rand < 0.3) {
            this.addCrystal(tile);
        } else if (biomeData.biome === 'volcan' && rand < 0.3) {
            this.addLavaGlow(tile);
        } else if (biomeData.biome === 'oceano' && rand < 0.2) {
            this.addBubble(tile);
        }
    },

    addTree(tile) {
        const trunkGeometry = new THREE.CylinderGeometry(0.06, 0.09, 0.7, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 0.95,
            metalness: 0.0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.35;
        trunk.castShadow = true;
        tile.add(trunk);

        const leavesGeometry = new THREE.ConeGeometry(0.25, 0.6, 6);
        const leavesMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a5c34,
            roughness: 0.8,
            metalness: 0.0,
            flatShading: true
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 0.9;
        leaves.castShadow = true;
        tile.add(leaves);

        const leaves2Geometry = new THREE.ConeGeometry(0.18, 0.4, 6);
        const leaves2 = new THREE.Mesh(leaves2Geometry, leavesMaterial);
        leaves2.position.y = 1.2;
        leaves2.castShadow = true;
        tile.add(leaves2);
    },

    addRock(tile) {
        const rockGeometry = new THREE.DodecahedronGeometry(0.18, 0);
        const rockMaterial = new THREE.MeshStandardMaterial({
            color: 0x5a6a7a,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: true
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.y = 0.12;
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        tile.add(rock);
    },

    addCactus(tile) {
        const cactusGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6);
        const cactusMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a27,
            roughness: 0.8,
            metalness: 0.1
        });
        const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial);
        cactus.position.y = 0.35;
        cactus.castShadow = true;
        tile.add(cactus);

        const armGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.3, 6);
        const arm1 = new THREE.Mesh(armGeometry, cactusMaterial);
        arm1.position.set(0.15, 0.45, 0);
        arm1.rotation.z = -Math.PI / 4;
        cactus.add(arm1);

        const arm2 = new THREE.Mesh(armGeometry, cactusMaterial);
        arm2.position.set(-0.15, 0.35, 0);
        arm2.rotation.z = Math.PI / 4;
        cactus.add(arm2);
    },

    addCrystal(tile) {
        const crystalGeometry = new THREE.OctahedronGeometry(0.15, 0);
        const crystalMaterial = new THREE.MeshStandardMaterial({
            color: 0x9b4dff,
            emissive: 0x7b2cbf,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.85,
            roughness: 0.1,
            metalness: 0.9
        });
        const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
        crystal.position.y = 0.35;
        crystal.rotation.y = Math.random() * Math.PI;
        crystal.castShadow = true;
        tile.add(crystal);

        const glowGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x9b4dff,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.35;
        tile.add(glow);
    },

    addLavaGlow(tile) {
        const glowGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.6;
        tile.add(glow);

        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 5;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = Math.random() * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xff6600,
            size: 0.05,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.y = 0.5;
        tile.add(particles);
    },

    addBubble(tile) {
        const bubbleGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const bubbleMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            roughness: 0.0,
            metalness: 0.0,
            transmission: 0.9
        });
        const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubble.position.y = 0.3 + Math.random() * 0.2;
        tile.add(bubble);
    },

    addGlowBorder(tile, biomeData) {
        const borderGeometry = new THREE.BoxGeometry(
            this.tileSize * 0.92,
            0.08,
            this.tileSize * 0.92
        );
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.BIOMES[biomeData.biome].color,
            transparent: true,
            opacity: 0.12,
            blending: THREE.AdditiveBlending
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.y = -0.44;
        tile.add(border);
    },

    revealTile(x, z, bioma = null) {
        const key = `${x},${z}`;

        if (this.tiles[key]) {
            if (this.tiles[key].userData.explored) return null;
            this.tiles[key].userData.explored = true;

            const tile = this.tiles[key];
            tile.material.emissive.setHex(bioma ? CONFIG.BIOMES[bioma].emissive : 0x111111);
            tile.material.emissiveIntensity = 0.2;
            tile.material.opacity = 1;
            tile.material.transparent = false;

            return tile;
        }

        this.pendingTiles.push({ x, z });
        return null;
    },

    exploreArea(centerX, centerZ, radius = 3) {
        const revealed = [];

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const x = centerX + dx;
                const z = centerZ + dz;

                if (x >= 0 && x < this.mapSize && z >= 0 && z < this.mapSize) {
                    const tile = this.revealTile(x, z);
                    if (tile) revealed.push({ x, z, tile });
                }
            }
        }

        return revealed;
    },

    highlightTile(x, z) {
        if (x >= 0 && x < this.mapSize && z >= 0 && z < this.mapSize) {
            this.highlightMesh.visible = true;
            this.highlightMesh.position.x = x * this.tileSize;
            this.highlightMesh.position.z = z * this.tileSize;
            return true;
        }
        this.highlightMesh.visible = false;
        return false;
    },

    clearHighlight() {
        this.highlightMesh.visible = false;
    },

    getUnexploredTile() {
        const unexplored = [];
        const playerX = Math.round(Player.position.x);
        const playerZ = Math.round(Player.position.z);

        for (let attempt = 0; attempt < 15; attempt++) {
            const radius = 30 + attempt * 15;
            for (let x = playerX - radius; x <= playerX + radius; x += 8) {
                for (let z = playerZ - radius; z <= playerZ + radius; z += 8) {
                    if (x < 0 || x >= this.mapSize || z < 0 || z >= this.mapSize) continue;

                    const key = `${x},${z}`;
                    if (!this.tiles[key] || !this.tiles[key].userData.explored) {
                        const dist = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(z - playerZ, 2));
                        unexplored.push({ x, z, dist });
                    }
                }
            }
            if (unexplored.length > 8) break;
        }

        if (unexplored.length === 0) {
            for (let x = 0; x < this.mapSize; x += 15) {
                for (let z = 0; z < this.mapSize; z += 15) {
                    const key = `${x},${z}`;
                    if (!this.tiles[key]) {
                        unexplored.push({ x, z, dist: Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(z - playerZ, 2)) });
                    }
                }
            }
        }

        unexplored.sort((a, b) => a.dist - b.dist);
        return unexplored.slice(0, 15);
    },

    reset() {
        if (this.generationInterval) {
            clearInterval(this.generationInterval);
        }
        Object.values(this.tiles).forEach(tile => {
            this.tileGroup.remove(tile);
            tile.geometry.dispose();
            tile.material.dispose();
        });
        this.tiles = {};
        this.pendingTiles = [];
    }
};