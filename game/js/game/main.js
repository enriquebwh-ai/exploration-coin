const GameState = {
    address: null,
    username: null,
    mnemonic: null,
    balance: 0,
    initialized: false,
    gameStarted: false,
    currentTimeCycle: null
};

GameState.setUser = function(data) {
    this.address = data.address;
    this.username = data.username;
    this.mnemonic = data.mnemonic || null;
    this.balance = data.balance || 0;
};

const Game = {
    scene: null,
    camera: null,
    renderer: null,
    raycaster: null,
    mouse: null,
    animationId: null,
    mainLight: null,
    ambientLight: null,
    hemisphereLight: null,
    pointLights: [],
    bloomComposer: null,
    atmosphericParticles: [],
    windParticles: [],
    dustParticles: [],

    async init() {
        console.log('🎮 Initializing Exploration Coin...');

        AudioManager.init();
        GameUI.init();

        const sessionToken = localStorage.getItem('sessionToken');
        if (sessionToken) {
            try {
                const response = await API.auth.verifySession(sessionToken);
                if (response.valid) {
                    GameState.setUser(response.data);
                    this.startGame();
                }
            } catch (error) {
                console.log('Session invalid, showing auth screen');
            }
        }
    },

    startGame() {
        if (GameState.gameStarted) return;
        GameState.gameStarted = true;

        const container = document.getElementById('game-container');
        if (container) {
            this.init3D(container);
        }

        GameUI.showGameScreen();
        this.createHUD();
    },

    init3D(container) {
        this.scene = new THREE.Scene();
        this.scene.matrixAutoUpdate = true;
        this.scene.maxMorphTargets = 4;

        this.updateTimeCycle();

        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 60;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            1,
            3000
        );

        this.camera.position.set(300, 120, 300);
        this.camera.lookAt(300, 0, 300);

        window.camera = this.camera;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true,
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.6;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.setClearColor(0x0a0a1a);
        container.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupLighting();
        this.setupSkybox();
        this.setupAtmosphericEffects();
        this.setupBloom(container);
        this.setupVignette();
        this.setupMotionBlur();
        this.setupWater();

        Terrain.init(this.scene);
        Player.init(this.scene);
        Effects.init(this.scene);

        this.addGridHelper();

        this.setupEventListeners();

        this.animate();
    },

    getTimeCycle() {
        const now = new Date();
        const hour = now.getHours();
        const timeCycle = CONFIG.TIME_CYCLE;

        if (hour >= timeCycle.MORNING.start && hour < timeCycle.AFTERNOON.start) {
            return timeCycle.MORNING;
        } else if (hour >= timeCycle.AFTERNOON.start && hour < timeCycle.NIGHT.start) {
            return timeCycle.AFTERNOON;
        } else {
            return timeCycle.NIGHT;
        }
    },

    updateTimeCycle() {
        const cycle = this.getTimeCycle();

        if (this.scene) {
            this.scene.background = new THREE.Color(cycle.skyColor);
            this.scene.fog = new THREE.FogExp2(cycle.skyColor, cycle.fogDensity || 0.003);
        }

        if (this.ambientLight) {
            this.ambientLight.color.setHex(cycle.ambientColor);
            this.ambientLight.intensity = cycle.ambientIntensity || 0.5;
        }

        if (this.hemisphereLight) {
            this.hemisphereLight.color.setHex(cycle.hemiColor || 0x87ceeb);
            this.hemisphereLight.groundColor.setHex(cycle.groundColor || 0x3d5a3d);
            this.hemisphereLight.intensity = cycle.hemiIntensity || 0.5;
        }

        if (this.mainLight) {
            this.mainLight.color.setHex(cycle.sunColor);
            this.mainLight.intensity = cycle.sunIntensity;
        }

        if (this.skyMesh && this.skyMesh.material.uniforms) {
            this.skyMesh.material.uniforms.topColor.value.setHex(cycle.skyTopColor || cycle.skyColor);
            this.skyMesh.material.uniforms.bottomColor.value.setHex(cycle.skyBottomColor || cycle.skyColor);
        }

        if (this.sunMesh) {
            this.sunMesh.visible = cycle.name !== 'Noche';
            this.sunGlowMesh.visible = cycle.name !== 'Noche';

            const sunAngle = cycle.name === 'Mañana' ? 0.3 : cycle.name === 'Tarde' ? 0.6 : 0;
            this.sunMesh.position.y = 200 + sunAngle * 300;
            this.sunGlowMesh.position.copy(this.sunMesh.position);
        }

        if (this.starsMesh) {
            this.starsMesh.material.opacity = cycle.name === 'Noche' ? 0.9 : 0.2;
        }

        GameState.currentTimeCycle = cycle.name;

        const timeDisplay = document.getElementById('time-cycle-display');
        if (timeDisplay) {
            const emoji = cycle.name === 'Mañana' ? '☀️' : cycle.name === 'Tarde' ? '🌅' : '🌙';
            timeDisplay.textContent = `${emoji} ${cycle.name}`;
            timeDisplay.style.display = 'block';
        }
    },

    setupLighting() {
        this.ambientLight = new THREE.AmbientLight(0x8090aa, 0.5);
        this.scene.add(this.ambientLight);

        this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5a3d, 0.5);
        this.hemisphereLight.position.set(0, 100, 0);
        this.scene.add(this.hemisphereLight);

        this.mainLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
        this.mainLight.position.set(400, 300, 200);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.width = 4096;
        this.mainLight.shadow.mapSize.height = 4096;
        this.mainLight.shadow.camera.near = 10;
        this.mainLight.shadow.camera.far = 1500;
        this.mainLight.shadow.camera.left = -300;
        this.mainLight.shadow.camera.right = 300;
        this.mainLight.shadow.camera.top = 300;
        this.mainLight.shadow.camera.bottom = -300;
        this.mainLight.shadow.bias = -0.0001;
        this.mainLight.shadow.normalBias = 0.02;
        this.mainLight.shadow.radius = 4;
        this.scene.add(this.mainLight);

        const warmLight = new THREE.PointLight(0xff9944, 2, 500);
        warmLight.position.set(300, 200, 300);
        this.scene.add(warmLight);
        this.pointLights.push(warmLight);

        const fillLight1 = new THREE.DirectionalLight(0x9966cc, 0.25);
        fillLight1.position.set(-200, 150, -100);
        this.scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0x66ffcc, 0.15);
        fillLight2.position.set(0, 100, 300);
        this.scene.add(fillLight2);

        this.pointLights = [];

        const playerLight = new THREE.PointLight(0x00ff88, 4, 120);
        playerLight.castShadow = true;
        playerLight.shadow.mapSize.width = 1024;
        playerLight.shadow.mapSize.height = 1024;
        playerLight.shadow.camera.near = 1;
        playerLight.shadow.camera.far = 150;
        this.scene.add(playerLight);
        this.pointLights.push(playerLight);

        const secondaryLight = new THREE.PointLight(0xffd700, 2, 80);
        this.scene.add(secondaryLight);
        this.pointLights.push(secondaryLight);

        const ambientOcclusion = new THREE.AmbientLight(0x222244, 0.3);
        this.scene.add(ambientOcclusion);
    },

