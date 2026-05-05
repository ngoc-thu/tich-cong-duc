const APP_CONFIG = window.APP_CONFIG || {};
const FIREBASE_CONFIG = APP_CONFIG.firebase || {};
const API_BASE_URL = APP_CONFIG.API_BASE_URL
    ? APP_CONFIG.API_BASE_URL.replace(/\/$/, '')
    : 'http://127.0.0.1:8787/api';

let currentUser = null;
const LOCAL_MODE_KEY = 'go_mo_local_mode';
const LOCAL_USERS_KEY = 'go_mo_local_users';

function fallbackAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Nguoi Moi')}&background=EEDC82&color=8B4513`;
}

function hasFirebaseConfig() {
    return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId);
}

function shouldForceLocalMode() {
    try {
        const apiHost = new URL(API_BASE_URL).hostname;
        const pageHost = window.location.hostname;
        if ((apiHost === '127.0.0.1' || apiHost === 'localhost') && pageHost !== '127.0.0.1' && pageHost !== 'localhost') {
            return true;
        }
    } catch (_) {}
    return localStorage.getItem(LOCAL_MODE_KEY) === '1';
}

let useLocalMode = shouldForceLocalMode();
let useFirebaseMode = false;
let firebaseAuth = null;
let firebaseDb = null;

if (hasFirebaseConfig() && window.firebase) {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        useFirebaseMode = true;
        useLocalMode = false;
    } catch (e) {
        console.error('Firebase init failed:', e);
    }
}

function readLocalUsers() {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
}

function writeLocalUsers(users) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function enableLocalMode() {
    useLocalMode = true;
    localStorage.setItem(LOCAL_MODE_KEY, '1');
}

async function api(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'API error');
    }

    return res.json();
}

function makeLocalUser({ uid, displayName, photoURL, merit = 0, createdAt, updatedAt }) {
    const name = String(displayName || 'Người Mới').trim();
    return {
        uid,
        displayName: name,
        photoURL: photoURL || fallbackAvatar(name),
        merit: Number(merit || 0),
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: updatedAt || new Date().toISOString()
    };
}

