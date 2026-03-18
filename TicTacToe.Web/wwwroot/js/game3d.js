// 3D Tic-Tac-Toe - Using Global THREE from CDN
// ==========================================

// THREE is loaded globally from <script> tag in App.razor
// No imports needed!

console.log('[GAME3D] ========== MODULE LOADING ==========');
console.log('[GAME3D] THREE global available:', typeof THREE !== 'undefined');
console.log('[GAME3D] THREE version:', THREE?.REVISION);

let scene, camera, renderer, board3D;
let cubes = [];
let cubeTargets = [];
let rotationSpeed = 0.003;
let autoRotate = false;
let boardSize = 3;
let boardGroup;
let winningLine = null;
let controls = null;
let startTime = Date.now();
let lastWinningPositions = null;
let raycaster;
let mouse;
let dotNetHelper = null;
let pointerDown = null;
let sliceAxis = 'none';
let sliceIndex = 1;
let clickDetectionEnabled = true; // Toggle with 'C' key

// Track all animations in progress
const animations = {
    scaling: new Map() // Map of mesh -> { startTime, duration }
};

const COLORS = {
    background: 0x0f172a,
    backgroundAccent: 0x1e293b,
    grid: 0x93c5fd,
    gridGlow: 0x60a5fa,
    playerX: 0x06b6d4,
    playerXGlow: 0x22d3ee,
    playerO: 0xf59e0b,
    playerOGlow: 0xfbbf24,
    empty: 0x1e3a5f,
    emptyEdge: 0x93c5fd,
    ambient: 0x404040,
    directional: 0xffffff,
    pointLight: 0x60a5fa,
    winningGlow: 0x00ff00,        // Bright green for winner
    winningFlash: 0x88ff88,       // Light green for flash effect
    winningDark: 0x00aa00         // Dark green for contrast
};

console.log('[GAME3D] Module initialized, exports ready');
console.log('[GAME3D] ========== MODULE LOADED ==========\n');

// ==================================================================================
// WINNING ANIMATION CONTROLLER
// ==================================================================================
class WinningAnimationController {
    constructor() {
        console.log('[ANIM-CONTROLLER] Constructor called');
        this.winningCubes = new Map();
        this.winningMarkers = new Map();
        this.winningLine = null;
        this.lineStartTime = null;
        this.isAnimating = false;
        this.rafId = null;
        console.log('[ANIM-CONTROLLER] Initialized');
    }

    startAnimation(cube, marker) {
        const now = performance.now();
        console.log('[ANIM-CONTROLLER] startAnimation called', {
            cubePosition: cube.position,
            hasMarker: !!marker,
            timestamp: now
        });
        
        if (!this.winningCubes.has(cube)) {
            this.winningCubes.set(cube, {
                startTime: now,
                originalEmissiveIntensity: cube.material.emissiveIntensity || 0.6
            });
            console.log('[ANIM-CONTROLLER] ✓ Cube registered, total:', this.winningCubes.size);
        }

        if (marker && !this.winningMarkers.has(marker)) {
            this.winningMarkers.set(marker, now);
            console.log('[ANIM-CONTROLLER] ✓ Marker registered, total:', this.winningMarkers.size);
        }
    }

    startLineAnimation(line) {
        console.log('[ANIM-CONTROLLER] startLineAnimation called');
        this.winningLine = line;
        this.lineStartTime = performance.now();
        if (!this.isAnimating) {
            console.log('[ANIM-CONTROLLER] Starting animation loop');
            this.isAnimating = true;
            this.update();
        }
    }

    update() {
        if (!this.isAnimating) {
            console.log('[ANIM-CONTROLLER] update() called but not animating, exiting');
            return;
        }

        const now = performance.now();
        let hasActiveAnimation = false;
        let activeCubes = 0;
        let activeMarkers = 0;

        // Animate cubes with dramatic green flashing
        for (const [cube, data] of this.winningCubes) {
            if (!cube.parent) {
                this.winningCubes.delete(cube);
                console.log('[ANIM-CONTROLLER] Removed orphaned cube from animation');
                continue;
            }

            hasActiveAnimation = true;
            activeCubes++;
            const t = (now - data.startTime) * 0.006;

            // More dramatic pulsing scale
            const pulseScale = 1 + Math.sin(t * 1.2) * 0.15;
            cube.scale.set(pulseScale, pulseScale, pulseScale);

            // Intense green flash with color cycling
            const flashCycle = (Math.sin(t * 1.5) + 1) / 2; // 0 to 1
            const glowIntensity = 2.0 + Math.sin(t * 1.2) * 0.8;
            cube.material.emissiveIntensity = glowIntensity;

            // Cycle between bright and dark green
            const greenColor = flashCycle > 0.5 ? COLORS.winningGlow : COLORS.winningFlash;
            cube.material.emissive.setHex(greenColor);

            // Make cube more opaque during flash
            cube.material.opacity = 0.4 + flashCycle * 0.4;
        }

        // Animate markers with enhanced spinning and pulsing
        for (const [marker, startTime] of this.winningMarkers) {
            if (!marker.parent) {
                this.winningMarkers.delete(marker);
                console.log('[ANIM-CONTROLLER] Removed orphaned marker from animation');
                continue;
            }

            hasActiveAnimation = true;
            activeMarkers++;
            const t = (now - startTime) * 0.006;

            // Faster, more dramatic rotation
            marker.rotation.x += 0.12;
            marker.rotation.y += 0.18;
            marker.rotation.z += 0.08;

            // More dramatic pulsing
            const spinPulse = 1 + Math.sin(t * 1.3 + Math.PI / 3) * 0.2;
            marker.scale.set(spinPulse, spinPulse, spinPulse);

            // Add green glow to markers
            if (marker.material) {
                const flashCycle = (Math.sin(t * 1.5) + 1) / 2;
                marker.material.emissive.setHex(COLORS.winningGlow);
                marker.material.emissiveIntensity = 1.5 + flashCycle * 1.0;
            }
        }

        // Animate line with dramatic pulsing (but NO rotation - stays fixed)
        if (this.winningLine && this.winningLine.parent && this.lineStartTime) {
            hasActiveAnimation = true;
            const elapsed = now - this.lineStartTime;
            const t = elapsed * 0.005;

            // Dramatic pulsing intensity (brighter range for opaque material)
            const intensity = 3.0 + Math.sin(t * 2.0) * 2.0;
            this.winningLine.material.emissiveIntensity = intensity;

            // Color flash between bright and dark green
            const colorCycle = (Math.sin(t * 1.8) + 1) / 2;
            const lineColor = colorCycle > 0.5 ? COLORS.winningGlow : COLORS.winningFlash;
            this.winningLine.material.emissive.setHex(lineColor);
            this.winningLine.material.color.setHex(lineColor);

            // NO rotation - line stays fixed in position through the winning cubes
        }

        if (hasActiveAnimation) {
            requestAnimationFrame(() => this.update());
        } else {
            console.log('[ANIM-CONTROLLER] No active animations, stopping loop');
            this.isAnimating = false;
            this.rafId = null;
        }
    }

