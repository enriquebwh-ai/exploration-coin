const Player = {
    mesh: null,
    position: { x: 300, z: 300 },
    targetPosition: { x: 300, z: 300 },
    isMoving: false,
    moveSpeed: 0.2,
    scene: null,
    trailParticles: [],

    init(scene) {
        this.scene = scene;

        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.5,
            metalness: 0.6,
            roughness: 0.3
        });

        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.position.set(this.position.x, 0.6, this.position.z);
        this.mesh.name = 'player';
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x00cc6a,
            emissive: 0x00ff88,
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.4
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.8;
        this.mesh.add(head);

        const glowGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.5;
        this.mesh.add(glow);

        const ringGeometry = new THREE.RingGeometry(0.4, 0.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.45;
        this.mesh.add(ring);

        this.updateCamera(true);
    },

    moveTo(x, z) {
        const clampedX = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, Math.round(x)));
        const clampedZ = Math.max(0, Math.min(CONFIG.MAP_SIZE - 1, Math.round(z)));

        if (clampedX === this.targetPosition.x && clampedZ === this.targetPosition.z) {
            return false;
        }

        this.targetPosition.x = clampedX;
        this.targetPosition.z = clampedZ;
        this.isMoving = true;

        return true;
    },

    update() {
        if (!this.isMoving) {
            this.mesh.rotation.y += 0.01;
            return;
        }

        const dx = this.targetPosition.x - this.position.x;
        const dz = this.targetPosition.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.1) {
            this.position.x = this.targetPosition.x;
            this.position.z = this.targetPosition.z;
            this.isMoving = false;
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
        } else {
            this.position.x += dx * this.moveSpeed;
            this.position.z += dz * this.moveSpeed;
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;

            const targetAngle = Math.atan2(dx, dz);
            this.mesh.rotation.y = targetAngle;
        }

        this.mesh.position.y = 0.6 + Math.sin(Date.now() * 0.003) * 0.1;

        this.updateCamera();
        this.updateTrail();
    },

    updateTrail() {
        if (this.isMoving && Math.random() < 0.3) {
            this.createTrailParticle();
        }

        this.trailParticles = this.trailParticles.filter(p => {
            const elapsed = Date.now() - p.createdAt;
            if (elapsed > 1000) {
                this.scene.remove(p.particle);
                p.particle.geometry.dispose();
                p.particle.material.dispose();
                return false;
            }

            p.particle.position.y += 0.02;
            p.particle.material.opacity = 1 - (elapsed / 1000);
            return true;
        });
    },

    createTrailParticle() {
        const geometry = new THREE.SphereGeometry(0.08, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(
            this.mesh.position.x + (Math.random() - 0.5) * 0.3,
            0.2,
            this.mesh.position.z + (Math.random() - 0.5) * 0.3
        );

        this.scene.add(particle);
        this.trailParticles.push({
            particle,
            createdAt: Date.now()
        });
    },

    updateCamera(instant = false) {
        if (!window.camera) return;

        const targetX = this.position.x;
        const targetZ = this.position.z + 50;

        if (instant) {
            window.camera.position.x = targetX;
            window.camera.position.z = targetZ;
            window.camera.position.y = 80;
        } else {
            window.camera.position.x += (targetX - window.camera.position.x) * 0.08;
            window.camera.position.z += (targetZ - window.camera.position.z) * 0.08;
            window.camera.position.y += (80 - window.camera.position.y) * 0.08;
        }

        window.camera.lookAt(targetX, 0, targetZ - 30);
    },

    getGridPosition() {
        return {
            x: Math.round(this.position.x),
            z: Math.round(this.position.z)
        };
    },

    reset() {
        this.position = { x: 300, z: 300 };
        this.targetPosition = { x: 300, z: 300 };
        this.isMoving = false;
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;
    }
};
