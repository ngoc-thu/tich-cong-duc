window.APP_CONFIG = {
  // Nếu chưa có Firebase config, web sẽ tự fallback sang local mode trên trình duyệt.
  firebase: {
    apiKey: 'AIzaSyDEzWRVhJtwJg7C2uO062efaTtiZrGJLv8',
    authDomain: 'tich-cong-duc.firebaseapp.com',
    projectId: 'tich-cong-duc',
    storageBucket: 'tich-cong-duc.firebasestorage.app',
    messagingSenderId: '437674882753',
    appId: '1:437674882753:web:906605ddbcc9954f868640',
    measurementId: 'G-E2C086703J'
  },
  // Chỉ dùng khi anh muốn bật backend local riêng thay cho Firebase.
  API_BASE_URL: 'http://127.0.0.1:8787/api'
};
