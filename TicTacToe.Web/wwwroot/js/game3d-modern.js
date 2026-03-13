// 3D Tic-Tac-Toe - Modern ES Module Version
// Using Three.js as proper ES module import
// ==========================================

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';

let scene, camera, renderer, board3D;
let cubes = [];
let rotationSpeed = 0.003;
let autoRotate = false;
let boardSize = 3;
let boardGroup;
let winningLine = null;
let controls = null;
let startTime = Date.now();

const animations = {
    scaling: new Map()
};

const COLORS = {
    background: 0x0f172a,
    backgroundAccent: 0x1e293b,
    grid: 0x60a5fa,
    gridGlow: 0x3b82f6,
    playerX: 0x06b6d4,
    playerXGlow: 0x22d3ee,
    playerO: 0xf59e0b,
    playerOGlow: 0xfbbf24,
    empty: 0x1e3a5f,
    emptyEdge: 0x3b82f6,
    ambient: 0x404040,
    directional: 0xffffff,
    pointLight: 0x60a5fa
};

export function init3DBoard(containerId, size = 3) {
    console.log(`\n[CLIENT] ========== init3DBoard START (MODERN ES MODULE) ==========`);
    console.log(`[CLIENT] Container ID: ${containerId}`);
    console.log(`[CLIENT] Board Size: ${size}`);
    console.log(`[CLIENT] THREE.js version: ${THREE.REVISION}`);
    
    boardSize = size;
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[CLIENT] ✗ Container not found: ${containerId}`);
        return;
    }
    console.log(`[CLIENT] ✓ Container found (${container.clientWidth}x${container.clientHeight})`);

    cleanup();
    console.log(`[CLIENT] ✓ Cleanup complete`);

    // Setup Scene
    console.log(`[CLIENT] Creating THREE.Scene...`);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    scene.fog = new THREE.Fog(COLORS.backgroundAccent, 10, 50);
    console.log(`[CLIENT] ✓ Scene created`);

    const aspect = container.clientWidth / container.clientHeight;
    console.log(`[CLIENT] Creating camera (aspect: ${aspect})`);
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    const distance = size * 2.5;
    camera.position.set(distance, distance * 0.8, distance);
    camera.lookAt(0, 0, 0);
    console.log(`[CLIENT] ✓ Camera created at (${distance}, ${distance * 0.8}, ${distance})`);

    console.log(`[CLIENT] Creating WebGL renderer...`);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    console.log(`[CLIENT] ✓ Renderer created (${container.clientWidth}x${container.clientHeight})`);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    console.log(`[CLIENT] ✓ Canvas appended to DOM`);

    // Lighting
    console.log(`[CLIENT] Adding lights...`);
    scene.add(new THREE.AmbientLight(COLORS.ambient, 0.4));

    const dirLight = new THREE.DirectionalLight(COLORS.directional, 1.0);
    dirLight.position.set(10, 10, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    scene.add(new THREE.DirectionalLight(COLORS.directional, 0.3));
    console.log(`[CLIENT] ✓ Lights added`);

    // Create World
    console.log(`[CLIENT] Creating board...`);
    createBoard();
    console.log(`[CLIENT] ✓ Board created`);
    
    window.addEventListener('resize', onWindowResize);

    // Start Loop
    console.log(`[CLIENT] Starting animation loop...`);
    gameLoop();
    
    console.log(`[CLIENT] ========== init3DBoard SUCCESS ==========\n`);
}

function createBoard() {
    console.log(`[CLIENT] createBoard: Creating ${boardSize}x${boardSize}x${boardSize} board`);
    
    boardGroup = new THREE.Group();
    cubes = [];
    const spacing = 1.2;
    const offset = ((boardSize - 1) * spacing) / 2;

    console.log(`[CLIENT] createBoard: spacing=${spacing}, offset=${offset}`);

    let cubeCount = 0;
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

                cube.castShadow = true;
                cube.receiveShadow = true;

                const edges = new THREE.EdgesGeometry(geometry);
                cube.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLORS.emptyEdge, opacity: 0.4, transparent: true })));

                boardGroup.add(cube);
                cubes[x][y][z] = cube;
                cubeCount++;
            }
        }
    }
    scene.add(boardGroup);
    console.log(`[CLIENT] createBoard: ✓ Created ${cubeCount} cubes`);
}

export function updateCell(x, y, z, player) {
    const ix = x - 1; const iy = y - 1; const iz = z - 1;
    
    console.log(`[CLIENT] updateCell: (${x},${y},${z}) = "${player}"`);
    
    if (!cubes[ix]?.[iy]?.[iz]) {
        console.error(`[CLIENT] ✗ updateCell: Cell not found at [${ix}][${iy}][${iz}]`);
        return;
    }
    
    const cube = cubes[ix][iy][iz];
    
    // Check what's currently displayed
    let currentPlayer = '';
    for (let child of cube.children) {
        if (child.userData.isMarker) {
            currentPlayer = child.userData.playerType;
            break;
        }
    }
    
    // Only update if changed
    if (currentPlayer === player) {
        console.log(`[CLIENT] updateCell: No change (already "${player}"), skipping`);
        return;
    }
    
    console.log(`[CLIENT] updateCell: Change detected ("${currentPlayer}" → "${player}"), updating`);
    
    if (player === 'X') createMarker(cube, 'X');
    else if (player === 'O') createMarker(cube, 'O');
    else clearMarker(cube);
}

function createMarker(cube, type) {
    console.log(`[CLIENT] createMarker: type="${type}"`);
    
    clearMarker(cube);
    const color = type === 'X' ? COLORS.playerX : COLORS.playerO;
    const glow = type === 'X' ? COLORS.playerXGlow : COLORS.playerOGlow;

    cube.material.color.setHex(color);
    cube.material.opacity = 0.6;
    cube.material.emissive.setHex(glow);
    cube.material.emissiveIntensity = 0.6;

    const geometry = type === 'X'
        ? new THREE.BoxGeometry(0.6, 0.12, 0.12)
        : new THREE.TorusGeometry(0.3, 0.08, 16, 32);

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: glow, emissiveIntensity: 0.5 }));

    if (type === 'X') {
        const bar2 = mesh.clone();
        mesh.rotation.z = Math.PI / 4;
        bar2.rotation.z = -Math.PI / 4;
        mesh.add(bar2);
    }

    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.userData.isMarker = true;
    mesh.userData.playerType = type;

    cube.add(mesh);
    
    animations.scaling.set(mesh, {
        startTime: Date.now(),
        duration: 300
    });
    
    console.log(`[CLIENT] ✓ Marker created and animation registered`);
}

function clearMarker(cube) {
    for (let i = cube.children.length - 1; i >= 0; i--) {
        if (cube.children[i].userData.isMarker) {
            const mesh = cube.children[i];
            animations.scaling.delete(mesh);
            cube.remove(mesh);
        }
    }
    cube.material.color.setHex(COLORS.empty);
    cube.material.opacity = 0.15;
    cube.material.emissiveIntensity = 0.1;
}

export function highlightWinningLine(positions) {
    if (winningLine) { boardGroup.remove(winningLine); winningLine = null; }

    boardGroup.traverse(o => { if (o.userData) o.userData.isWinning = false; });

    let points = [];
    if (!Array.isArray(positions)) positions = [positions];

    positions.forEach(pos => {
        let x, y, z;
        if (typeof pos === 'string' && pos.length === 3) {
            x = parseInt(pos[0]); y = parseInt(pos[1]); z = parseInt(pos[2]);
        } else { return; }

        const cube = cubes[x - 1]?.[y - 1]?.[z - 1];
        if (cube) {
            cube.userData.isWinning = true;
            cube.material.emissiveIntensity = 1.0;
            cube.material.opacity = 0.9;
            points.push(cube.position.clone());

            cube.children.forEach(c => { if (c.userData.isMarker) c.userData.isWinning = true; });
        }
    });

    if (points.length > 1) {
        const dx = Math.abs(points[0].x - points[points.length - 1].x);
        const dy = Math.abs(points[0].y - points[points.length - 1].y);
        const dz = Math.abs(points[0].z - points[points.length - 1].z);
        if (dx > dy && dx > dz) points.sort((a, b) => a.x - b.x);
        else if (dy > dx && dy > dz) points.sort((a, b) => a.y - b.y);
        else points.sort((a, b) => a.z - b.z);

        const curve = new THREE.CatmullRomCurve3(points);
        const tube = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 64, 0.08, 8, false),
            new THREE.MeshStandardMaterial({ color: COLORS.gridGlow, emissive: COLORS.gridGlow, transparent: true, opacity: 0.9 })
        );
        tube.userData.isWinning = true;
        winningLine = tube;
        boardGroup.add(tube);
    }
}

export function resetBoard(size = 3) {
    console.log(`[CLIENT] resetBoard: size=${size}, current boardSize=${boardSize}`);
    
    if (size !== boardSize) {
        boardSize = size;
        if (boardGroup) scene.remove(boardGroup);
        animations.scaling.clear();
        createBoard();
        console.log(`[CLIENT] ✓ resetBoard: Board recreated`);
    } else {
        if (winningLine) boardGroup.remove(winningLine);
        winningLine = null;
        animations.scaling.clear();
        
        let clearedCount = 0;
        for (let x = 0; x < boardSize; x++)
            for (let y = 0; y < boardSize; y++)
                for (let z = 0; z < boardSize; z++) {
                    clearMarker(cubes[x][y][z]);
                    clearedCount++;
                }
        
        console.log(`[CLIENT] ✓ resetBoard: Cleared ${clearedCount} cells`);
    }
}

export function toggleRotation(enabled) { autoRotate = enabled; }
export function setRotationSpeed(speed) { rotationSpeed = speed; }
export function setCameraView(view) { autoRotate = false; }

function cleanup() {
    if (renderer) renderer.dispose();
    if (boardGroup) scene.remove(boardGroup);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    const box = renderer.domElement.parentElement;
    if (box) {
        camera.aspect = box.clientWidth / box.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(box.clientWidth, box.clientHeight);
    }
}

function gameLoop() {
    requestAnimationFrame(gameLoop);

    const currentTime = Date.now();

    if (boardGroup) {
        if (autoRotate) boardGroup.rotation.y += rotationSpeed;

        // Handle scale animations
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

        // Winning piece animations
        const time = currentTime;
        boardGroup.traverse(obj => {
            if (obj.userData && obj.userData.isWinning) {
                if (obj.userData.isMarker) {
                    obj.rotation.x += 0.05;
                    obj.rotation.y += 0.1;
                } else {
                    const s = 1 + Math.sin(time * 0.005) * 0.1;
                    if (obj.geometry?.type === 'BoxGeometry') obj.scale.set(s, s, s);
                    else if (obj.material?.opacity !== undefined) obj.material.opacity = 0.5 + Math.sin(time * 0.01) * 0.5;
                }
            }
        });
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
}
