# tich-cong-duc

Web gõ mõ 3D với frontend static và backend local lưu dữ liệu ngay trên máy chạy server.

## Truy cập web

- Website: https://tich-cong-duc.vercel.app
- Repo: https://github.com/ngoc-thu/tich-cong-duc

## Ủng hộ cúng dường

Nếu thấy web vui và muốn ủng hộ duy trì server, mọi người có thể quét mã QR bên dưới 🙏

![Mã QR ủng hộ cúng dường](assets/imgs/qr-code-momo.jpg)

## Cấu trúc

- `index.html`, `css/`, `js/`, `assets/`: frontend deploy lên Vercel
- `backend/`: API Node.js chạy trên máy riêng, lưu dữ liệu vào `backend/data/db.json`

## Chạy backend local

```bash
cd backend
npm install
npm start
```

Mặc định API chạy ở `http://127.0.0.1:8787/api`.

## Đổi URL backend cho frontend

Sửa `js/config.js`:

```js
window.APP_CONFIG = {
  API_BASE_URL: 'https://your-backend-domain/api'
};
```

## Lưu ý deploy

Nếu frontend nằm trên Vercel thì backend local **phải có HTTPS public URL** để trình duyệt truy cập được.
Chỉ mở port nội bộ hoặc HTTP thường sẽ không dùng được từ site Vercel vì mixed content / không truy cập được từ internet.
