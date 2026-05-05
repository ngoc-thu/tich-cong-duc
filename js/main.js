// UI Elements
const meritEl = document.getElementById('merit');
const streakEl = document.getElementById('streak');
const uiHint = document.getElementById('hint');
const comboDisplay = document.getElementById('combo-display');
const comboNumberEl = document.getElementById('combo-number');
const blessingEl = document.getElementById('blessing');

let meritCount = 0;
let syncTimeout = null;

// ══════════════════════════════════════════
//   BELL NEGLECT PENALTY (Bỏ Bê Chuông)
// ══════════════════════════════════════════
const CHUONG_WARN_MS  = 20000; // warn after 20s without chuông
const CHUONG_DRAIN_MS = 30000; // penalize mõ hits after 30s
let lastChuongHitTime = Date.now();
let chuongWarnShown = false;
let chuongWarnTimer = null;

// Same logic for mõ neglect (if you ONLY spam chuông without mõ)
const MO_WARN_MS  = 20000;
const MO_DRAIN_MS = 30000;
let lastMoHitTime = Date.now();
let moWarnShown = false;
let moWarnTimer = null;

function scheduleChuongWarn() {
    if (chuongWarnTimer) clearTimeout(chuongWarnTimer);
    chuongWarnShown = false;
    chuongWarnTimer = setTimeout(() => {
        chuongWarnShown = true;
        if (blessingEl) {
            blessingEl.style.color = '#884400';
            blessingEl.style.opacity = '1';
            blessingEl.textContent = '🔔 Lâu quá không gõ chuông... Phật đang mất kiên nhẫn!';
        }
    }, CHUONG_WARN_MS);
}

function scheduleMoWarn() {
    if (moWarnTimer) clearTimeout(moWarnTimer);
    moWarnShown = false;
    moWarnTimer = setTimeout(() => {
        moWarnShown = true;
        if (blessingEl) {
            blessingEl.style.color = '#884400';
            blessingEl.style.opacity = '1';
            blessingEl.textContent = '🥁 Chuông thì phải có mõ! Đừng quên gõ mõ nha!';
        }
    }, MO_WARN_MS);
}

function isChuongNeglected() {
    return (Date.now() - lastChuongHitTime) > CHUONG_DRAIN_MS;
}

function isMoNeglected() {
    return (Date.now() - lastMoHitTime) > MO_DRAIN_MS;
}

// Kick off on load
scheduleChuongWarn();
scheduleMoWarn();

// ══════════════════════════════════════════
//   COMBO SYSTEM
// ══════════════════════════════════════════
let lastHitTime = 0;
let comboCount = 0;
let comboHideTimer = null;

function getComboMultiplier(combo) {
    if (combo >= 30) return 10;
    if (combo >= 20) return 5;
    if (combo >= 10) return 3;
    if (combo >= 5) return 2;
    return 1;
}

function updateComboUI(combo) {
    const mult = getComboMultiplier(combo);
    if (combo >= 5) {
        comboDisplay.style.opacity = '1';
        comboNumberEl.textContent = combo + 'x';
        comboNumberEl.style.color = mult >= 10 ? '#FF4500' : mult >= 5 ? '#FF6B35' : mult >= 3 ? '#E8911F' : '#D2691E';
        comboNumberEl.style.transform = 'scale(1.2)';
        setTimeout(() => { comboNumberEl.style.transform = 'scale(1)'; }, 100);
        // Background mood
        if (mult >= 10) document.body.style.backgroundColor = '#fff5f0';
        else if (mult >= 5) document.body.style.backgroundColor = '#fffaf0';
        else document.body.style.backgroundColor = '#ffffff';
    } else {
        comboDisplay.style.opacity = '0';
        document.body.style.backgroundColor = '#ffffff';
    }
    // Reset hide timer
    if (comboHideTimer) clearTimeout(comboHideTimer);
    comboHideTimer = setTimeout(() => {
        comboCount = 0;
        comboDisplay.style.opacity = '0';
        document.body.style.backgroundColor = '#ffffff';
        streakEl.textContent = '';
    }, 1800);
}

// ══════════════════════════════════════════
//   HIT PARTICLES
// ══════════════════════════════════════════
const HIT_EMOJI = ['🌸', '✨', '💫', '🙏', '🌼', '⭐', '🪷', '🌟', '🎊', '🔔'];

function spawnHitParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = 'hit-particle';
            el.textContent = HIT_EMOJI[Math.floor(Math.random() * HIT_EMOJI.length)];
            el.style.left = (x + (Math.random() - 0.5) * 100) + 'px';
            el.style.top = (y + (Math.random() - 0.5) * 50) + 'px';
            el.style.animationDuration = (0.8 + Math.random() * 0.5) + 's';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1300);
        }, i * 55);
    }
}

// ══════════════════════════════════════════
//   CAMERA SHAKE
// ══════════════════════════════════════════
let shakeIntensity = 0;
function triggerShake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
}