const FirebaseBackend = {
    async login() {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            const result = await firebaseAuth.signInWithPopup(provider);
            return result.user;
        } catch (e) {
            if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
                await firebaseAuth.signInWithRedirect(provider);
                return null;
            }
            throw e;
        }
    },
    async logout() {
        await firebaseAuth.signOut();
    },
    onAuthStateChanged(callback) {
        return firebaseAuth.onAuthStateChanged(callback);
    },
    async ensureProfile(user) {
        if (!user) return null;
        const ref = firebaseDb.collection('users').doc(user.uid);
        const snap = await ref.get();
        const payload = {
            displayName: user.displayName || 'Người Mới',
            photoURL: user.photoURL || fallbackAvatar(user.displayName),
            email: user.email || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!snap.exists) {
            payload.merit = 0;
            payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        await ref.set(payload, { merge: true });
        const merged = (await ref.get()).data() || {};
        return {
            uid: user.uid,
            displayName: merged.displayName || user.displayName || 'Người Mới',
            photoURL: merged.photoURL || user.photoURL || fallbackAvatar(user.displayName),
            merit: Number(merged.merit || 0)
        };
    },
    async syncScore(uid, merit) {
        await firebaseDb.collection('users').doc(uid).set({
            merit: Math.floor(merit),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { ok: true, merit: Math.floor(merit) };
    },
    async getUser(uid) {
        const doc = await firebaseDb.collection('users').doc(uid).get();
        if (!doc.exists) throw new Error('Không tìm thấy user');
        const data = doc.data() || {};
        return {
            uid,
            displayName: data.displayName || 'Người Mới',
            photoURL: data.photoURL || fallbackAvatar(data.displayName),
            merit: Number(data.merit || 0)
        };
    },
    async leaderboard() {
        const snap = await firebaseDb.collection('users').orderBy('merit', 'desc').limit(100).get();
        const rows = [];
        snap.forEach((doc) => {
            const data = doc.data() || {};
            rows.push({
                uid: doc.id,
                displayName: data.displayName || 'Người Mới',
                photoURL: data.photoURL || fallbackAvatar(data.displayName),
                merit: Number(data.merit || 0)
            });
        });
        return rows;
    },
    async score(uid) {
        const user = await this.getUser(uid);
        return { merit: Number(user.merit || 0) };
    }
};

const LocalBackend = {
    login: async function (saved, displayName) {
        const users = readLocalUsers();
        const uid = saved?.uid || `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const existing = users[uid] || {};
        const user = makeLocalUser({
            uid,
            displayName,
            photoURL: saved?.photoURL || existing.photoURL,
            merit: existing.merit || 0,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        });
        users[uid] = user;
        writeLocalUsers(users);
        return user;
    },
    getUser: async function (uid) {
        const users = readLocalUsers();
        if (!users[uid]) throw new Error('Không tìm thấy user');
        return users[uid];
    },
    syncScore: async function (uid, merit) {
        const users = readLocalUsers();
        if (!users[uid]) return;
        users[uid].merit = Math.floor(merit);
        users[uid].updatedAt = new Date().toISOString();
        writeLocalUsers(users);
        return { ok: true, merit: users[uid].merit };
    },
    leaderboard: async function () {
        return Object.values(readLocalUsers())
            .sort((a, b) => Number(b.merit || 0) - Number(a.merit || 0))
            .slice(0, 100);
    },
    score: async function (uid) {
        const users = readLocalUsers();
        return { merit: Number(users[uid]?.merit || 0) };
    }
};

window.Backend = {
    currentUser: null,

    getTitle: function (score) {
        if (score >= 999999) return "Phật Tổ Hàng Real";
        if (score >= 500000) return "Thánh Nhân Vô Cực";
        if (score >= 200000) return "Pháp Sư Vạn Năng";
        if (score >= 99999) return "Tổ Tiên Còng Lưng Bắt Gánh";
        if (score >= 80000) return "Đại Hiệp Rách Chuột";
        if (score >= 50000) return "Bồ Tát Vỉa Hè";
        if (score >= 40000) return "Chiến Thần Mỏ Tụng";
        if (score >= 30000) return "Tu Sĩ Cơ Bắp";
        if (score >= 20000) return "Thần Tăng Bấm Chuột";
        if (score >= 15000) return "Hòa Thượng Thích Âm Thanh";
        if (score >= 10000) return "Đại Hiệp Diệt Nghiệp";
        if (score >= 8000) return "Nhà Sư Part-time";
        if (score >= 5000) return "Kiếp Sau Chắc Chắn Làm Giàu";
        if (score >= 3000) return "Chuyên Viên Gõ Mõ";
        if (score >= 2000) return "Đồng Tử Mỏi Tay";
        if (score >= 1000) return "Chúa Tể Chạy Deadline Gõ Mõ";
        if (score >= 500) return "Đại Thần Gõ Mõ";
        if (score >= 200) return "Tiểu Tăng Tập Sự";
        if (score >= 100) return "Phật Tử Khởi Nghiệp";
        if (score >= 50) return "Người Qua Đường Hảo Tâm";
        return "Tân Binh Xin Tích Đức";
    },

    login: async function () {
        if (useFirebaseMode) {
            try {
                const fbUser = await FirebaseBackend.login();
                if (!fbUser) return;
                const user = await FirebaseBackend.ensureProfile(fbUser);
                currentUser = user;
                localStorage.setItem('go_mo_user', JSON.stringify(user));
                this.currentUser = user;
                this.onAuthStateChangedCallback && this.onAuthStateChangedCallback(user);
                return;
            } catch (e) {
                alert('Lỗi đăng nhập Google: ' + e.message);
                return;
            }
        }

        const saved = JSON.parse(localStorage.getItem('go_mo_user') || 'null');
        const defaultName = saved?.displayName || '';
        const displayName = prompt('Nhập pháp danh của bạn:', defaultName);
        if (!displayName || !displayName.trim()) return;

        try {
            let user;
            if (useLocalMode) {
                user = await LocalBackend.login(saved, displayName.trim());
            } else {
                user = await api('/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        uid: saved?.uid || null,
                        displayName: displayName.trim(),
                        photoURL: saved?.photoURL || null
                    })
                });
            }
            currentUser = user;
            localStorage.setItem('go_mo_user', JSON.stringify(user));
            this.currentUser = user;
            this.onAuthStateChangedCallback && this.onAuthStateChangedCallback(user);
        } catch (e) {
            enableLocalMode();
            try {
                const user = await LocalBackend.login(saved, displayName.trim());
                currentUser = user;
                localStorage.setItem('go_mo_user', JSON.stringify(user));
                this.currentUser = user;
                this.onAuthStateChangedCallback && this.onAuthStateChangedCallback(user);
            } catch (localErr) {
                alert('Lỗi đăng nhập: ' + localErr.message);
            }
        }
    },

    logout: async function () {
        if (useFirebaseMode) {
            await FirebaseBackend.logout();
        }
        currentUser = null;
        this.currentUser = null;
        localStorage.removeItem('go_mo_user');
        this.onAuthStateChangedCallback && this.onAuthStateChangedCallback(null);
    },

    onAuthStateChanged: function (callback) {
        this.onAuthStateChangedCallback = callback;

        if (useFirebaseMode) {
            FirebaseBackend.onAuthStateChanged(async (user) => {
                if (!user) {
                    currentUser = null;
                    this.currentUser = null;
                    localStorage.removeItem('go_mo_user');
                    callback(null);
                    return;
                }
                const profile = await FirebaseBackend.ensureProfile(user);
                currentUser = profile;
                this.currentUser = profile;
                localStorage.setItem('go_mo_user', JSON.stringify(profile));
                callback(profile);
            });
            return;
        }

        const saved = JSON.parse(localStorage.getItem('go_mo_user') || 'null');
        if (saved?.uid) {
            const loader = useLocalMode ? LocalBackend.getUser(saved.uid) : api(`/users/${saved.uid}`);
            loader
                .then((user) => {
                    currentUser = {
                        ...user,
                        photoURL: user.photoURL || fallbackAvatar(user.displayName)
                    };
                    localStorage.setItem('go_mo_user', JSON.stringify(currentUser));
                    this.currentUser = currentUser;
                    callback(currentUser);
                })
                .catch(async () => {
                    if (!useLocalMode) {
                        enableLocalMode();
                        try {
                            const user = await LocalBackend.getUser(saved.uid);
                            currentUser = user;
                            this.currentUser = user;
                            callback(user);
                            return;
                        } catch (_) {}
                    }
                    localStorage.removeItem('go_mo_user');
                    currentUser = null;
                    this.currentUser = null;
                    callback(null);
                });
        } else {
            callback(null);
        }
    },

    syncScore: async function (score) {
        if (!currentUser?.uid) return;
        try {
            if (useFirebaseMode) {
                await FirebaseBackend.syncScore(currentUser.uid, score);
            } else if (useLocalMode) {
                await LocalBackend.syncScore(currentUser.uid, score);
            } else {
                await api('/score', {
                    method: 'POST',
                    body: JSON.stringify({ uid: currentUser.uid, merit: score })
                });
            }
        } catch (e) {
            enableLocalMode();
            await LocalBackend.syncScore(currentUser.uid, score);
        }
    },

    getLeaderboard: async function () {
        try {
            if (useFirebaseMode) return await FirebaseBackend.leaderboard();
            return useLocalMode ? await LocalBackend.leaderboard() : await api('/leaderboard');
        } catch (e) {
            enableLocalMode();
            return await LocalBackend.leaderboard();
        }
    },

    getInitialScore: async function () {
        if (!currentUser?.uid) return 0;
        try {
            const data = useFirebaseMode
                ? await FirebaseBackend.score(currentUser.uid)
                : useLocalMode
                    ? await LocalBackend.score(currentUser.uid)
                    : await api(`/score/${currentUser.uid}`);
            return data.merit || 0;
        } catch (e) {
            enableLocalMode();
            const data = await LocalBackend.score(currentUser.uid);
            return data.merit || 0;
        }
    }
};
