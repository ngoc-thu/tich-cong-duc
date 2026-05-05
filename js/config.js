window.APP_CONFIG = {
  // Nếu chưa có Firebase config, web sẽ tự fallback sang local mode trên trình duyệt.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },
  // Chỉ dùng khi anh muốn bật backend local riêng thay cho Firebase.
  API_BASE_URL: 'http://127.0.0.1:8787/api'
};