// ══════════════════════════════════════════
//   ACHIEVEMENT TOASTS
// ══════════════════════════════════════════
const ACHIEVEMENTS = [
    { score: 10, icon: '🎉', title: 'Nhập Môn Tu Hành!', desc: 'Gõ 10 tiếng đầu tiên, cuộc hành trình bắt đầu!' },
    { score: 50, icon: '🥁', title: 'Tay Nghề Đang Lên!', desc: '50 công đức. Cái dùi đang quen tay rồi này.' },
    { score: 100, icon: '🏆', title: '100 Công Đức!', desc: 'Kiếp này có lẽ ăn ở không đến nỗi tệ lắm!' },
    { score: 500, icon: '🌟', title: 'Đại Thần Mới Nổi!', desc: '500 gõ. Boss cõi âm đang chú ý bạn đó.' },
    { score: 1000, icon: '⚡', title: '1000 Công Đức!', desc: 'Kiếp sau chắc được làm... nhân viên chùa!' },
    { score: 5000, icon: '🔥', title: 'Siêu Thánh Tăng!', desc: 'Còn phàm trần không vậy bạn ơi??' },
    { score: 10000, icon: '🌈', title: 'HUYỀN THOẠI XUẤT HIỆN!', desc: 'Bạn có cần đi ngủ không? Thật sự đó.' },
    { score: 50000, icon: '👼', title: 'Bồ Tát Vỉa Hè!', desc: 'Tổ tiên đang nhìn bạn với ánh mắt khó tả.' },
    { score: 999999, icon: '🧘', title: 'ĐẮC ĐẠO THÀNH PHẬT', desc: 'Công đức vô lượng. Thế giới này không còn gì lưu luyến.' },
];
const shownAchievements = new Set();

function checkAchievements(score) {
    for (const ach of ACHIEVEMENTS) {
        if (score >= ach.score && !shownAchievements.has(ach.score)) {
            shownAchievements.add(ach.score);
            showAchievementToast(ach);
        }
    }
}