setupSkybox() {
        const skyGeo = new THREE.SphereGeometry(1500, 64, 64);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0a0a2a) },
                bottomColor: { value: new THREE.Color(0x1a1a3a) },
                offset: { value: 400 },
                exponent: { value: 0.6 },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec2 vUv;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float time;
                varying vec3 vWorldPosition;
                varying vec2 vUv;

                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }

                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    float t = max(pow(max(h, 0.0), exponent), 0.0);

                    vec3 skyColor = mix(bottomColor, topColor, t);

                    vec3 sunColor = vec3(1.0, 0.9, 0.7);
                    vec3 sunDir = normalize(vec3(1.0, 0.3, 0.5));
                    vec3 viewDir = normalize(vWorldPosition);
                    float sunDot = max(dot(viewDir, sunDir), 0.0);
                    float sunGlow = pow(sunDot, 64.0) * 2.0;
                    float sunHalo = pow(sunDot, 8.0) * 0.5;
                    skyColor += sunColor * (sunGlow + sunHalo);

                    float stars = hash(floor(vUv * 500.0));
                    stars = step(0.998, stars) * max(h, 0.0);
                    skyColor += vec3(stars) * 0.8;

                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        this.skyMesh = sky;

        const sunGeometry = new THREE.SphereGeometry(25, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xfff5e6,
            transparent: true,
            opacity: 0.95
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(800, 400, 600);
        this.scene.add(sun);
        this.sunMesh = sun;

        const sunGlowGeometry = new THREE.SphereGeometry(40, 32, 32);
        const sunGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
        sunGlow.position.copy(sun.position);
        this.scene.add(sunGlow);
        this.sunGlowMesh = sunGlow;

        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 8000;
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);

        for (let i = 0; i < starsCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 1000 + Math.random() * 400;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.8 + 100;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            } else if (colorChoice < 0.8) {
                colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1;
            } else {
                colors[i * 3] = 1; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.6;
            }

            sizes[i] = Math.random() * 2.5 + 0.5;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starsMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
        this.starsMesh = stars;
    },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        this.skyMesh = sky;

        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 5000;
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        const sizes = new Float32Array(starsCount);

        for (let i = 0; i < starsCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 1000 + Math.random() * 400;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.8 + 100;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            } else if (colorChoice < 0.8) {
                colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1;
            } else {
                colors[i * 3] = 1; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.6;
            }

            sizes[i] = Math.random() * 3 + 0.5;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starsMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
        this.starsMesh = stars;
    },

    setupAtmosphericEffects() {
        this.atmosphericParticles = [];

        const particleTypes = [
            { biome: 'all', color: 0xaaffaa, count: 200, size: 0.06, speed: 0.008, amplitude: 1.5 },
            { biome: 'bosque', color: 0x44ff44, count: 150, size: 0.1, speed: 0.006, amplitude: 2 },
            { biome: 'desierto', color: 0xffd700, count: 100, size: 0.05, speed: 0.012, amplitude: 1 },
            { biome: 'montana', color: 0xffffff, count: 300, size: 0.08, speed: 0.004, amplitude: 3 },
            { biome: 'zona_oscura', color: 0xff00ff, count: 200, size: 0.12, speed: 0.01, amplitude: 2.5 },
            { biome: 'oceano', color: 0x00aaff, count: 180, size: 0.06, speed: 0.008, amplitude: 1.5 },
            { biome: 'volcan', color: 0xff4400, count: 150, size: 0.1, speed: 0.015, amplitude: 2 }
        ];

        particleTypes.forEach(type => {
            for (let i = 0; i < type.count; i++) {
                const geometry = new THREE.SphereGeometry(type.size, 6, 6);
                const material = new THREE.MeshBasicMaterial({
                    color: type.color,
                    transparent: true,
                    opacity: 0.5,
                    blending: THREE.AdditiveBlending
                });

                const particle = new THREE.Mesh(geometry, material);
                particle.position.set(
                    Math.random() * CONFIG.MAP_SIZE,
                    Math.random() * 25 + 3,
                    Math.random() * CONFIG.MAP_SIZE
                );
                particle.userData = {
                    baseY: particle.position.y,
                    speed: type.speed,
                    amplitude: type.amplitude,
                    phase: Math.random() * Math.PI * 2,
                    type: type.biome,
                    baseOpacity: 0.3 + Math.random() * 0.3,
                    size: type.size
                };

                this.scene.add(particle);
                this.atmosphericParticles.push(particle);
            }
        });

        this.dustParticles = [];
        const dustGeometry = new THREE.BufferGeometry();
        const dustCount = 1500;
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);

        for (let i = 0; i < dustCount; i++) {
            dustPositions[i * 3] = Math.random() * CONFIG.MAP_SIZE;
            dustPositions[i * 3 + 1] = Math.random() * 15 + 1;
            dustPositions[i * 3 + 2] = Math.random() * CONFIG.MAP_SIZE;

            const colorType = Math.random();
            if (colorType < 0.4) {
                dustColors[i * 3] = 0.8; dustColors[i * 3 + 1] = 0.9; dustColors[i * 3 + 2] = 0.7;
            } else if (colorType < 0.7) {
                dustColors[i * 3] = 0.4; dustColors[i * 3 + 1] = 0.5; dustColors[i * 3 + 2] = 0.6;
            } else {
                dustColors[i * 3] = 1; dustColors[i * 3 + 1] = 1; dustColors[i * 3 + 2] = 1;
            }
        }

        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

        const dustMaterial = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        const dust = new THREE.Points(dustGeometry, dustMaterial);
        this.scene.add(dust);
        this.dustParticles = dust;
    },

    setupBloom(container) {
        const renderScene = new THREE.RenderPass(this.scene, this.camera);

        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.6,
            0.6
        );
        bloomPass.threshold = 0.05;
        bloomPass.strength = 1.2;
        bloomPass.radius = 1.0;

        this.bloomComposer = new THREE.EffectComposer(this.renderer);
        this.bloomComposer.addPass(renderScene);
        this.bloomComposer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    },

    setupVignette() {
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                darkness: { value: 0.7 },
                offset: { value: 1.3 },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float darkness;
                uniform float offset;
                uniform float time;
                varying vec2 vUv;

                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);

                    vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
                    float vignette = 1.0 - dot(uv, uv);
                    texel.rgb *= smoothstep(0.0, 1.0, pow(vignette, darkness));

                    float subtleGrain = fract(sin(dot(vUv * time, vec2(12.9898, 78.233))) * 43758.5453) * 0.02;
                    texel.rgb += vec3(subtleGrain - 0.01);

                    gl_FragColor = texel;
                }
            `
        };

        const vignettePass = new THREE.ShaderPass(vignetteShader);
        this.bloomComposer.addPass(vignettePass);
        this.vignettePass = vignettePass;
    },

    setupMotionBlur() {
        this.motionBlurPass = null;
    },

    setupWater() {
        const waterGeometry = new THREE.PlaneGeometry(200, 200);
        const waterMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x004466,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transmission: 0.6
        });

        for (let x = 0; x < CONFIG.MAP_SIZE; x += 200) {
            for (let z = 0; z < CONFIG.MAP_SIZE; z += 200) {
                const biome = Terrain.getBiomeData(x, z).biome;
                if (biome === 'oceano') {
                    const water = new THREE.Mesh(waterGeometry, waterMaterial.clone());
                    water.rotation.x = -Math.PI / 2;
                    water.position.set(x + 100, 0.25, z + 100);
                    water.receiveShadow = true;
                    this.scene.add(water);
                }
            }
        }
    },

    createHUD() {
        const hudContainer = document.createElement('div');
        hudContainer.id = 'hud-container';
        hudContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 200px;
            z-index: 100;
            pointer-events: none;
        `;

        const radarCanvas = document.createElement('canvas');
        radarCanvas.id = 'radar-canvas';
        radarCanvas.width = 200;
        radarCanvas.height = 200;
        radarCanvas.style.cssText = `
            width: 100%;
            border-radius: 50%;
            border: 3px solid rgba(0, 255, 136, 0.6);
            background: radial-gradient(circle, rgba(10, 10, 26, 0.97) 0%, rgba(5, 5, 15, 0.99) 100%);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.4), inset 0 0 40px rgba(0, 255, 136, 0.15);
        `;
        hudContainer.appendChild(radarCanvas);

        const timeDisplay = document.createElement('div');
        timeDisplay.id = 'time-cycle-display';
        timeDisplay.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(10, 10, 26, 0.9);
            border: 1px solid rgba(0, 255, 136, 0.5);
            border-radius: 20px;
            padding: 8px 20px;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            color: #00ff88;
            z-index: 100;
            display: none;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        `;
        document.body.appendChild(timeDisplay);

        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.id = 'minimap-canvas';
        minimapCanvas.width = 180;
        minimapCanvas.height = 180;
        minimapCanvas.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 180px;
            height: 180px;
            border-radius: 15px;
            border: 3px solid rgba(0, 255, 136, 0.6);
            background: rgba(10, 10, 26, 0.95);
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.4);
            z-index: 100;
            cursor: pointer;
        `;
        document.body.appendChild(minimapCanvas);

        document.body.appendChild(hudContainer);

        this.radarCanvas = radarCanvas;
        this.radarCtx = radarCanvas.getContext('2d');
        this.minimapCanvas = minimapCanvas;
        this.minimapCtx = minimapCanvas.getContext('2d');

        minimapCanvas.addEventListener('click', (e) => {
            const rect = minimapCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width * CONFIG.MAP_SIZE;
            const z = (e.clientY - rect.top) / rect.height * CONFIG.MAP_SIZE;
            Player.moveTo(x, z);
        });
    },

    updateRadar() {
        if (!this.radarCtx) return;

        const ctx = this.radarCtx;
        const canvas = this.radarCanvas;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = w / 2 - 12;

        ctx.clearRect(0, 0, w, h);

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 5; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (radius / 5) * i, 0, Math.PI * 2);
            ctx.stroke();
        }

        const gridLines = 12;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
        for (let i = 0; i < gridLines; i++) {
            const angle = (i / gridLines) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
            ctx.stroke();
        }

        const playerX = Player.position.x;
        const playerZ = Player.position.z;
        const scale = radius / 120;

        ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
        Object.keys(Terrain.tiles).forEach(key => {
            const [tx, tz] = key.split(',').map(Number);
            const dx = (tx - playerX) * scale;
            const dz = (tz - playerZ) * scale;
            if (dx * dx + dz * dz < radius * radius) {
                ctx.beginPath();
                ctx.arc(cx + dx, cy + dz, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 12;
        Object.keys(Terrain.tiles).forEach(key => {
            const tile = Terrain.tiles[key];
            if (tile.userData && tile.userData.tokenFound) {
                const [tx, tz] = key.split(',').map(Number);
                const dx = (tx - playerX) * scale;
                const dz = (tz - playerZ) * scale;
                if (dx * dx + dz * dz < radius * radius) {
                    ctx.beginPath();
                    ctx.arc(cx + dx, cy + dz, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        const radarAngle = Date.now() * 0.0008;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(radarAngle) * radius, cy + Math.sin(radarAngle) * radius);
        ctx.stroke();

        const pulseRadius = 5 + Math.sin(Date.now() * 0.005) * 2;
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
    },

    updateMinimap() {
        if (!this.minimapCtx) return;

        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = 'rgba(5, 5, 15, 0.98)';
        ctx.fillRect(0, 0, w, h);

        const playerX = Player.position.x;
        const playerZ = Player.position.z;
        const viewSize = 120;
        const scale = w / viewSize;

        const biomeColors = {
            bosque: '#228B22',
            desierto: '#DAA520',
            montana: '#708090',
            zona_oscura: '#4B0082',
            oceano: '#006994',
            volcan: '#8B0000'
        };

        Object.keys(Terrain.tiles).forEach(key => {
            const [tx, tz] = key.split(',').map(Number);
            const dx = (tx - playerX + viewSize / 2) * scale;
            const dz = (tz - playerZ + viewSize / 2) * scale;

            if (dx >= -scale * 2 && dx < w + scale * 2 && dz >= -scale * 2 && dz < h + scale * 2) {
                const tile = Terrain.tiles[key];
                const biome = tile.userData.bioma;

                ctx.fillStyle = biomeColors[biome] || '#333';
                ctx.fillRect(dx - scale * 1.5, dz - scale * 1.5, scale * 3, scale * 3);
            }
        });

        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
    },

    updateAtmosphericParticles(time) {
        const playerBiome = Terrain.getBiomeData(
            Math.round(Player.position.x),
            Math.round(Player.position.z)
        ).biome;

        this.atmosphericParticles.forEach(particle => {
            particle.position.y = particle.userData.baseY +
                Math.sin(time * particle.userData.speed * 5 + particle.userData.phase) *
                particle.userData.amplitude;

            particle.position.x += Math.sin(time * particle.userData.speed * 2) * 0.015;
            particle.position.z += Math.cos(time * particle.userData.speed * 2) * 0.015;

            const distToPlayer = Math.sqrt(
                Math.pow(particle.position.x - Player.position.x, 2) +
                Math.pow(particle.position.z - Player.position.z, 2)
            );

            if (particle.userData.type === playerBiome || particle.userData.type === 'all') {
                particle.material.opacity = Math.min(particle.userData.baseOpacity, distToPlayer / 40);
            } else {
                particle.material.opacity = particle.userData.baseOpacity * 0.2;
            }

            const scale = 0.8 + Math.sin(time * 2 + particle.userData.phase) * 0.2;
            particle.scale.set(scale, scale, scale);

            if (particle.position.y > 30) particle.position.y = 1;
            if (particle.position.y < 1) particle.position.y = 30;
            if (particle.position.x > CONFIG.MAP_SIZE) particle.position.x = 0;
            if (particle.position.x < 0) particle.position.x = CONFIG.MAP_SIZE;
        });

        if (this.dustParticles) {
            const positions = this.dustParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += Math.sin(time + i * 0.1) * 0.03;
                positions[i + 1] += Math.sin(time * 0.5 + i * 0.05) * 0.015;

                if (positions[i] > CONFIG.MAP_SIZE) positions[i] = 0;
                if (positions[i] < 0) positions[i] = CONFIG.MAP_SIZE;
                if (positions[i + 1] > 20) positions[i + 1] = 1;
                if (positions[i + 1] < 1) positions[i + 1] = 20;
            }
            this.dustParticles.geometry.attributes.position.needsUpdate = true;
        }
    },

    addGridHelper() {
        const size = CONFIG.MAP_SIZE;
        const divisions = 100;

        const gridHelper = new THREE.GridHelper(size, divisions, 0x00ff88, 0x0a2a1a);
        gridHelper.position.set(size / 2 - 0.5, -0.6, size / 2 - 0.5);
        gridHelper.material.opacity = 0.5;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    },

    setupEventListeners() {
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
        this.renderer.domElement.addEventListener('click', (event) => this.onClick(event));
        this.renderer.domElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.onRightClick(event);
        });

        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        window.addEventListener('resize', () => this.onResize());
    },

    onMouseMove(event) {
        if (!GameState.address) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (let intersect of intersects) {
            if (intersect.object.userData &&
                intersect.object.userData.x !== undefined &&
                intersect.object.userData.z !== undefined) {
                Terrain.highlightTile(intersect.object.userData.x, intersect.object.userData.z);
                return;
            }

            if (intersect.object.name === 'basePlane') {
                const x = Math.floor(intersect.point.x);
                const z = Math.floor(intersect.point.z);
                if (x >= 0 && x < CONFIG.MAP_SIZE && z >= 0 && z < CONFIG.MAP_SIZE) {
                    Terrain.highlightTile(x, z);
                    return;
                }
            }
        }

        Terrain.clearHighlight();
    },

    onClick(event) {
        if (!GameState.address) return;
        if (event.target !== this.renderer.domElement) return;

        AudioManager.play('click');

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (let intersect of intersects) {
            if (intersect.object.userData &&
                intersect.object.userData.x !== undefined &&
                intersect.object.userData.z !== undefined) {
                const { x, z } = intersect.object.userData;
                Player.moveTo(x, z);
                setTimeout(() => Exploration.explore(x, z), 300);
                return;
            }

            if (intersect.object.name === 'basePlane') {
                const x = Math.floor(intersect.point.x);
                const z = Math.floor(intersect.point.z);
                if (x >= 0 && x < CONFIG.MAP_SIZE && z >= 0 && z < CONFIG.MAP_SIZE) {
                    Player.moveTo(x, z);
                    setTimeout(() => Exploration.explore(x, z), 300);
                    return;
                }
            }
        }
    },

    onRightClick(event) {
        if (!GameState.address) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (let intersect of intersects) {
            if (intersect.object.name === 'basePlane') {
                const x = Math.floor(intersect.point.x);
                const z = Math.floor(intersect.point.z);
                if (x >= 0 && x < CONFIG.MAP_SIZE && z >= 0 && z < CONFIG.MAP_SIZE) {
                    Player.moveTo(x, z);
                    return;
                }
            }
        }
    },

    onKeyDown(event) {
        if (!GameState.address) return;

        const moveSpeed = 10;
        const pos = Player.getGridPosition();

        switch (event.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                Player.moveTo(pos.x, pos.z - moveSpeed);
                break;
            case 's':
            case 'arrowdown':
                Player.moveTo(pos.x, pos.z + moveSpeed);
                break;
            case 'a':
            case 'arrowleft':
                Player.moveTo(pos.x - moveSpeed, pos.z);
                break;
            case 'd':
            case 'arrowright':
                Player.moveTo(pos.x + moveSpeed, pos.z);
                break;
            case ' ':
                AudioManager.play('click');
                Exploration.exploreAtPlayer();
                break;
            case 'e':
                AudioManager.play('click');
                Exploration.toggleAutoExplore();
                break;
            case 'm':
                if (this.minimapCanvas) {
                    this.minimapCanvas.style.display =
                        this.minimapCanvas.style.display === 'none' ? 'block' : 'none';
                }
                break;
        }
    },

    onResize() {
        if (!this.camera || !this.renderer) return;

        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 60;

        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.bloomComposer) {
            this.bloomComposer.setSize(window.innerWidth, window.innerHeight);
        }
    },

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        const time = Date.now() * 0.001;

        Player.update();
        this.updateAtmosphericParticles(time);
        this.updateTimeCycle();

        if (this.vignettePass && this.vignettePass.uniforms) {
            this.vignettePass.uniforms.time.value = time;
        }

        if (this.skyMesh && this.skyMesh.material.uniforms) {
            this.skyMesh.material.uniforms.time.value = time;
        }

        if (this.mainLight) {
            this.mainLight.position.x = Player.position.x + 150;
            this.mainLight.position.z = Player.position.z + 150;
            this.mainLight.target.position.set(Player.position.x, 0, Player.position.z);
        }

        if (this.pointLights[0]) {
            this.pointLights[0].position.x = Player.position.x;
            this.pointLights[0].position.z = Player.position.z;
            this.pointLights[0].position.y = 20;
        }

        if (this.pointLights[1]) {
            this.pointLights[1].position.x = Player.position.x;
            this.pointLights[1].position.z = Player.position.z;
        }

        this.updateRadar();
        this.updateMinimap();

        if (this.bloomComposer) {
            this.bloomComposer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await Game.init();
});
