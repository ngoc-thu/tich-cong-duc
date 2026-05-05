const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL.replace(/\/$/, '')
    : 'http://127.0.0.1:8787/api';

let currentUser = null;

function fallbackAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Nguoi Moi')}&background=EEDC82&color=8B4513`;
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
            const user = await api('/login', {
                method: 'POST',
                body: JSON.stringify({
                    uid: saved?.uid || null,
                    displayName: displayName.trim(),
                    photoURL: saved?.photoURL || null
                })
            });
            currentUser = user;
            localStorage.setItem('go_mo_user', JSON.stringify(user));
            this.currentUser = user;
            this.onAuthStateChangedCallback && this.onAuthStateChangedCallback(user);
        } catch (e) {
            alert('Lỗi đăng nhập local: ' + e.message);
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
            api(`/users/${saved.uid}`)
                .then((user) => {
                    currentUser = {
                        ...user,
                        photoURL: user.photoURL || fallbackAvatar(user.displayName)
                    };
                    localStorage.setItem('go_mo_user', JSON.stringify(currentUser));
                    this.currentUser = currentUser;
                    callback(currentUser);
                })
                .catch(() => {
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
            await api('/score', {
                method: 'POST',
                body: JSON.stringify({ uid: currentUser.uid, merit: score })
            });
        } catch (e) {
            console.error('Lỗi đồng bộ local API:', e);
        }
    },

    getLeaderboard: async function () {
        try {
            return await api('/leaderboard');
        } catch (e) {
            console.error('Lỗi lấy bảng xếp hạng:', e);
            return [];
        }
    },

    getInitialScore: async function () {
        if (!currentUser?.uid) return 0;
        try {
            const data = await api(`/score/${currentUser.uid}`);
            return data.merit || 0;
        } catch (e) {
            return 0;
        }
    }
};