function showAchievementToast(ach) {
    const el = document.createElement('div');
    el.className = 'achievement-toast';
    el.innerHTML = `<div class="ach-title">${ach.icon} ${ach.title}</div><div class="ach-desc">${ach.desc}</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('ach-show')));
    setTimeout(() => {
        el.classList.remove('ach-show');
        setTimeout(() => el.remove(), 600);
    }, 3800);
}

// ══════════════════════════════════════════
//   BLESSING TICKER
// ══════════════════════════════════════════
const BLESSINGS = [
    'Mỗi tiếng mõ là một lần giải nghiệp 🙏',
    'Gõ nhiều vào, kiếp sau được làm người! 🌸',
    'Deadline đến cũng phải gõ mõ trước cái đã 😅',
    'Boss? Sếp? Gõ mõ ba tiếng rồi tính 🙏',
    'Khói nhang bay đi, stress cũng bay theo 🪷',
    'Công đức tích lũy, túi tiền vẫn y nguyên 😂',
    'Gõ đủ 99999 được thăng cấp về cõi... nghỉ hưu sớm',
    'Mỗi click là một karma point được cộng ✨',
    'Nam Mô A Di Đà... CTRL+Z không có tác dụng ở đây 💫',
    'Gõ mõ: liệu pháp tâm lý rẻ nhất vũ trụ 🪷',
    'Cứ gõ đi, Phật sẽ đọc được combo của bạn 🔔',
    'Mõ gõ liên thanh, ngộ đạo tức thì ⚡',
    'Tích đủ công đức, ắt sẽ có... thêm công việc 😂',
    'Âm thanh mõ vang lên, lũ muỗi cũng phải đứng im 🕐',
];
let blessingIdx = Math.floor(Math.random() * BLESSINGS.length);

function rotateBlessings() {
    if (!blessingEl) return;
    blessingEl.style.opacity = '0';
    setTimeout(() => {
        blessingEl.textContent = BLESSINGS[blessingIdx % BLESSINGS.length];
        blessingIdx++;
        blessingEl.style.opacity = '0.75';
    }, 600);
}
rotateBlessings();
setInterval(rotateBlessings, 5000);

// Auto-hide hint after 4 seconds (blessing takes over)
setTimeout(() => { if (uiHint) uiHint.style.opacity = '0'; }, 4000);

// ── Mute Toggle ──
let isMuted = false;
const btnMute = document.getElementById('btn-mute');
btnMute?.addEventListener('click', () => {
    isMuted = !isMuted;
    btnMute.textContent = isMuted ? '🔇' : '🔊';
    hitSoundMo.volume = isMuted ? 0 : 1;
    hitSoundChuong.volume = isMuted ? 0 : 1;
});

// ══════════════════════════════════════════
//   PLUS ONE FX
// ══════════════════════════════════════════
function showPlusOne(x, y, earned, multiplier) {
    const plus = document.createElement('div');
    plus.className = 'plus';
    plus.innerText = multiplier > 1 ? `+${earned} ×${multiplier}` : `+1`;
    plus.style.left = (x - 20) + 'px';
    plus.style.top = (y - 30) + 'px';
    plus.style.fontSize = multiplier > 1 ? '48px' : '36px';
    plus.style.color = multiplier >= 10 ? '#FF4500' : multiplier >= 5 ? '#FF6B35' : '#D2691E';
    document.body.appendChild(plus);
    setTimeout(() => plus.remove(), 1000);
}

// Three.js Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xffffff, 0.025);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

// Responsive sizing
function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    if (w < h) {
        camera.position.set(0, 11, 20);
    } else {
        camera.position.set(0, 7, 14);
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0xaaccff, 0.4);
rimLight.position.set(-5, 5, -5);
scene.add(rimLight);

// Audio Setup
const hitSoundMo = new Audio('assets/sounds/mo.mp3');
const hitSoundChuong = new Audio('assets/sounds/chuong.mp3');

function playAudio(audio) {
    const act = audio.cloneNode();
    act.volume = 1.0;
    act.play().catch(e => console.log('Audio play protected'));
}

// Texture Loaders
const textureLoader = new THREE.TextureLoader();
const woodTex = textureLoader.load('assets/textures/wood.png');
woodTex.wrapS = THREE.RepeatWrapping; woodTex.wrapT = THREE.RepeatWrapping;
woodTex.repeat.set(2, 1);

const brassTex = textureLoader.load('assets/textures/brass.png');
brassTex.wrapS = THREE.RepeatWrapping; brassTex.wrapT = THREE.RepeatWrapping;
brassTex.repeat.set(2, 1);

const cushionTex = textureLoader.load('assets/textures/cushion.png');
cushionTex.wrapS = THREE.RepeatWrapping; cushionTex.wrapT = THREE.RepeatWrapping;
cushionTex.repeat.set(4, 1);

// Procedural smoke texture (radial gradient, no file needed)
function createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(180,180,180,0.85)');
    grad.addColorStop(0.3, 'rgba(160,160,160,0.4)');
    grad.addColorStop(0.7, 'rgba(140,140,140,0.1)');
    grad.addColorStop(1.0, 'rgba(120,120,120,0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}
const smokeTex = createSmokeTexture();

// Materials setup
const moMaterial = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: 0xddaa88, // light wood blend
    roughness: 0.8,
    metalness: 0.05
});

const chuongMaterial = new THREE.MeshStandardMaterial({
    map: brassTex,
    color: 0xFFDD55, // golden pop
    roughness: 0.3,
    metalness: 0.9,
    side: THREE.DoubleSide
});

const cushionRed = new THREE.MeshStandardMaterial({
    map: cushionTex,
    color: 0xcc2222, // blend red over the texture
    roughness: 0.95,
    metalness: 0.0
});

const cushionGold = new THREE.MeshStandardMaterial({
    color: 0xD4AF37, roughness: 0.7, metalness: 0.2
});

const brassDark = new THREE.MeshStandardMaterial({
    map: brassTex,
    color: 0x8B6508, roughness: 0.4, metalness: 0.8
});

const duiShaftMat = new THREE.MeshStandardMaterial({
    color: 0xEEDC82, roughness: 0.8, metalness: 0.05
});
const duiHeadMat = new THREE.MeshStandardMaterial({
    color: 0x181818, roughness: 0.95, metalness: 0.1
});


// Models
const moGroup = new THREE.Group();
const moMesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 32), moMaterial);
moMesh.scale.set(1.1, 0.7, 1);
moMesh.castShadow = true; moMesh.receiveShadow = true;
moGroup.add(moMesh);

const moSlit = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.8), new THREE.MeshBasicMaterial({ color: 0x4A2E1B }));
moSlit.position.set(0, -0.2, 0.6);
moGroup.add(moSlit);

const earMesh = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 16, 32, Math.PI), moMaterial);
earMesh.position.set(0, 0.8, -0.5);
earMesh.rotation.x = -Math.PI / 4;
moGroup.add(earMesh);

moGroup.position.set(-2.8, 0.3, 0);
moGroup.rotation.y = Math.PI / 6;
scene.add(moGroup);


const chuongGroup = new THREE.Group();
const chuongBody = new THREE.Mesh(new THREE.SphereGeometry(1.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2 + 0.1), chuongMaterial);
chuongBody.rotation.x = Math.PI;
chuongBody.position.y = 1.35;
chuongBody.castShadow = true; chuongBody.receiveShadow = true;
chuongGroup.add(chuongBody);

const chuongLip = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 16, 64), chuongMaterial);
chuongLip.rotation.x = Math.PI / 2;
chuongLip.position.y = 1.35;
chuongGroup.add(chuongLip);

chuongGroup.position.set(2.8, -0.2, 0);
chuongGroup.rotation.y = -Math.PI / 8;
scene.add(chuongGroup);


const puffGeo = new THREE.TorusGeometry(1.4, 0.7, 32, 64);
const rimGeo = new THREE.TorusGeometry(2.1, 0.1, 16, 64);
function makeCushion(xPos) {
    const group = new THREE.Group();
    const c = new THREE.Mesh(puffGeo, cushionRed);
    c.rotation.x = -Math.PI / 2;
    c.scale.set(1.15, 1.15, 0.6);
    const r = new THREE.Mesh(rimGeo, cushionGold);
    r.rotation.x = -Math.PI / 2;
    group.add(c); group.add(r);
    group.position.set(xPos, -0.6, 0);
    return group;
}
scene.add(makeCushion(-2.8));
scene.add(makeCushion(2.8)); // Wait, the right cushion is missing on standard browser load? Actually its added.


const incenseBowlGroup = new THREE.Group();
const bowlBase = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), brassDark);
bowlBase.rotation.x = Math.PI;
const bowlRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 16, 64), brassDark);
bowlRing.rotation.x = Math.PI / 2;
incenseBowlGroup.add(bowlBase); incenseBowlGroup.add(bowlRing);

for (let i = 0; i < 3; i++) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.25), brassDark);
    foot.position.set(Math.cos(i * Math.PI * 2 / 3) * 0.4, -0.6, Math.sin(i * Math.PI * 2 / 3) * 0.4);
    incenseBowlGroup.add(foot);
}
const ringDetail1 = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.05, 16, 64), brassDark);
ringDetail1.rotation.x = Math.PI / 2;
ringDetail1.position.y = -0.2;
incenseBowlGroup.add(ringDetail1);
incenseBowlGroup.position.set(0, -0.5, -5);
scene.add(incenseBowlGroup);

const nhangGroup = new THREE.Group();
const nhang = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5, 8), new THREE.MeshStandardMaterial({ color: 0x5C2018 }));
nhangGroup.add(nhang);
const tipMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff3300, emissiveIntensity: 1.0 });
const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), tipMat);
tip.position.y = 2.5;
nhangGroup.add(tip);

const incenseLight = new THREE.PointLight(0xff4400, 1.2, 6);
incenseLight.position.y = 2.5;
nhangGroup.add(incenseLight);

nhangGroup.position.set(0, 1.3, -5);
scene.add(nhangGroup);

// Smoke Particle System (Custom Shader for Realism)
const particleCount = 120;
const smokeGeo = new THREE.BufferGeometry();
const smokePos = new Float32Array(particleCount * 3);
const smokeAges = new Float32Array(particleCount);
for (let i = 0; i < particleCount; i++) {
    smokePos[i * 3] = nhangGroup.position.x;
    smokePos[i * 3 + 1] = nhangGroup.position.y + 2.5;
    smokePos[i * 3 + 2] = nhangGroup.position.z;
    smokeAges[i] = Math.random() * 8;
}
smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
smokeGeo.setAttribute('age', new THREE.BufferAttribute(smokeAges, 1));

const smokeMaterial = new THREE.ShaderMaterial({
    uniforms: {
        tex: { value: smokeTex }
    },
    vertexShader: `
        attribute float age;
        varying float vAge;
        void main() {
            vAge = age;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // Kích thước khói nở to dần theo tuổi (age)
            gl_PointSize = (400.0 / -mvPosition.z) * (1.0 + age * 0.4); 
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform sampler2D tex;
        varying float vAge;
        void main() {
            // Khói mờ dần khi bay lên cao
            float alpha = max(0.0, 1.0 - (vAge / 8.0));
            vec4 texColor = texture2D(tex, gl_PointCoord);
            gl_FragColor = vec4(texColor.rgb, texColor.a * alpha * 0.15);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
});
const smokeParticles = new THREE.Points(smokeGeo, smokeMaterial);
scene.add(smokeParticles);


// Stick (Dùi) setup
const duiGroup = new THREE.Group();
const duiShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.5, 32), duiShaftMat);
duiShaft.rotation.z = Math.PI / 2;
duiShaft.position.x = 0.5; // Offset stick so holding makes head center
duiShaft.castShadow = true;
duiGroup.add(duiShaft);

const duiHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), duiHeadMat);
duiHead.position.x = -1.5;
duiHead.castShadow = true;
duiGroup.add(duiHead);

// Adjusted closer layout and diagonal handle
const initialDuiPos = new THREE.Vector3(1.5, 2.0, 3.2); // Closer
const initialDuiRot = new THREE.Euler(0, -Math.PI / 8, -Math.PI / 5);
duiGroup.position.copy(initialDuiPos);
duiGroup.rotation.copy(initialDuiRot);
scene.add(duiGroup);


// Interaction Logic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const planeNormal = new THREE.Vector3(0, 0, 1);

let isDragging = false;
let pointerId = null;
const grabOffset = new THREE.Vector3();

let clickHitState = 0;
let clickHitProgress = 0;
let clickHitTarget = null;
let lastPointerDownTime = 0;

// ────────────── Spring Physics State ──────────────
// Each spring has: value, target, velocity
function makeSpring(initial) {
    return { val: initial, vel: 0, target: initial };
}
function tickSpring(s, stiffness, damping, dt) {
    const force = (s.target - s.val) * stiffness - s.vel * damping;
    s.vel += force * dt;
    s.val += s.vel * dt;
}

const moScaleSpring = { x: makeSpring(1), y: makeSpring(1) };
const chuongScaleSpring = { x: makeSpring(1), y: makeSpring(1) };
const moRotSpring = makeSpring(0);   // tilt on hit
const chuongRotSpring = makeSpring(0);

