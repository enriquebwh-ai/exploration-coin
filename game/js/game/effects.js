const Effects = {
    scene: null,
    particles: [],
    seismicWaves: [],
    trails: [],

    init(scene) {
        this.scene = scene;
    },

    showExplorationEffect(x, z) {
        const color = new THREE.Color(CONFIG.COLORS.highlight);

        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.createSeismicWave(x, z, color, i);
            }, i * 120);
        }

        this.createScanEffect(x, z);
        this.createParticles(x, z, CONFIG.COLORS.highlight, 40);
        this.createSparkles(x, z, 20);
        this.createExplorationRing(x, z);
    },

    createExplorationRing(x, z) {
        const geometry = new THREE.RingGeometry(0.3, 0.5, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.set(x * CONFIG.TILE_SIZE, 0.4, z * CONFIG.TILE_SIZE);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        const startTime = Date.now();
        const duration = 1200;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(ring);
                geometry.dispose();
                material.dispose();
                return;
            }

            ring.scale.set(1 + progress * 10, 1 + progress * 10, 1);
            material.opacity = 0.6 * (1 - progress);

            requestAnimationFrame(animate);
        };
        animate();
    },

    createSeismicWave(x, z, color, delay) {
        const geometry = new THREE.RingGeometry(0.1, 0.5, 64);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.set(x * CONFIG.TILE_SIZE, 0.3, z * CONFIG.TILE_SIZE);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        this.seismicWaves.push({
            mesh: ring,
            startTime: Date.now() + delay * 150,
            duration: 1500,
            startScale: 1,
            endScale: 8
        });
    },

    createScanEffect(x, z) {
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        const scanLine = new THREE.Mesh(geometry, material);
        scanLine.position.set(x * CONFIG.TILE_SIZE, 0.6, z * CONFIG.TILE_SIZE);
        scanLine.rotation.x = -Math.PI / 2;
        this.scene.add(scanLine);

        const startTime = Date.now();
        const duration = 600;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(scanLine);
                geometry.dispose();
                material.dispose();
                return;
            }

            scanLine.scale.set(
                1 + progress * 5,
                1 + progress * 5,
                1
            );
            material.opacity = 0.4 * (1 - progress);
            scanLine.rotation.z += 0.1;

            requestAnimationFrame(animate);
        };
        animate();
    },

    createSparkles(x, z, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const geometry = new THREE.OctahedronGeometry(0.05, 0);
                const material = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.5 ? 0xffffff : 0x00ff88,
                    transparent: true,
                    opacity: 1,
                    blending: THREE.AdditiveBlending
                });

                const sparkle = new THREE.Mesh(geometry, material);
                sparkle.position.set(
                    x * CONFIG.TILE_SIZE + (Math.random() - 0.5) * 1.5,
                    Math.random() * 2 + 0.5,
                    z * CONFIG.TILE_SIZE + (Math.random() - 0.5) * 1.5
                );
                this.scene.add(sparkle);

                const velocity = {
                    x: (Math.random() - 0.5) * 0.1,
                    y: Math.random() * 0.15 + 0.05,
                    z: (Math.random() - 0.5) * 0.1
                };

                const startTime = Date.now();
                const duration = 800 + Math.random() * 400;

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;

                    if (progress >= 1) {
                        this.scene.remove(sparkle);
                        geometry.dispose();
                        material.dispose();
                        return;
                    }

                    sparkle.position.x += velocity.x;
                    sparkle.position.y += velocity.y;
                    sparkle.position.z += velocity.z;
                    velocity.y -= 0.003;

                    sparkle.rotation.x += 0.2;
                    sparkle.rotation.y += 0.2;

                    const scale = Math.sin(progress * Math.PI) * (1 - progress) + 0.3;
                    sparkle.scale.set(scale, scale, scale);
                    material.opacity = 1 - progress * 0.7;

                    requestAnimationFrame(animate);
                };
                animate();
            }, i * 30);
        }
    },

    showTokenFoundEffect(x, z) {
        this.createGoldenExplosion(x, z);
        this.createCoinBurst(x, z);
        this.createLightBeam(x, z);
        this.createGlowPulse(x, z);
    },

    createGoldenExplosion(x, z) {
        for (let i = 0; i < 80; i++) {
            setTimeout(() => {
                const geometry = new THREE.OctahedronGeometry(0.08, 0);
                const material = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.3 ? 0xffd700 : 0xffaa00,
                    transparent: true,
                    opacity: 1,
                    blending: THREE.AdditiveBlending
                });

                const coin = new THREE.Mesh(geometry, material);
                coin.position.set(
                    x * CONFIG.TILE_SIZE,
                    1,
                    z * CONFIG.TILE_SIZE
                );
                this.scene.add(coin);

                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const speed = Math.random() * 0.2 + 0.1;

                const velocity = {
                    x: Math.sin(phi) * Math.cos(theta) * speed,
                    y: Math.cos(phi) * speed + 0.1,
                    z: Math.sin(phi) * Math.sin(theta) * speed
                };

                const startTime = Date.now();
                const duration = 2000;

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;

                    if (progress >= 1) {
                        this.scene.remove(coin);
                        geometry.dispose();
                        material.dispose();
                        return;
                    }

                    coin.position.x += velocity.x;
                    coin.position.y += velocity.y;
                    coin.position.z += velocity.z;
                    velocity.y -= 0.005;

                    coin.rotation.x += 0.15;
                    coin.rotation.y += 0.15;

                    material.opacity = 1 - progress;
                    material.opacity = Math.max(0, material.opacity);

                    requestAnimationFrame(animate);
                };
                animate();
            }, i * 20);
        }
    },

    createCoinBurst(x, z) {
        const count = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = x * CONFIG.TILE_SIZE;
            positions[i * 3 + 1] = 1;
            positions[i * 3 + 2] = z * CONFIG.TILE_SIZE;

            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.84;
            colors[i * 3 + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const burst = new THREE.Points(geometry, material);
        this.scene.add(burst);

        const velocities = [];
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5;
            velocities.push({
                x: Math.sin(phi) * Math.cos(theta) * 0.3,
                y: Math.random() * 0.2 + 0.1,
                z: Math.sin(phi) * Math.sin(theta) * 0.3
            });
        }

        const startTime = Date.now();
        const duration = 1500;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(burst);
                geometry.dispose();
                material.dispose();
                return;
            }

            const positions = burst.geometry.attributes.position.array;

            for (let i = 0; i < count; i++) {
                positions[i * 3] += velocities[i].x;
                positions[i * 3 + 1] += velocities[i].y;
                positions[i * 3 + 2] += velocities[i].z;
                velocities[i].y -= 0.008;
            }

            burst.geometry.attributes.position.needsUpdate = true;
            material.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };
        animate();
    },

    createLightBeam(x, z) {
        const geometry = new THREE.CylinderGeometry(0.1, 0.4, 8, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        const beam = new THREE.Mesh(geometry, material);
        beam.position.set(x * CONFIG.TILE_SIZE, 4, z * CONFIG.TILE_SIZE);
        this.scene.add(beam);

        const startTime = Date.now();
        const duration = 2500;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(beam);
                geometry.dispose();
                material.dispose();
                return;
            }

            beam.rotation.y += 0.05;
            beam.position.y = 4 + progress * 2;

            const pulse = Math.sin(progress * Math.PI * 4) * 0.2 + 0.8;
            material.opacity = 0.7 * pulse * (1 - progress);

            beam.scale.set(
                1 + Math.sin(progress * Math.PI * 8) * 0.1,
                1,
                1 + Math.sin(progress * Math.PI * 8) * 0.1
            );

            requestAnimationFrame(animate);
        };
        animate();
    },

    createGlowPulse(x, z) {
        const geometry = new THREE.SphereGeometry(0.8, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        const glow = new THREE.Mesh(geometry, material);
        glow.position.set(x * CONFIG.TILE_SIZE, 1, z * CONFIG.TILE_SIZE);
        this.scene.add(glow);

        const startTime = Date.now();
        const duration = 2000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(glow);
                geometry.dispose();
                material.dispose();
                return;
            }

            const pulse = Math.sin(progress * Math.PI * 6) * 0.3 + 0.7;
            glow.scale.set(pulse * 2, pulse * 2, pulse * 2);
            material.opacity = 0.5 * (1 - progress);

            requestAnimationFrame(animate);
        };
        animate();
    },

    createParticles(x, z, color, count) {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];
        const colors = [];

        const threeColor = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            positions.push(
                x * CONFIG.TILE_SIZE + (Math.random() - 0.5) * 0.8,
                0.5 + Math.random() * 1,
                z * CONFIG.TILE_SIZE + (Math.random() - 0.5) * 0.8
            );

            velocities.push({
                x: (Math.random() - 0.5) * 0.15,
                y: Math.random() * 0.15 + 0.05,
                z: (Math.random() - 0.5) * 0.15
            });

            colors.push(threeColor.r, threeColor.g, threeColor.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        const startTime = Date.now();
        const duration = 1500;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                this.scene.remove(points);
                geometry.dispose();
                material.dispose();
                return;
            }

            const positions = points.geometry.attributes.position.array;

            for (let i = 0; i < count; i++) {
                positions[i * 3] += velocities[i].x;
                positions[i * 3 + 1] += velocities[i].y;
                positions[i * 3 + 2] += velocities[i].z;
                velocities[i].y -= 0.003;
            }

            points.geometry.attributes.position.needsUpdate = true;
            material.opacity = 1 - progress;

            requestAnimationFrame(animate);
        };
        animate();
    },

    showAnomalyEffect(x, z) {
        const geometry = new THREE.OctahedronGeometry(0.5, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x7b2cbf,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        const anomaly = new THREE.Mesh(geometry, material);
        anomaly.position.set(x * CONFIG.TILE_SIZE, 2, z * CONFIG.TILE_SIZE);
        this.scene.add(anomaly);

        const startTime = Date.now();
        const duration = 3000;

        const animate = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed > duration) {
                this.scene.remove(anomaly);
                geometry.dispose();
                material.dispose();
                return;
            }

            anomaly.rotation.x += 0.03;
            anomaly.rotation.y += 0.05;
            anomaly.position.y = 2 + Math.sin(elapsed * 0.003) * 0.8;

            const pulse = Math.sin(elapsed * 0.008) * 0.3 + 0.7;
            anomaly.scale.set(pulse, pulse, pulse);

            if (elapsed > 2200) {
                material.opacity = (duration - elapsed) / 800;
            }

            requestAnimationFrame(animate);
        };
        animate();

        this.createParticles(x, z, 0x7b2cbf, 25);
    },

    updateSeismicWaves() {
        const now = Date.now();
        this.seismicWaves = this.seismicWaves.filter(wave => {
            const elapsed = now - wave.startTime;

            if (elapsed < 0) return true;

            const progress = elapsed / wave.duration;

            if (progress >= 1) {
                this.scene.remove(wave.mesh);
                wave.mesh.geometry.dispose();
                wave.mesh.material.dispose();
                return false;
            }

            const scale = wave.startScale + (wave.endScale - wave.startScale) * progress;
            wave.mesh.scale.set(scale, scale, scale);
            wave.mesh.material.opacity = 0.8 * (1 - progress);

            return true;
        });
    },

    clear() {
        this.scene.children.forEach(child => {
            if (child instanceof THREE.Points || child instanceof THREE.Mesh) {
                this.scene.remove(child);
                child.geometry?.dispose();
                child.material?.dispose();
            }
        });
        this.seismicWaves = [];
        this.trails = [];
    }
};
