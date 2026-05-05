const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL.replace(/\/$/, '')
    : 'http://127.0.0.1:8787/api';

let currentUser = null;
const LOCAL_MODE_KEY = 'go_mo_local_mode';
const LOCAL_USERS_KEY = 'go_mo_local_users';

function fallbackAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Nguoi Moi')}&background=EEDC82&color=8B4513`;
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
        currentUser = null;
        this.currentUser = null;
        localStorage.removeItem('go_mo_user');
        this.onAuthStateChangedCallback && this.onAuthStateChangedCallback(null);
    },

    onAuthStateChanged: function (callback) {
        this.onAuthStateChangedCallback = callback;
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
            if (useLocalMode) {
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
            return useLocalMode ? await LocalBackend.leaderboard() : await api('/leaderboard');
        } catch (e) {
            enableLocalMode();
            return await LocalBackend.leaderboard();
        }
    },

    getInitialScore: async function () {
        if (!currentUser?.uid) return 0;
        try {
            const data = useLocalMode ? await LocalBackend.score(currentUser.uid) : await api(`/score/${currentUser.uid}`);
            return data.merit || 0;
        } catch (e) {
            enableLocalMode();
            const data = await LocalBackend.score(currentUser.uid);
            return data.merit || 0;
        }
    }
};