// Strike animation state
const STIFFNESS = 320, DAMPING = 18;

function updateScore(type, x, y) {
    // Nếu cả 2 bề đều bỏ bê (tức là user AFK quá lâu), reset cả 2 để khỏi bị deadlock trừ điểm cú gõ quay lại đầu tiên
    if (isChuongNeglected() && isMoNeglected()) {
        lastChuongHitTime = Date.now();
        lastMoHitTime = Date.now();
        if (blessingEl) blessingEl.style.color = '#A0522D';
    }

    // ── Combo Logic ──
    const now = Date.now();
    if (now - lastHitTime < 1500) {
        comboCount++;
    } else {
        comboCount = 1;
    }
    lastHitTime = now;
    const multiplier = getComboMultiplier(comboCount);
    const earned = multiplier;

    if (type === 'mo') {
        playAudio(hitSoundMo);
        if (isChuongNeglected()) {
            // Bỏ bê chuông quá lâu → mõ phản tác dụng!
            const penalty = Math.min(meritCount, 2);
            meritCount -= penalty;
            meritEl.textContent = meritCount.toLocaleString();
            // Show red floater instead
            const el = document.createElement('div');
            el.className = 'plus';
            el.innerText = `-${penalty} ⚠️`;
            el.style.left = (x - 28) + 'px';
            el.style.top  = (y - 30) + 'px';
            el.style.color = '#CC0000';
            el.style.fontSize = '36px';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
            // Flash the blessing red
            if (blessingEl) {
                blessingEl.style.color = '#CC0000';
                blessingEl.textContent = '🔔 Gõ chuông trước đi!!! Mõ không linh nếu thiếu chuông!';
            }
            triggerSync();
            return; // skip normal scoring
        }
        meritCount += earned;
        meritEl.textContent = meritCount.toLocaleString();
        // Reset mõ-neglect tracker
        lastMoHitTime = Date.now();
        scheduleMoWarn();
        if (blessingEl && moWarnShown) blessingEl.style.color = '#A0522D';
        moScaleSpring.x.val = 0.80; moScaleSpring.x.vel = 0;
        moScaleSpring.y.val = 1.25; moScaleSpring.y.vel = 0;
        moRotSpring.val = 0.18; moRotSpring.vel = 0;
    } else if (type === 'chuong') {
        playAudio(hitSoundChuong);
        if (isMoNeglected()) {
            // Spam chuông bỏ bê mõ → chuông cũng phản tác dụng!
            const penalty = Math.min(meritCount, 2);
            meritCount -= penalty;
            meritEl.textContent = meritCount.toLocaleString();
            const el = document.createElement('div');
            el.className = 'plus';
            el.innerText = `-${penalty} ⚠️`;
            el.style.left = (x - 28) + 'px';
            el.style.top  = (y - 30) + 'px';
            el.style.color = '#CC0000';
            el.style.fontSize = '36px';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
            if (blessingEl) {
                blessingEl.style.color = '#CC0000';
                blessingEl.textContent = '🥁 Gõ mõ đi bạn ơi! Chuông một mình không đủ!';
            }
            triggerSync();
            return;
        }
        // Reset bell-neglect tracker
        lastChuongHitTime = Date.now();
        scheduleChuongWarn();
        if (blessingEl && chuongWarnShown) blessingEl.style.color = '#A0522D';
        meritCount += earned;
        meritEl.textContent = meritCount.toLocaleString();
        chuongScaleSpring.x.val = 0.88; chuongScaleSpring.x.vel = 0;
        chuongScaleSpring.y.val = 1.20; chuongScaleSpring.y.vel = 0;
        chuongRotSpring.val = 0.14; chuongRotSpring.vel = 0;
    }

    showPlusOne(x, y, earned, multiplier);
    updateComboUI(comboCount);
    checkAchievements(meritCount);
    triggerShake(0.06 + multiplier * 0.025);
    spawnHitParticles(x, y, Math.min(multiplier + 2, 7));

    // Merit counter pop
    meritEl.classList.remove('merit-pop');
    void meritEl.offsetWidth;
    meritEl.classList.add('merit-pop');

    triggerSync();
}

function triggerSync() {
    if (Backend.currentUser) {
        document.getElementById('user-title').textContent = Backend.getTitle(meritCount);
    }
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        Backend.syncScore(meritCount);
    }, 2000);
}