    clearAll() {
        console.log('[ANIM-CONTROLLER] clearAll() called');
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
            console.log('[ANIM-CONTROLLER] ✓ Animation frame cancelled');
        }

        const cubeCount = this.winningCubes.size;
        const markerCount = this.winningMarkers.size;

        for (const [cube, data] of this.winningCubes) {
            if (cube.parent) {
                cube.scale.set(1, 1, 1);
                cube.material.emissiveIntensity = data.originalEmissiveIntensity;
                cube.material.opacity = 0.6;
            }
        }

        for (const marker of this.winningMarkers.keys()) {
            if (marker.parent) {
                marker.rotation.set(0, 0, 0);
                marker.scale.set(1, 1, 1);
            }
        }

        this.winningCubes.clear();
        this.winningMarkers.clear();
        this.winningLine = null;
        this.lineStartTime = null;
        this.isAnimating = false;
        
        console.log(`[ANIM-CONTROLLER] ✓ Cleared ${cubeCount} cubes, ${markerCount} markers`);
    }
}

const winningController = new WinningAnimationController();

// Initialize the 3D scene
export function init3DBoard(containerId, size = 3) {
    console.log(`\n[INIT] ========== init3DBoard START ==========`);
    console.log(`[INIT] Parameters: containerId="${containerId}", size=${size}`);
    console.log(`[INIT] THREE available: ${typeof THREE !== 'undefined'}`);
    console.log(`[INIT] THREE.Scene: ${typeof THREE?.Scene}`);
    console.log(`[INIT] THREE.WebGLRenderer: ${typeof THREE?.WebGLRenderer}`);
    
    boardSize = size;
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[INIT] ✗ FATAL: Container "${containerId}" not found in DOM`);
        console.error(`[INIT] Available elements:`, Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        return;
    }
    console.log(`[INIT] ✓ Container found:`, container);
    console.log(`[INIT] Container dimensions: ${container.clientWidth}x${container.clientHeight}`);

    console.log(`[INIT] Calling cleanup()...`);
    cleanup();
    console.log(`[INIT] ✓ Cleanup complete`);

    // Setup Scene
    console.log(`[INIT] Creating THREE.Scene...`);
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(COLORS.background);
        scene.fog = new THREE.Fog(COLORS.backgroundAccent, 10, 50);
        console.log(`[INIT] ✓ Scene created:`, scene);
    } catch (e) {
        console.error(`[INIT] ✗ FATAL: Failed to create scene:`, e);
        return;
    }

    const aspect = container.clientWidth / container.clientHeight;
    console.log(`[INIT] Creating camera (aspect: ${aspect.toFixed(2)})`);
    try {
        camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        const distance = size * 2.6; // Increased slightly for better framing
        camera.position.set(distance, distance * 0.8, distance);
        camera.lookAt(0, 0, 0);
        console.log(`[INIT] ✓ Camera created at (${distance}, ${distance * 0.8}, ${distance})`);
    } catch (e) {
        console.error(`[INIT] ✗ FATAL: Failed to create camera:`, e);
        return;
    }

    console.log(`[INIT] Creating WebGL renderer...`);
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        console.log(`[INIT] ✓ Renderer created (${container.clientWidth}x${container.clientHeight})`);
    } catch (e) {
        console.error(`[INIT] ✗ FATAL: Failed to create renderer:`, e);
        console.error(`[INIT] WebGL support:`, !!window.WebGLRenderingContext);
        return;
    }

    console.log(`[INIT] Appending canvas to container...`);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    console.log(`[INIT] ✓ Canvas appended, canvas element:`, renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    attachPointerHandlers();

    // Add OrbitControls event listeners for debugging
    let controlChangeCount = 0;
    const logControlChange = () => {
        controlChangeCount++;
        if (controlChangeCount <= 5 || controlChangeCount % 100 === 0) {
            console.log(`[CONTROLS] Change event #${controlChangeCount} - Camera position:`, 
                `(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
        }
    };

    // Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
        try {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enableZoom = true;
            controls.zoomSpeed = 0.8;
            controls.enablePan = false; // Disable panning to keep board centered
            controls.minDistance = 3;
            controls.maxDistance = 50;
            controls.target.set(0, 0, 0); // Lock target to origin (board center)
            controls.update();

            // Add event listeners for debugging
            controls.addEventListener('change', () => {
                if (typeof logControlChange !== 'undefined') logControlChange();
            });
            controls.addEventListener('start', () => {
                console.log(`[CONTROLS] 🎮 User interaction started`);
            });
            controls.addEventListener('end', () => {
                console.log(`[CONTROLS] 🎮 User interaction ended`);
            });

            console.log(`[INIT] ✓ OrbitControls initialized`);
            console.log(`[INIT]   - enableDamping: ${controls.enableDamping}`);
            console.log(`[INIT]   - enableZoom: ${controls.enableZoom}`);
            console.log(`[INIT]   - enableRotate: ${controls.enableRotate}`);
            console.log(`[INIT]   - enablePan: ${controls.enablePan}`);

            // Expose controls to window for debugging
            window.debugControls = controls;
            window.debugCamera = camera;
            console.log(`[INIT] ✓ Debug: window.debugControls and window.debugCamera available`);
        } catch (e) {
            console.warn(`[INIT] OrbitControls init failed: ${e.message}`);
            controls = null;
        }
    } else {
        console.log(`[INIT] OrbitControls not available in global THREE build`);
        controls = null;
    }

    // Lighting
    console.log(`[INIT] Adding lights...`);
    scene.add(new THREE.AmbientLight(COLORS.ambient, 0.4));
    const dirLight = new THREE.DirectionalLight(COLORS.directional, 1.0);
    dirLight.position.set(10, 10, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(new THREE.DirectionalLight(COLORS.directional, 0.3));
    console.log(`[INIT] ✓ Lights added (ambient + 2 directional)`);

    // Create World
    console.log(`[INIT] Creating board...`);
    createBoard();
    console.log(`[INIT] ✓ Board created`);
    
    console.log(`[INIT] Attaching resize handler...`);
    window.addEventListener('resize', onWindowResize);
    console.log(`[INIT] ✓ Resize handler attached`);

    // Add keyboard toggle for click detection (for debugging)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'c' || e.key === 'C') {
            clickDetectionEnabled = !clickDetectionEnabled;
            console.log(`[KEYBOARD] 🔘 Click detection: ${clickDetectionEnabled ? 'ENABLED' : 'DISABLED'}`);
            console.log(`[KEYBOARD] Press 'C' again to toggle`);
        }
    });
    console.log(`[INIT] ✓ Keyboard shortcuts enabled (Press 'C' to toggle click detection)`);

    // Start Loop
    console.log(`[INIT] Starting animation loop...`);
    gameLoop();
    
    console.log(`[INIT] ========== init3DBoard SUCCESS ==========\n`);
}

function createBoard() {
    console.log(`[CREATE-BOARD] START: Creating ${boardSize}x${boardSize}x${boardSize} board`);
    
    boardGroup = new THREE.Group();
    boardGroup.position.set(0, 0, 0); // Explicitly center the board at origin
    cubes = [];
    cubeTargets = [];
    const spacing = 1.2;
    const offset = ((boardSize - 1) * spacing) / 2;

    console.log(`[CREATE-BOARD] spacing=${spacing}, offset=${offset}`);
    
    console.log(`[CREATE-BOARD] Creating grid lines...`);
    createGridLines(spacing, offset);

    let cubeCount = 0;
    console.log(`[CREATE-BOARD] Creating cubes...`);
    for (let x = 0; x < boardSize; x++) {
        cubes[x] = [];
        for (let y = 0; y < boardSize; y++) {
            cubes[x][y] = [];
            for (let z = 0; z < boardSize; z++) {
                const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                const material = new THREE.MeshStandardMaterial({
                    color: COLORS.empty, opacity: 0.15, transparent: true,
                    emissive: COLORS.empty, emissiveIntensity: 0.1
                });

                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(
                    x * spacing - offset,
                    (boardSize - 1 - y) * spacing - offset,
                    (boardSize - 1 - z) * spacing - offset
                );
                cube.userData.grid = { x: x + 1, y: y + 1, z: z + 1 };
                cube.userData.visibleBySlice = true;

                cube.castShadow = true;
                cube.receiveShadow = true;

                const edges = new THREE.EdgesGeometry(geometry);
                cube.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
                    color: COLORS.emptyEdge, opacity: 0.65, transparent: true 
                })));

                boardGroup.add(cube);
                cubes[x][y][z] = cube;
                cubeTargets.push(cube);
                cubeCount++;
            }
        }
    }
    
    scene.add(boardGroup);
    console.log(`[CREATE-BOARD] ✓ Created ${cubeCount} cubes, added to scene`);
    console.log(`[CREATE-BOARD] boardGroup children:`, boardGroup.children.length);
}

function createGridLines(spacing, offset) {
    console.log(`[GRID-LINES] Creating grid lines for ${boardSize} layers`);
    const mat = new THREE.LineBasicMaterial({ color: COLORS.grid, opacity: 0.5, transparent: true });
    
    let lineCount = 0;
    for (let layer = 0; layer < boardSize; layer++) {
        for (let i = 0; i < boardSize; i++) {
            const pos = i * spacing - offset;
            
            // Horizontal lines (X direction)
            const hGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-offset, (boardSize - 1 - layer) * spacing - offset, pos),
                new THREE.Vector3(offset, (boardSize - 1 - layer) * spacing - offset, pos)
            ]);
            boardGroup.add(new THREE.Line(hGeo, mat));
            lineCount++;
            
            // Vertical lines (Z direction)
            const vGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(pos, (boardSize - 1 - layer) * spacing - offset, -offset),
                new THREE.Vector3(pos, (boardSize - 1 - layer) * spacing - offset, offset)
            ]);
            boardGroup.add(new THREE.Line(vGeo, mat));
            lineCount++;
        }
    }
    
    console.log(`[GRID-LINES] ✓ Created ${lineCount} grid lines`);
}

export function updateCell(x, y, z, player) {
    const ix = x - 1; const iy = y - 1; const iz = z - 1;
    
    console.log(`\n[UPDATE-CELL] ========== START ==========`);
    console.log(`[UPDATE-CELL] Position: (${x},${y},${z}) → player="${player}"`);
    console.log(`[UPDATE-CELL] Array indexes: [${ix}][${iy}][${iz}]`);
    
    if (!cubes[ix]?.[iy]?.[iz]) {
        console.error(`[UPDATE-CELL] ✗ FATAL: Cell not found at [${ix}][${iy}][${iz}]`);
        console.error(`[UPDATE-CELL] cubes array structure:`, {
            hasX: !!cubes[ix],
            hasY: !!cubes[ix]?.[iy],
            hasZ: !!cubes[ix]?.[iy]?.[iz]
        });
        return;
    }
    
    const cube = cubes[ix][iy][iz];
    console.log(`[UPDATE-CELL] ✓ Cube found:`, cube);
    
    // Check current state
    let currentPlayer = '';
    for (let child of cube.children) {
        if (child.userData.isMarker) {
            currentPlayer = child.userData.playerType;
            break;
        }
    }
    
    console.log(`[UPDATE-CELL] Current state: "${currentPlayer}"`);
    console.log(`[UPDATE-CELL] New state: "${player}"`);
    
    if (currentPlayer === player) {
        console.log(`[UPDATE-CELL] No change needed, skipping`);
        console.log(`[UPDATE-CELL] ========== END (no-op) ==========\n`);
        return;
    }
    
    console.log(`[UPDATE-CELL] State change detected, updating...`);
    
    if (player === 'X') {
        console.log(`[UPDATE-CELL] Creating X marker...`);
        createMarker(cube, 'X');
    } else if (player === 'O') {
        console.log(`[UPDATE-CELL] Creating O marker...`);
        createMarker(cube, 'O');
    } else {
        console.log(`[UPDATE-CELL] Clearing marker...`);
        clearMarker(cube);
    }
    
    console.log(`[UPDATE-CELL] ========== END (updated) ==========\n`);
}

function createMarker(cube, type) {
    console.log(`[CREATE-MARKER] START: type="${type}"`);
    console.log(`[CREATE-MARKER] Cube position: (${cube.position.x.toFixed(2)}, ${cube.position.y.toFixed(2)}, ${cube.position.z.toFixed(2)})`);
    
    clearMarker(cube);
    
    const color = type === 'X' ? COLORS.playerX : COLORS.playerO;
    const glow = type === 'X' ? COLORS.playerXGlow : COLORS.playerOGlow;

    console.log(`[CREATE-MARKER] Updating cube material: color=0x${color.toString(16)}, glow=0x${glow.toString(16)}`);
    cube.material.color.setHex(color);
    cube.material.opacity = 0.6;
    cube.material.emissive.setHex(glow);
    cube.material.emissiveIntensity = 0.6;

    console.log(`[CREATE-MARKER] Creating ${type} geometry...`);
    const geometry = type === 'X'
        ? new THREE.BoxGeometry(0.6, 0.12, 0.12)
        : new THREE.TorusGeometry(0.3, 0.08, 16, 32);

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
        color: 0xffffff, emissive: glow, emissiveIntensity: 0.5 
    }));

    if (type === 'X') {
        const bar2 = mesh.clone();
        mesh.rotation.z = Math.PI / 4;
        bar2.rotation.z = -Math.PI / 4;
        mesh.add(bar2);
        console.log(`[CREATE-MARKER] ✓ X marker: two bars at 45°`);
    } else {
        console.log(`[CREATE-MARKER] ✓ O marker: torus`);
    }

    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.userData.isMarker = true;
    mesh.userData.playerType = type;

    cube.add(mesh);
    console.log(`[CREATE-MARKER] ✓ Mesh added to cube, children count:`, cube.children.length);
    
    animations.scaling.set(mesh, {
        startTime: Date.now(),
        duration: 300
    });
    console.log(`[CREATE-MARKER] ✓ Animation registered, total animations:`, animations.scaling.size);
    console.log(`[CREATE-MARKER] END\n`);
}

function clearMarker(cube) {
    console.log(`[CLEAR-MARKER] Clearing markers from cube...`);
    let removedCount = 0;
    
    for (let i = cube.children.length - 1; i >= 0; i--) {
        if (cube.children[i].userData.isMarker) {
            const mesh = cube.children[i];
            animations.scaling.delete(mesh);
            cube.remove(mesh);
            removedCount++;
        }
    }
    
    cube.material.color.setHex(COLORS.empty);
    cube.material.opacity = 0.15;
    cube.material.emissive.setHex(COLORS.empty);
    cube.material.emissiveIntensity = 0.1;
    
    console.log(`[CLEAR-MARKER] ✓ Removed ${removedCount} markers`);
}

function clearWinningLine() {
    console.log(`[CLEAR-WIN] Clearing winning line...`);
    winningController.clearAll();

    if (winningLine) {
        boardGroup.remove(winningLine);
        winningLine.geometry.dispose();
        winningLine.material.dispose();
        winningLine = null;
        console.log(`[CLEAR-WIN] ✓ Winning line removed`);
    }

    // Remove debug spheres
    const debugSpheres = [];
    boardGroup.traverse(obj => {
        if (obj.userData?.isDebugSphere) {
            debugSpheres.push(obj);
        }
    });

    debugSpheres.forEach(sphere => {
        boardGroup.remove(sphere);
        sphere.geometry.dispose();
        sphere.material.dispose();
    });

    if (debugSpheres.length > 0) {
        console.log(`[CLEAR-WIN] ✓ Removed ${debugSpheres.length} debug spheres`);
    }

    lastWinningPositions = null;
    console.log(`[CLEAR-WIN] ✓ Complete`);
}

export function highlightWinningLine(positions) {
    console.log(`\n[HIGHLIGHT-WIN] ========== START ==========`);
    console.log(`[HIGHLIGHT-WIN] Raw input:`, positions, `Type: ${typeof positions}`);
    
    clearWinningLine();

    const positionsArray = normalizePositions(positions);
    console.log(`[HIGHLIGHT-WIN] Normalized positions:`, positionsArray);
    
    if (!positionsArray || positionsArray.length === 0) {
        console.warn(`[HIGHLIGHT-WIN] ✗ No positions to process!`);
        return;
    }

    lastWinningPositions = positionsArray;

    const syncStartTime = performance.now();
    const cubesAndMarkers = [];
    
    console.log(`[HIGHLIGHT-WIN] Processing ${positionsArray.length} positions...`);
    for (const pos of positionsArray) {
        const parsed = parseWinningPosition(pos);
        if (!parsed) {
            console.warn(`[HIGHLIGHT-WIN] ✗ Failed to parse:`, pos);
            continue;
        }
        
        console.log(`[HIGHLIGHT-WIN] ✓ Parsed: "${pos}" → (${parsed.x},${parsed.y},${parsed.z})`);

        const { x, y, z } = parsed;
        const cube = cubes[x - 1]?.[y - 1]?.[z - 1];
        if (!cube) {
            console.warn(`[HIGHLIGHT-WIN] ✗ No cube at (${x},${y},${z})`);
            continue;
        }

        cube.userData.isWinning = true;
        // Start with bright green flash
        cube.material.emissiveIntensity = 2.5;
        cube.material.opacity = 0.7;
        cube.material.emissive.setHex(COLORS.winningGlow);
        cube.material.color.setHex(COLORS.winningFlash);

        const markers = [];
        cube.traverse(obj => {
            if (obj?.userData?.isMarker) markers.push(obj);
        });

        console.log(`[HIGHLIGHT-WIN] Cube at (${x},${y},${z}): ${markers.length} markers found`);
        cubesAndMarkers.push({ cube, markers });
    }

    console.log(`[HIGHLIGHT-WIN] Registering ${cubesAndMarkers.length} winning cells...`);
    for (const { cube, markers } of cubesAndMarkers) {
        if (!winningController.winningCubes.has(cube)) {
            winningController.winningCubes.set(cube, {
                startTime: syncStartTime,
                originalEmissiveIntensity: 0.6
            });
        }

        for (const m of markers) {
            if (!winningController.winningMarkers.has(m)) {
                winningController.winningMarkers.set(m, syncStartTime);
            }
        }
    }

    console.log(`[HIGHLIGHT-WIN] Animation registered: ${winningController.winningCubes.size} cubes, ${winningController.winningMarkers.size} markers`);
    
    if (!winningController.isAnimating) {
        console.log(`[HIGHLIGHT-WIN] Starting animation loop...`);
        winningController.isAnimating = true;
        winningController.update();
    }

    // Draw line if we have 2+ positions
    if (positionsArray.length >= 2) {
        console.log(`[HIGHLIGHT-WIN] Drawing winning line...`);
        drawWinningLine(positionsArray);
    } else {
        console.warn(`[HIGHLIGHT-WIN] ⚠️ Only ${positionsArray.length} position(s) - need 2+ to draw line`);
        console.warn(`[HIGHLIGHT-WIN] This may indicate a bug in the win detection logic`);
    }
    
    console.log(`[HIGHLIGHT-WIN] ========== END ==========\n`);
}

function normalizePositions(positions) {
    console.log(`[NORMALIZE] Input:`, positions, `Type: ${typeof positions}`);
    
    if (!positions) {
        console.log(`[NORMALIZE] → null (input was null/undefined)`);
        return null;
    }
    
    if (Array.isArray(positions)) {
        console.log(`[NORMALIZE] → array (length: ${positions.length})`);
        return positions;
    }
    
    if (typeof positions === 'object') {
        const values = Object.values(positions);
        console.log(`[NORMALIZE] → Object.values() (length: ${values.length})`);
        return values;
    }
    
    if (typeof positions === 'string') {
        try {
            const parsed = JSON.parse(positions);
            console.log(`[NORMALIZE] → JSON parsed:`, parsed);
            return Array.isArray(parsed) ? parsed : [positions];
        } catch {
            console.log(`[NORMALIZE] → [string] (JSON parse failed)`);
            return [positions];
        }
    }
    
    console.log(`[NORMALIZE] → null (unhandled type)`);
    return null;
}

function parseWinningPosition(pos) {
    if (!pos) return null;

    // "(x,y,z)" format
    const paren = pos.match(/\((\d+),(\d+),(\d+)\)/);
    if (paren) {
        const [, x, y, z] = paren.map(Number);
        return { x, y, z };
    }

    // "x,y,z" format
    const csv = pos.match(/^(\d+),(\d+),(\d+)$/);
    if (csv) {
        const [, x, y, z] = csv.map(Number);
        return { x, y, z };
    }

    // "xyz" compact format
    if (typeof pos === 'string') {
        const trimmed = pos.trim();
        if (trimmed.length === 3 && /^\d{3}$/.test(trimmed)) {
            return {
                x: Number(trimmed[0]),
                y: Number(trimmed[1]),
                z: Number(trimmed[2])
            };
        }
    }

    return null;
}

function drawWinningLine(positions) {
    console.log(`[DRAW-LINE] ========== START ==========`);
    console.log(`[DRAW-LINE] Drawing line through ${positions.length} positions:`, positions);

    const spacing = 1.2;
    const offset = ((boardSize - 1) * spacing) / 2;
    console.log(`[DRAW-LINE] Board size: ${boardSize}, spacing: ${spacing}, offset: ${offset}`);

    const points = positions.map((pos, idx) => {
        const parsed = parseWinningPosition(pos);
        if (!parsed) {
            console.warn(`[DRAW-LINE] Failed to parse position ${idx}:`, pos);
            return null;
        }

        const { x, y, z } = parsed;
        const point3D = new THREE.Vector3(
            (x - 1) * spacing - offset,
            (boardSize - 1 - (y - 1)) * spacing - offset,
            (boardSize - 1 - (z - 1)) * spacing - offset
        );

        console.log(`[DRAW-LINE] Position ${idx}: (${x},${y},${z}) -> 3D coords:`, point3D);
        return point3D;
    }).filter(p => p);

    console.log(`[DRAW-LINE] Generated ${points.length} 3D points`);

    if (points.length < 2) {
        console.error(`[DRAW-LINE] ✗ FATAL: Not enough points to draw line (need 2+, got ${points.length})`);
        return;
    }

    const curve = new THREE.CatmullRomCurve3(points);

    // Create a sleek, bright winning line
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.08, 16, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({ 
        color: COLORS.winningGlow,
        emissive: COLORS.winningGlow,
        emissiveIntensity: 3.0,  // Maximum brightness
        metalness: 0.9,
        roughness: 0.1,
        transparent: false  // Fully opaque for maximum visibility
    });

    winningLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
    winningLine.castShadow = true;
    winningLine.receiveShadow = false;
    winningLine.renderOrder = 999; // Render on top of everything
    winningLine.userData.isWinningLine = true; // Mark to prevent rotation
    boardGroup.add(winningLine);

    // Add debug spheres at each endpoint to verify positions
    const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,  // Yellow
        emissive: 0xffff00,
        emissiveIntensity: 2.0
    });

    points.forEach((point, index) => {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(point);
        sphere.renderOrder = 1000; // Even higher than line
        sphere.userData.isDebugSphere = true;
        boardGroup.add(sphere);
        console.log(`[DRAW-LINE] Debug sphere ${index + 1} at:`, point);
    });
    
    console.log(`[DRAW-LINE] ✓ Winning line created:`);
    console.log(`[DRAW-LINE]   - Geometry: TubeGeometry (radius: 0.08, segments: 64)`);
    console.log(`[DRAW-LINE]   - Material: emissiveIntensity: 3.0`);
    console.log(`[DRAW-LINE]   - RenderOrder: 999`);
    console.log(`[DRAW-LINE]   - Position:`, winningLine.position);
    console.log(`[DRAW-LINE]   - Parent:`, winningLine.parent ? 'boardGroup' : 'NONE');
    console.log(`[DRAW-LINE]   - Visible:`, winningLine.visible);
    console.log(`[DRAW-LINE]   - boardGroup children count:`, boardGroup.children.length);

    winningController.startLineAnimation(winningLine);
    console.log(`[DRAW-LINE] ========== END ==========`);
}

export function resetBoard(size = 3) {
    console.log(`\n[RESET-BOARD] ========== START ==========`);
    console.log(`[RESET-BOARD] Current size: ${boardSize}, New size: ${size}`);
    
    if (size !== boardSize) {
        console.log(`[RESET-BOARD] Size change detected, recreating board...`);
        boardSize = size;
        if (boardGroup) scene.remove(boardGroup);
        animations.scaling.clear();
        createBoard();
        applySlice();
        console.log(`[RESET-BOARD] ✓ Board recreated`);
    } else {
        console.log(`[RESET-BOARD] Clearing existing board...`);
        clearWinningLine(); // Clear all winning animations, line, and debug spheres
        animations.scaling.clear();

        // Also clear isWinning flag from all cubes
        let clearedCount = 0;
        for (let x = 0; x < boardSize; x++)
            for (let y = 0; y < boardSize; y++)
                for (let z = 0; z < boardSize; z++) {
                    cubes[x][y][z].userData.isWinning = false;
                    clearMarker(cubes[x][y][z]);
                    clearedCount++;
                }
        
        console.log(`[RESET-BOARD] ✓ Cleared ${clearedCount} cells`);
        applySlice();
    }
    
    console.log(`[RESET-BOARD] ========== END ==========\n`);
}

export function toggleRotation(enabled) { 
    console.log(`[ROTATION] Toggle: ${enabled}`);
    autoRotate = enabled; 
}

export function setRotationSpeed(speed) { 
    console.log(`[ROTATION] Speed: ${speed}`);
    rotationSpeed = speed; 
}

// Camera transition animation state
let cameraTransition = null; // { from, to, startTime, duration }

export function setCameraView(view) { 
    console.log(`[CAMERA] View: ${view}`);
    autoRotate = false;
    if (!camera) return;

    const dist = boardSize * 2.6;
    let pos = { x: dist, y: dist * 0.8, z: dist };

    switch (view) {
        case 'front':
            pos = { x: 0, y: 0, z: dist };
            break;
        case 'back':
            pos = { x: 0, y: 0, z: -dist };
            break;
        case 'left':
            pos = { x: -dist, y: 0, z: 0 };
            break;
        case 'right':
            pos = { x: dist, y: 0, z: 0 };
            break;
        case 'top':
            pos = { x: 0, y: dist, z: 0 };
            break;
        case 'bottom':
            pos = { x: 0, y: -dist, z: 0 };
            break;
        case 'diagonal':
            pos = { x: dist, y: dist * 0.8, z: dist };
            break;
        default:
            break;
    }

    // Smooth animated transition
    cameraTransition = {
        from: camera.position.clone(),
        to: new THREE.Vector3(pos.x, pos.y, pos.z),
        startTime: performance.now(),
        duration: 800 // ms
    };
    console.log(`[CAMERA] Animating to (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
}

export function setDotNetReference(dotNetRef) {
    console.log(`[DOTNET] Reference set`);
    dotNetHelper = dotNetRef;
}

export function setSlice(axis, index) {
    sliceAxis = axis || 'none';
    sliceIndex = Number(index) || 1;
    console.log(`[SLICE] Axis=${sliceAxis}, Index=${sliceIndex}`);
    applySlice();
}

function applySlice() {
    if (!cubeTargets.length) return;

    for (const cube of cubeTargets) {
        const grid = cube.userData?.grid;
        if (!grid) continue;

        let visible = true;
        if (sliceAxis === 'x' && grid.x !== sliceIndex) visible = false;
        if (sliceAxis === 'y' && grid.y !== sliceIndex) visible = false;
        if (sliceAxis === 'z' && grid.z !== sliceIndex) visible = false;

        cube.visible = visible;
        cube.userData.visibleBySlice = visible;
    }
}

function cleanup() {
    console.log(`[CLEANUP] Starting cleanup...`);
    clearPendingMove(); // Clear any pending move indicator
    detachPointerHandlers();
    if (controls) {
        controls.dispose();
        console.log(`[CLEANUP] ✓ Controls disposed`);
    }
    if (renderer) {
        renderer.dispose();
        console.log(`[CLEANUP] ✓ Renderer disposed`);
    }
    if (boardGroup) {
        scene.remove(boardGroup);
        console.log(`[CLEANUP] ✓ Board group removed from scene`);
    }
    dotNetHelper = null;
    raycaster = null;
    mouse = null;
    cubeTargets = [];
    console.log(`[CLEANUP] Complete`);
}

// Pending move visualization
let pendingMoveIndicator = null;

export function showPendingMove(x, y, z) {
    console.log(`[PENDING-MOVE] Showing pending move at (${x},${y},${z})`);

    // Clear any existing indicator
    clearPendingMove();

    if (!boardGroup || !cubes || x < 1 || y < 1 || z < 1 || 
        x > boardSize || y > boardSize || z > boardSize) {
        console.warn(`[PENDING-MOVE] Invalid position or board not ready`);
        return;
    }

    const cube = cubes[x - 1][y - 1][z - 1];
    if (!cube) {
        console.warn(`[PENDING-MOVE] Cube not found at (${x},${y},${z})`);
        return;
    }

    // Create a pulsing red outline around the cube
    const geometry = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const material = new THREE.MeshStandardMaterial({
        color: 0xdc2626,  // Red color
        emissive: 0xdc2626,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });

    pendingMoveIndicator = new THREE.Mesh(geometry, material);
    pendingMoveIndicator.position.copy(cube.position);
    pendingMoveIndicator.userData.isPendingIndicator = true;
    pendingMoveIndicator.renderOrder = 998; // Just below winning line

    boardGroup.add(pendingMoveIndicator);
    console.log(`[PENDING-MOVE] ✓ Indicator created at position:`, cube.position);
}

export function clearPendingMove() {
    if (pendingMoveIndicator) {
        console.log(`[PENDING-MOVE] Clearing pending move indicator`);
        if (pendingMoveIndicator.parent) {
            pendingMoveIndicator.parent.remove(pendingMoveIndicator);
        }
        pendingMoveIndicator.geometry?.dispose();
        pendingMoveIndicator.material?.dispose();
        pendingMoveIndicator = null;
    }
}

function onWindowResize() {
    console.log(`[RESIZE] Window resized`);
    if (!camera || !renderer) return;
    const box = renderer.domElement.parentElement;
    if (box) {
        const w = box.clientWidth;
        const h = box.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        console.log(`[RESIZE] ✓ Renderer: ${w}x${h}`);
    }
}

// Main animation loop
let frameCount = 0;
function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    // Log every 300 frames (~5 seconds at 60fps)
    if (frameCount % 300 === 0) {
        console.log(`[GAME-LOOP] Frame ${frameCount}, Active animations: ${animations.scaling.size}`);
    }
    frameCount++;

    if (controls) controls.update();

    // Smooth camera transition
    if (cameraTransition) {
        const elapsed = performance.now() - cameraTransition.startTime;
        const t = Math.min(elapsed / cameraTransition.duration, 1);
        // Ease-out cubic for a smooth deceleration
        const ease = 1 - Math.pow(1 - t, 3);

        camera.position.lerpVectors(cameraTransition.from, cameraTransition.to, ease);
        camera.lookAt(0, 0, 0);
        if (controls) {
            controls.target.set(0, 0, 0);
            controls.update();
        }

        if (t >= 1) {
            cameraTransition = null;
        }
    }

    const currentTime = Date.now();

    if (boardGroup) {
        if (autoRotate) boardGroup.rotation.y += rotationSpeed;

        // Scale animations
        if (animations.scaling.size > 0) {
            animations.scaling.forEach((anim, mesh) => {
                const elapsed = currentTime - anim.startTime;
                const progress = Math.min(elapsed / anim.duration, 1);
                
                if (mesh.parent) {
                    mesh.scale.set(progress, progress, progress);
                }
                
                if (progress >= 1) {
                    animations.scaling.delete(mesh);
                }
            });
        }

        // Winning animations (markers spin, cubes pulse, but NOT the line)
        const time = currentTime;
        boardGroup.traverse(obj => {
            if (obj.userData && obj.userData.isWinning && !obj.userData.isWinningLine) {
                if (obj.userData.isMarker) {
                    obj.rotation.x += 0.05;
                    obj.rotation.y += 0.1;
                } else {
                    const s = 1 + Math.sin(time * 0.005) * 0.1;
                    if (obj.geometry.type === 'BoxGeometry') obj.scale.set(s, s, s);
                    else obj.material.opacity = 0.5 + Math.sin(time * 0.01) * 0.5;
                }
            }
        });

        // Animate pending move indicator with dramatic pulsing
        if (pendingMoveIndicator && pendingMoveIndicator.parent) {
            const t = time * 0.003;
            const pulse = 1 + Math.sin(t * 3.0) * 0.15;
            pendingMoveIndicator.scale.set(pulse, pulse, pulse);

            const opacity = 0.3 + Math.sin(t * 3.0) * 0.2;
            pendingMoveIndicator.material.opacity = opacity;
            pendingMoveIndicator.material.emissiveIntensity = 2.0 + Math.sin(t * 3.0) * 1.0;
        }
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
}

function attachPointerHandlers() {
    if (!renderer || !renderer.domElement) return;
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
}

function detachPointerHandlers() {
    if (!renderer || !renderer.domElement) return;
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    renderer.domElement.removeEventListener('pointerup', onPointerUp);
    pointerDown = null;
}

function onPointerDown(event) {
    // Only track primary button (left-click)
    if (event.button !== 0) return;

    pointerDown = { 
        x: event.clientX, 
        y: event.clientY,
        time: Date.now()
    };
}

function onPointerUp(event) {
    if (!pointerDown) return;
    if (event.button !== 0) return; // Only primary button

    const dx = Math.abs(event.clientX - pointerDown.x);
    const dy = Math.abs(event.clientY - pointerDown.y);
    const elapsed = Date.now() - pointerDown.time;

    // Consider it a click only if:
    // 1. Movement is minimal (< 5 pixels)
    // 2. Duration is short (< 300ms)
    const isClick = (dx < 5 && dy < 5 && elapsed < 300);

    pointerDown = null;

    if (isClick) {
        console.log(`[POINTER] Click detected (dx=${dx}, dy=${dy}, time=${elapsed}ms)`);
        handleCanvasClick(event);
    } else {
        console.log(`[POINTER] Drag detected (dx=${dx}, dy=${dy}, time=${elapsed}ms) - ignoring`);
    }
}

// Double-click detection for quick confirmation
let lastClickTime = 0;
let lastClickPosition = null;

function handleCanvasClick(event) {
    if (!clickDetectionEnabled) {
        console.log(`[CLICK] Click detection disabled - ignoring`);
        return;
    }

    if (!raycaster || !mouse || !camera || !renderer) return;
    if (!dotNetHelper) return;
    if (!cubeTargets.length) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // ISSUE 3 FIX: Only raycast against VISIBLE cubes (respects slice mode)
    const visibleCubes = cubeTargets.filter(c => c.visible && c.userData?.visibleBySlice !== false);
    const hits = raycaster.intersectObjects(visibleCubes, false);

    if (!hits.length) return;

    const cube = hits[0].object;
    const grid = cube.userData?.grid;
    if (!grid) return;

    console.log(`[CLICK] 🎯 3D cell clicked: (${grid.x}, ${grid.y}, ${grid.z})`);

    // ISSUE 2 FIX: Detect double-click for quick confirmation
    const now = Date.now();
    const isSameCell = lastClickPosition && 
                      lastClickPosition.x === grid.x &&
                      lastClickPosition.y === grid.y &&
                      lastClickPosition.z === grid.z;
    const isDoubleClick = isSameCell && (now - lastClickTime) < 500; // 500ms window

    lastClickTime = now;
    lastClickPosition = { x: grid.x, y: grid.y, z: grid.z };

    if (isDoubleClick) {
        console.log(`[CLICK] ⚡ Double-click detected - quick confirm!`);
        // First click already set pending move, now immediately confirm it
        dotNetHelper.invokeMethodAsync('ConfirmMoveNow');
    } else {
        // Single click - start/change pending move
        dotNetHelper.invokeMethodAsync('Handle3DMove', grid.x, grid.y, grid.z);
    }
}

console.log('[GAME3D] All functions exported and ready');