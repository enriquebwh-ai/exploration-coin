# EXPLORATION COIN 🪙

**Explora. Descubre. Minera.**

Un revolucionario juego de exploración 3D donde cada tile explorado puede contener tokens únicos de criptomoneda. Construido como MVP local con tecnología web moderna.

![Version](https://img.shields.io/badge/version-1.0.0--MVP-blue)
![Status](https://img.shields.io/badge/status-Development-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 📋 Índice

- [Descripción](#-descripción)
- [Características](#-características)
- [Tech Stack](#-tech-stack)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Cómo Ejecutar](#-cómo-ejecutar)
- [API Endpoints](#-api-endpoints)
- [Sistema de Tokens](#-sistema-de-tokens)
- [Fórmula de Dificultad](#-fórmula-de-dificultad)
- [Wallet](#-wallet)
- [Seguridad](#-seguridad)
- [Roadmap](#-roadmap)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## 🎮 Descripción

Exploration Coin es un prototipo MVP de un juego de exploración 3D con economía de tokens integrada. El jugador explora un mapa procedural de 120x120 tiles, descubriendo biomas únicos y buscando tokens raros mediante un sistema de probabilidad creciente.

### Concepto Central

- **Exploración como Minado**: Cada tile explorado tiene probabilidad de revelar un token
- **Rareza Progresiva**: Los tokens se vuelven más escasos conforme se descubren más
- **Wallet Real**: Cada usuario recibe una wallet Ethereum válida con dirección real
- **Futuro Descentralizado**: Preparado para integración con Polygon y smart contracts

---

## ✨ Características

### 🎯 Juego 3D
- Mapa 120x120 tiles con vista isométrica
- 4 biomas distintos: Bosque, Desierto, Montaña, Zona Oscura
- Niebla de guerra (tiles ocultos hasta explorar)
- Cámara Ortográfica con controles WASD/click
- Efectos visuales de partículas y animaciones
- Sistema de exploración manual y automática

### 👛 Wallet
- Generación de wallet Ethereum real (ethers.js v6)
- Frase mnemotécnica de 12 palabras para recovery
- Cifrado AES-256 de credentials local
- Historial completo de transacciones
- Balance en tiempo real

### 🔧 Backend
- API RESTful con Express.js
- Base de datos SQLite (better-sqlite3)
- Rate limiting (10 req/segundo)
- Validación server-side de todas las acciones
- Sistema de sesiones con JWT

### 🎨 UI/UX
- Diseño futurista cyberpunk
- Tipografía Orbitron + Inter
- Efectos de sonido Web Audio API
- Animaciones fluidas
- Panel de estadísticas en tiempo real
- Log de eventos interactivo

---

## 🛠 Tech Stack

### Frontend
- **Three.js r128** - Motor de renderizado 3D WebGL
- **Howler.js** - Gestión de audio
- **HTML5/CSS3** - Interfaz responsiva
- **Web Audio API** - Efectos de sonido procedurales

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Framework web
- **SQLite** - Base de datos embebida
- **ethers.js v6** - Wallet generation

### Herramientas
- **WSL/PowerShell** - Entorno de desarrollo
- **npm** - Gestor de paquetes

---

## 📁 Estructura del Proyecto

```
exploration-coin/
├── backend/                    # Servidor Node.js
│   ├── server.js              # Entry point
│   ├── package.json           # Dependencias
│   ├── routes/                # Rutas API
│   │   ├── auth.js           # Autenticación
│   │   ├── wallet.js         # Wallet
│   │   ├── game.js           # Exploración
│   │   └── stats.js          # Estadísticas
│   ├── services/             # Lógica de negocio
│   ├── middleware/           # Middlewares Express
│   ├── db/                   # Database
│   │   ├── database.js       # Conexión SQLite
│   │   └── init.js          # Inicialización
│   └── utils/               # Utilidades
│
├── game/                      # Cliente del juego
│   ├── index.html            # Entry point HTML
│   ├── css/
│   │   └── styles.css       # Estilos
│   └── js/
│       ├── core/             # Módulos base
│       │   ├── config.js    # Configuración
│       │   ├── api.js       # Cliente API
│       │   └── audio.js     # Audio manager
│       ├── game/            # Lógica del juego
│       │   ├── terrain.js   # Terreno 3D
│       │   ├── player.js    # Jugador
│       │   ├── exploration.js # Sistema exploración
│       │   ├── effects.js    # Efectos visuales
│       │   └── main.js      # Inicialización
│       └── wallet/          # UI Wallet
│           └── ui.js        # Interfaz wallet
│
├── roadmap-web/              # Web del roadmap
│   └── index.html           # Página completa
│
├── database/                 # Datos SQLite
│   ├── schema.sql           # Esquema BD
│   └── exploration_coin.db # Archivo BD (generado)
│
└── README.md                # Este archivo
```

---

## 🚀 Instalación

### Prerrequisitos

- Windows 10/11 con WSL instalado
- Node.js v18+ (verificar con `node --version`)
- npm (viene con Node.js)

### Paso 1: Clonar o crear el proyecto

```bash
# Si ya tienes la carpeta, navega a ella
cd /mnt/c/Users/kike/exploration-coin

# Si necesitas crearla desde cero
mkdir -p exploration-coin
cd exploration-coin
```

### Paso 2: Instalar dependencias del backend

```bash
cd backend
npm install
```

Esto instalará:
- express ^4.18.2
- cors ^2.8.5
- helmet ^7.1.0
- morgan ^1.10.0
- better-sqlite3 ^9.4.0
- ethers ^6.11.0
- bcryptjs ^2.4.3
- jsonwebtoken ^9.0.2
- express-rate-limit ^7.1.5
- express-validator ^7.0.1
- uuid ^9.0.1

### Paso 3: Inicializar la base de datos

```bash
npm run init-db
```

Deberías ver:
```
🔧 Initializing Exploration Coin Database...
📁 Database path: .../database/exploration_coin.db
✅ Database initialized successfully!
```

---

## ▶️ Cómo Ejecutar

### 1. Iniciar el Backend

```bash
cd backend
npm start
```

Verás:
```
╔═══════════════════════════════════════════════════════════╗
║   🚀 EXPLORATION COIN SERVER                             ║
║   Server running on: http://localhost:3000                ║
║   API endpoints: http://localhost:3000/api                ║
║   Game client: http://localhost:3000                      ║
╚═══════════════════════════════════════════════════════════╝
```

### 2. Abrir el Juego

Abre tu navegador y visita:
- **Juego**: http://localhost:3000
- **Roadmap Web**: http://localhost:3000/roadmap-web/index.html (o abre el archivo directamente)

### 3. Crear una Cuenta

1. Haz clic en "Registrarse"
2. Ingresa un username (mínimo 3 caracteres)
3. Ingresa una contraseña (mínimo 6 caracteres)
4. **IMPORTANTE**: Guarda la frase mnemotécnica que aparece
5. Confirma que la guardaste

### 4. Empezar a Explorar

- **Click izq** en el mapa para moverte y explorar
- **WASD** para moverte
- **Espacio** para explorar tu posición actual
- **E** para toggle auto-exploración

---

## 📡 API Endpoints

### Autenticación

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Crear cuenta + wallet |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/verify-session` | Verificar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |

### Wallet

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/wallet/balance/:address` | Balance del wallet |
| GET | `/api/wallet/history/:address` | Historial transacciones |
| GET | `/api/wallet/tokens/:address` | Tokens del usuario |
| POST | `/api/wallet/export/:address` | Info pública wallet |

### Juego

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/game/explore` | Explorar un tile |
| GET | `/api/game/map-state/:address` | Estado del mapa |
| GET | `/api/game/biome/:x/:z` | Info del bioma |
| GET | `/api/game/config` | Configuración del juego |

### Estadísticas

| Method | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/stats/global` | Estadísticas globales |
| GET | `/api/stats/leaderboard` | Top jugadores |
| GET | `/api/stats/biomes` | Stats por bioma |

---

## 💰 Sistema de Tokens

### Distribución

| Allocation | Amount | Percentage |
|------------|--------|------------|
| Juego/Minería | 5,000,000 | 50% |
| Fundador | 1,000,000 | 10% |
| Desarrollo | 2,000,000 | 20% |
| Comunidad | 1,000,000 | 10% |
| Liquidez | 1,000,000 | 10% |
| **Total** | **10,000,000** | **100%** |

### Reglas de Descubrimiento

1. **No hay garantías**: Explorar un tile NO asegura encontrar un token
2. **Probabilidad base**: 0.08% (8 de cada 10,000 intentos)
3. **Scarcity factor**: La probabilidad aumenta cuando menos tokens quedan
4. **Bioma bonus**: La Zona Oscura tiene 3x más probabilidad que el Bosque
5. **Distancia bonus**: Áreas más lejanas del centro tienen mayor probabilidad

---

## 📊 Fórmula de Dificultad

```javascript
MAX_SUPPLY = 10,000,000
GAME_SUPPLY = 5,000,000
BASE_CHANCE = 0.0008

// Factor de escasez (más tokens encontrados = más difícil)
scarcityFactor = Math.pow(1 - (discoveredTokens / GAME_SUPPLY), 1.7)

// Multiplicador por bioma
biomeMultipliers = {
    bosque: 0.8,        // 80% de probabilidad base
    desierto: 1.0,      // 100% (normal)
    montana: 1.5,      // 150%
    zona_oscura: 2.5   // 250%
}

// Factor de distancia (más lejos = más difícil)
distanceFactor = 1 + (distanceFromCenter / maxDistance) * 1.5

// Probabilidad final
finalChance = BASE_CHANCE * scarcityFactor * biomeFactor * distanceFactor
finalChance = Math.min(finalChance, 0.15) // Cap 15%
```

### Tabla de Probabilidades (ejemplo)

| Tokens Descubiertos | Scarcity Factor | Chance Zona Oscura |
|---------------------|------------------|---------------------|
| 0 | 1.00 | 0.20% |
| 100,000 | 0.87 | 0.17% |
| 500,000 | 0.56 | 0.11% |
| 1,000,000 | 0.32 | 0.06% |
| 2,000,000 | 0.10 | 0.02% |
| 3,000,000 | 0.03 | 0.006% |

---

## 👛 Wallet

### Cómo Funciona

1. **Registro**: Se genera una wallet Ethereum válida usando `ethers.Wallet.createRandom()`
2. **Mnemotécnico**: Se crean 12 palabras (BIP39) para recovery
3. **Almacenamiento**:
   - **Local**: Mnemonic cifrado con AES-256 (localStorage)
   - **Server**: Solo dirección y hash de password (nunca private key)

### Seguridad

- ❌ La private key **nunca** sale del navegador
- ❌ El server **no guarda** la private key
- ✅ La frase mnemotécnica se cifra localmente
- ✅ JWT con expiración de 7 días
- ✅ Rate limiting previene ataques de fuerza bruta

### Exportar Wallet

Puedes usar tu frase mnemotécnica para importar en:
- MetaMask
- Trust Wallet
- Cualquier wallet compatible con Ethereum

---

## 🔒 Seguridad

### Client-Side
- No confiar en datos del cliente
- Todas las coordenadas son validadas en backend
- Rate limit: 10 requests/segundo por IP

### Server-Side
- Contraseñas hasheadas con bcrypt (12 rounds)
- JWT para sesiones con expiración
- Validación de inputs con express-validator
- Prepared statements para SQL (previene inyección)

### ⚠️ Limitaciones del MVP

1. Tokens son **simulados** (no tienen valor real)
2. Wallet está en **test mode**
3. No hay smart contracts reales
4. Base de datos es local (no blockchain)

---

## 🗺️ Roadmap

| Fase | Fecha | Descripción | Status |
|------|-------|-------------|--------|
| MVP Local 3D | Mayo 2026 | Prototipo funcional completo | ✅ Completado |
| Biomas Avanzados | Verano 2026 | Más biomas, eventos, anomalías | 🚧 En desarrollo |
| Economía Simulada | Sept 2026 | Sistema económico completo | 📋 Planificado |
| Wallet Testnet | Feb 2027 | Integración Polygon testnet | 📋 Planificado |
| Beta Cerrada | Abr 2027 | Testing con comunidad | 📋 Planificado |
| Lanzamiento | Jul 2027 | Polygon mainnet + DEX | 📋 Planificado |

---

## 🐛 Solución de Problemas

### Error: `MODULE_NOT_FOUND`

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Error: `SQLITE_CANTOPEN`

```bash
mkdir -p database
npm run init-db
```

### Puerto en uso

```bash
# Ver qué proceso usa el puerto 3000
lsof -i :3000

# Matar el proceso
kill -9 <PID>

# O usar otro puerto
PORT=3001 npm start
```

### Base de datos corrupta

```bash
rm database/exploration_coin.db
npm run init-db
```

---

## 📈 Debugging

### Logs del Backend

El servidor usa `morgan` para logging de requests:
```
POST /api/auth/register 201 45.123 ms - 256
GET /api/game/config 200 2.456 ms - 124
```

### API Health Check

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{"status":"ok","timestamp":"2026-05-01T12:00:00.000Z"}
```

---

## 🤝 Contribución

Este es un proyecto MVP de desarrollo activo. Para contribuir:

1. Haz fork del repositorio
2. Crea una rama (`git checkout -b feature/nueva-feature`)
3. Commit tus cambios (`git commit -m 'Agrega nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - Ver archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 Autor

**Exploration Coin Team**
- GitHub: [Tu GitHub]
- Twitter: [Tu Twitter]
- Discord: [Tu Discord]

---

<p align="center">
    🪙 Exploration Coin - El futuro de los juegos play-to-earn 🪙
</p>