// ── Share Button ──
document.getElementById('btn-share')?.addEventListener('click', () => {
    const title = Backend.getTitle(meritCount);
    const text = `🪷 Tôi đã tích được ${meritCount.toLocaleString()} công đức và đạt danh hiệu "${title}" trong Gõ Mõ Online 3D!\n✨ Thử xem bạn có vượt qua tôi không?\n`;
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: 'Gõ Mõ Online 3D 🪷', text, url }).catch(() => { });
    } else {
        navigator.clipboard?.writeText(text + url).then(() => {
            alert('Đã sao chép vào clipboard! Dán vào Zalo/FB mà khoe thôi nào 🙏');
        });
    }
});

// ── Donation Animation ──
window.triggerDonationAnimation = function () {
    const coinBurst = document.getElementById('coin-burst');
    const thanks = document.getElementById('donation-thanks');
    const box = document.getElementById('donation-box');
    const btn = document.getElementById('btn-thank-donor');

    // Trigger coin burst
    coinBurst.style.display = 'flex';
    coinBurst.querySelectorAll('.coin').forEach(c => {
        c.style.animation = 'none';
        void c.offsetWidth;
        c.style.animation = '';
    });

    // Shake box
    box.style.transform = 'scale(1.3) rotate(-8deg)';
    setTimeout(() => { box.style.transform = ''; }, 300);

    // Show thank you overlay
    setTimeout(() => {
        coinBurst.style.display = 'none';
        thanks.style.display = 'flex';
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
    }, 700);

    // Reset after 4.5s
    setTimeout(() => {
        thanks.style.display = 'none';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }, 4500);
};


window.addEventListener('pointerdown', (e) => {
    if (e.target.closest && (e.target.closest('#ui') || e.target.closest('#side-buttons') || e.target.closest('.modal'))) {
        return;
    }
    if (e.isPrimary === false) return;
    lastPointerDownTime = performance.now();

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (raycaster.intersectObject(moGroup, true).length > 0 && !isDragging) {
        if (uiHint) uiHint.style.opacity = '0';
        clickHitTarget = 'mo';
        clickHitState = 1;
        clickHitProgress = 0;
        updateScore('mo', e.clientX, e.clientY);
        return;
    }

    if (raycaster.intersectObject(chuongGroup, true).length > 0 && !isDragging) {
        if (uiHint) uiHint.style.opacity = '0';
        clickHitTarget = 'chuong';
        clickHitState = 1;
        clickHitProgress = 0;
        updateScore('chuong', e.clientX, e.clientY);
        return;
    }

    isDragging = true;
    pointerId = e.pointerId;
    document.body.style.cursor = 'grabbing';
    dragPlane.setFromNormalAndCoplanarPoint(planeNormal, duiGroup.position);
    raycaster.ray.intersectPlane(dragPlane, grabOffset);
    grabOffset.sub(duiGroup.position);
    if (uiHint) uiHint.style.opacity = '0';
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    if (clickHitState !== 0) { isDragging = false; return; }

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const target = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, target)) {
        const newX = target.x - grabOffset.x;
        const newY = target.y - grabOffset.y;
        duiGroup.rotation.y = initialDuiRot.y - (newX - initialDuiPos.x) * 0.1;
        duiGroup.rotation.z = initialDuiRot.z + (newY - initialDuiPos.y) * 0.05;
        duiGroup.position.x = newX;
        duiGroup.position.y = newY;
        checkCollisions(e.clientX, e.clientY);
    }
});

window.addEventListener('pointerup', (e) => {
    if (e.pointerId === pointerId) {
        isDragging = false;
        pointerId = null;
        document.body.style.cursor = 'pointer';
    }
});

const moBox = new THREE.Box3();
const chuongBox = new THREE.Box3();
let canDragHitMo = true;
let canDragHitChuong = true;

function checkCollisions(screenX, screenY) {
    duiHead.updateMatrixWorld();
    const headPos = new THREE.Vector3();
    headPos.setFromMatrixPosition(duiHead.matrixWorld);

    moBox.setFromObject(moGroup);
    chuongBox.setFromObject(chuongGroup);
    const moHitBox = moBox.clone().expandByScalar(0.7);
    const chuongHitBox = chuongBox.clone().expandByScalar(0.7);

    if (moHitBox.containsPoint(headPos) && canDragHitMo) {
        canDragHitMo = false;
        updateScore('mo', screenX, screenY);
        duiGroup.position.y += 0.5; duiGroup.position.x += 0.5;
        setTimeout(() => canDragHitMo = true, 200);
    }
    if (chuongHitBox.containsPoint(headPos) && canDragHitChuong) {
        canDragHitChuong = false;
        updateScore('chuong', screenX, screenY);
        duiGroup.position.y += 0.5; duiGroup.position.x += 0.5;
        setTimeout(() => canDragHitChuong = true, 200);
    }
}


// Animation Loop
const clock = new THREE.Clock();

