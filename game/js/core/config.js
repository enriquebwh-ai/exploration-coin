const CONFIG = {
    API_URL: 'http://localhost:3006/api',
    MAP_SIZE: 600,
    TILE_SIZE: 1,
    CAMERA: {
        DISTANCE: 80,
        ANGLE: Math.PI / 4,
        HEIGHT: 80
    },
    BIOMES: {
        bosque: {
            name: 'Bosque',
            color: 0x1a5c34,
            height: 0.8,
            emissive: 0x001100,
            particles: 0x00ff00,
            skyColor: 0x87ceeb,
            groundColor: 0x2d5a27
        },
        desierto: {
            name: 'Desierto',
            color: 0xDAA520,
            height: 0.3,
            emissive: 0x332200,
            particles: 0xffd700,
            skyColor: 0xffd700,
            groundColor: 0xc2a64d
        },
        montana: {
            name: 'Montaña',
            color: 0x708090,
            height: 2.5,
            emissive: 0x111111,
            particles: 0xffffff,
            skyColor: 0x6b7b8c,
            groundColor: 0x5a6a7a
        },
        zona_oscura: {
            name: 'Zona Oscura',
            color: 0x4B0082,
            height: 1.2,
            emissive: 0x220044,
            particles: 0xff00ff,
            skyColor: 0x1a0a2e,
            groundColor: 0x2d1b4e
        },
        oceano: {
            name: 'Océano',
            color: 0x006994,
            height: -0.5,
            emissive: 0x000022,
            particles: 0x00aaff,
            skyColor: 0x006994,
            groundColor: 0x004466
        },
        volcan: {
            name: 'Volcán',
            color: 0x8B0000,
            height: 3,
            emissive: 0x330000,
            particles: 0xff4400,
            skyColor: 0x2a0a0a,
            groundColor: 0x5a2020
        }
    },
    COLORS: {
        fog: 0x0a0a1a,
        unexplored: 0x111122,
        grid: 0x00ff88,
        highlight: 0x00ff88
    },
    TIME_CYCLE: {
        MORNING: {
            start: 6, end: 12, name: 'Mañana',
            skyColor: 0x87ceeb,
            skyTopColor: 0x4a90c2,
            skyBottomColor: 0xffd89b,
            ambientColor: 0xaab8cc,
            ambientIntensity: 0.6,
            hemiColor: 0x87ceeb,
            hemiIntensity: 0.6,
            groundColor: 0x4a7c4e,
            sunColor: 0xfff5e6,
            sunIntensity: 1.8,
            fogDensity: 0.0025
        },
        AFTERNOON: {
            start: 12, end: 19, name: 'Tarde',
            skyColor: 0xffa500,
            skyTopColor: 0x2c5aa0,
            skyBottomColor: 0xff6b35,
            ambientColor: 0xcc9966,
            ambientIntensity: 0.5,
            hemiColor: 0xffa500,
            hemiIntensity: 0.5,
            groundColor: 0x5a4a3a,
            sunColor: 0xffaa44,
            sunIntensity: 1.6,
            fogDensity: 0.003
        },
        NIGHT: {
            start: 19, end: 6, name: 'Noche',
            skyColor: 0x0a0a2a,
            skyTopColor: 0x05051a,
            skyBottomColor: 0x0a0a1a,
            ambientColor: 0x333355,
            ambientIntensity: 0.3,
            hemiColor: 0x1a1a3a,
            hemiIntensity: 0.3,
            groundColor: 0x1a1a2a,
            sunColor: 0x6666aa,
            sunIntensity: 0.4,
            fogDensity: 0.005
        }
    },
    MINING_MESSAGES: {
        computing: [
            "Calculando hash SHA-256...",
            "Resolviendo puzzle criptográfico...",
            "Validando transacción...",
            "Buscando nonce válido...",
            "Procesando algoritmo de consenso...",
            "Verificando integridad de bloque...",
            "Descifrando clave pública...",
            "Ejecutando prueba de trabajo...",
            "Verificando firma digital...",
            "Compilando Merkle proof..."
        ],
        success: [
            "¡Bloque minado exitosamente!",
            "¡Transacción verificada!",
            "¡Nonce encontrado!",
            "¡Hash válido descubierto!",
            "¡Premio de exploración!",
            "¡Capa de seguridad descifrada!",
            "¡Proof-of-Work completado!",
            "¡Block reward reclamado!"
        ],
        searching: [
            "Escaneando coordenadas...",
            "Buscando anomalías...",
            "Analizando bioma...",
            "Mapeando territorio...",
            "Detectando señales...",
            "Cartografiando zona...",
            "Calculando difficulty...",
            "Verificando nonce..."
        ],
        biome_specific: {
            bosque: [
                "Los árboles procesan transacciones...",
                "Biosfera validando bloques...",
                "Resinas cristalizando datos...",
                "Raíces verificando Merkle tree..."
            ],
            desierto: [
                "Arena procesando hashes...",
                "Minerales validando proof-of-work...",
                "Calor calculando dificultad...",
                "Fósiles verificando chain..."
            ],
            montana: [
                "Rocas ejecutando consensus...",
                "Cristales almacenando estado...",
                "Elevación aumentando dificultad...",
                "Picos validando bloques..."
            ],
            zona_oscura: [
                "Energía oscura envolviendo datos...",
                "Antimateria validando...",
                "Singularidad procesando...",
                "Vacío verificando transacciones..."
            ],
            oceano: [
                "Corrientes transmitiendo bloques...",
                "Profundidades validando chain...",
                "Sales minerales verificando...",
                " mareas sincronizando nodos..."
            ],
            volcan: [
                "Magma quemando transacciones...",
                "Lava solidificando bloques...",
                "Plasma fusionando hashes...",
                "Cráter validando consensus..."
            ]
        }
    }
};