// Smooth cubic easing for stick arc
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05); // cap delta to prevent spiral of death
    const time = clock.getElapsedTime();

    // ─── Stick Animation ───
    if (clickHitState === 1 || clickHitState === 2) {
        clickHitProgress += (clickHitState === 1 ? 22 : -14) * delta;
        if (clickHitProgress >= 1) { clickHitProgress = 1; clickHitState = 2; }
        else if (clickHitProgress <= 0) { clickHitProgress = 0; clickHitState = 0; }

        const isMo = clickHitTarget === 'mo';
        const targetPos = isMo
            ? new THREE.Vector3(-1.4, 1.8, 1.8)
            : new THREE.Vector3(4.0, 1.8, 1.8);
        const targetRot = new THREE.Euler(
            0,
            isMo ? -Math.PI / 4 : Math.PI / 12,
            Math.PI / 4
        );
        // Use easeInOutCubic for a natural arc swing
        const ep = easeInOutCubic(clickHitProgress);
        duiGroup.position.lerpVectors(initialDuiPos, targetPos, ep);
        duiGroup.rotation.x = initialDuiRot.x + (targetRot.x - initialDuiRot.x) * ep;
        duiGroup.rotation.y = initialDuiRot.y + (targetRot.y - initialDuiRot.y) * ep;
        duiGroup.rotation.z = initialDuiRot.z + (targetRot.z - initialDuiRot.z) * ep;

    } else if (!isDragging) {
        // Idle: smooth spring return + organic hover bob
        const lerpK = 1 - Math.exp(-8 * delta); // frame-rate independent lerp
        const baseY = 2.0 + Math.sin(time * 1.8) * 0.12;
        const baseX = 1.5 + Math.sin(time * 0.9) * 0.06;
        initialDuiPos.set(baseX, baseY, 3.2);

        duiGroup.position.lerp(initialDuiPos, lerpK);
        duiGroup.rotation.x += (initialDuiRot.x - duiGroup.rotation.x) * lerpK;
        duiGroup.rotation.y += (initialDuiRot.y - duiGroup.rotation.y) * lerpK;
        duiGroup.rotation.z += (initialDuiRot.z - duiGroup.rotation.z) * lerpK;
    } else {
        duiGroup.position.z += (3.5 - duiGroup.position.z) * 10 * delta;
    }

    // ─── Mõ Spring Physics ───
    moScaleSpring.x.target = 1; moScaleSpring.y.target = 1;
    tickSpring(moScaleSpring.x, STIFFNESS, DAMPING, delta);
    tickSpring(moScaleSpring.y, STIFFNESS, DAMPING, delta);
    moRotSpring.target = 0;
    tickSpring(moRotSpring, STIFFNESS * 0.7, DAMPING, delta);
    moGroup.scale.set(moScaleSpring.x.val, moScaleSpring.y.val, moScaleSpring.x.val);
    moGroup.rotation.z = moRotSpring.val;
    // Subtle idle sway
    moGroup.rotation.y = Math.PI / 6 + Math.sin(time * 0.7) * 0.02;
    moGroup.position.y = 0.3 + Math.sin(time * 1.3) * 0.04;

    // ─── Chuông Spring Physics ───
    chuongScaleSpring.x.target = 1; chuongScaleSpring.y.target = 1;
    tickSpring(chuongScaleSpring.x, STIFFNESS * 0.8, DAMPING, delta);
    tickSpring(chuongScaleSpring.y, STIFFNESS * 0.8, DAMPING, delta);
    chuongRotSpring.target = 0;
    tickSpring(chuongRotSpring, STIFFNESS * 0.6, DAMPING, delta);
    chuongGroup.scale.set(chuongScaleSpring.x.val, chuongScaleSpring.y.val, chuongScaleSpring.x.val);
    chuongGroup.rotation.z = -chuongRotSpring.val;
    // Subtle idle sway (slightly offset phase from mõ)
    chuongGroup.rotation.y = -Math.PI / 8 + Math.sin(time * 0.7 + 1.2) * 0.02;
    chuongGroup.position.y = -0.2 + Math.sin(time * 1.3 + 0.8) * 0.04;

    // ─── Incense ───
    tipMat.emissiveIntensity = 0.55 + Math.sin(time * 14.0 + Math.sin(time * 3.7)) * 0.45;
    incenseLight.intensity = 0.7 + Math.sin(time * 14.0 + Math.sin(time * 3.7)) * 0.35;

    // ─── Smoke ───
    const positions = smokeParticles.geometry.attributes.position.array;
    const ages = smokeParticles.geometry.attributes.age.array;
    for (let i = 0; i < particleCount; i++) {
        ages[i] += delta;
        if (ages[i] > 8.0) {
            ages[i] = 0.0;
            positions[i * 3] = nhangGroup.position.x + (Math.random() - 0.5) * 0.04;
            positions[i * 3 + 1] = nhangGroup.position.y + 2.5;
            positions[i * 3 + 2] = nhangGroup.position.z + (Math.random() - 0.5) * 0.04;
        } else {
            const ageNorm = ages[i] / 8.0;
            const sway = ageNorm * ageNorm * 1.2;
            positions[i * 3] += Math.sin(ages[i] * 3.0 + i * 1.3) * sway * delta + (Math.random() - 0.5) * 0.015 * delta;
            positions[i * 3 + 1] += (0.18 + ageNorm * 0.45) * delta;
            positions[i * 3 + 2] += Math.cos(ages[i] * 2.2 + i * 0.9) * sway * delta;
        }
    }
    smokeParticles.geometry.attributes.position.needsUpdate = true;
    smokeParticles.geometry.attributes.age.needsUpdate = true;

    // ─── Camera Shake ───
    if (shakeIntensity > 0.001) {
        camera.position.x += (Math.random() - 0.5) * shakeIntensity;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.75; // decay
        if (shakeIntensity < 0.001) shakeIntensity = 0;
    }

    renderer.render(scene, camera);
}

animate();


/* ==================== Backend UI Integration ==================== */
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const userInfoPanel = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userTitle = document.getElementById('user-title');

function updateAuthUI() {
    if (Backend.currentUser) {
        btnLogin.style.display = 'none';
        userInfoPanel.style.display = 'flex';
        userAvatar.src = Backend.currentUser.photoURL;
        userName.textContent = Backend.currentUser.displayName;
        userTitle.textContent = Backend.getTitle(meritCount);
    } else {
        btnLogin.style.display = 'block';
        userInfoPanel.style.display = 'none';
    }
}

btnLogin.onclick = () => Backend.login();
btnLogout.onclick = () => Backend.logout();

// Load local stored score immediately to prevent visual reset
const localStored = parseInt(localStorage.getItem('go_mo_offline_score') || 0);
if (localStored > meritCount) {
    meritCount = localStored;
    meritEl.textContent = meritCount.toLocaleString();
}

// Establish auth state callback
Backend.onAuthStateChanged(async (user) => {
    Backend.currentUser = user;
    updateAuthUI();
    if (user) {
        const storedScore = await Backend.getInitialScore();
        if (storedScore > meritCount) {
            meritCount = storedScore;
            meritEl.textContent = meritCount.toLocaleString(); // Fix missing toLocaleString
        }
        updateAuthUI(); // reload title with correct score
    }
});

// Trigger immediate save on tab close/reload
window.addEventListener('beforeunload', () => {
    localStorage.setItem('go_mo_offline_score', meritCount);
    if (Backend.currentUser && meritCount > 0) {
        Backend.syncScore(meritCount);
    }
});

// Modals Setup
document.getElementById('btn-leaderboard').onclick = async () => {
    document.getElementById('leaderboard-modal').style.display = 'block';
    const lbContainer = document.getElementById('leaderboard-list');
    lbContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#A0522D;">Đang tải phổ độ chúng sinh...</div>';

    const data = await Backend.getLeaderboard();
    lbContainer.innerHTML = '';

    if (data.length === 0) {
        lbContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#A0522D;">Bảng vàng hiện đang trống, xin mời quý vị gõ mõ.</div>';
    }

    data.forEach((user, idx) => {
        const item = document.createElement('div');
        item.className = 'lb-item';

        let rankMedal = (idx + 1) + ".";
        if (idx === 0) rankMedal = "🥇";
        if (idx === 1) rankMedal = "🥈";
        if (idx === 2) rankMedal = "🥉";
        else if (idx < 10) rankMedal = `0${idx + 1}.`;
        else rankMedal = `${idx + 1}.`;

        item.innerHTML = `
            <div class="lb-rank" style="${idx < 3 ? 'font-size:24px;' : 'font-size:16px; opacity:0.8'}">${rankMedal}</div>
            <img class="lb-avatar" src="${user.photoURL}" alt="avt" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=EEDC82&color=8B4513'">
            <div class="lb-info">
                <span class="lb-name">${user.displayName}</span>
                <span class="lb-title">${Backend.getTitle(user.merit)}</span>
            </div>
            <div class="lb-merit">${user.merit.toLocaleString()}</div>
        `;

        // Hightlight self
        if (Backend.currentUser && user.uid === Backend.currentUser.uid) {
            item.style.backgroundColor = '#fdf4dc';
            item.style.border = '1px solid #D4AF37';
        }
        lbContainer.appendChild(item);
    });

    if (data.length >= 10) {
        const extraInfo = document.createElement('div');
        extraInfo.style.textAlign = 'center';
        extraInfo.style.marginTop = '16px';
        extraInfo.style.marginBottom = '8px';
        extraInfo.style.padding = '12px';
        extraInfo.style.background = '#fdf4dc';
        extraInfo.style.borderRadius = '8px';
        extraInfo.style.fontSize = '12px';
        extraInfo.style.color = '#A0522D';
        extraInfo.style.fontStyle = 'italic';
        extraInfo.innerHTML = `... danh sách Top 101 - 1000+ đang bị mây mù che phủ ...<br>Hàng ngàn đạo hữu khác vẫn đang miệt mài tu tập 🔥`;
        lbContainer.appendChild(extraInfo);
    }
};

document.getElementById('btn-donate').onclick = () => {
    document.getElementById('donate-modal').style.display = 'block';
};

// Close modals when clicking the overlay outside
window.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        e.isPrimary = false;
    }
}, true);
