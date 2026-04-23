# MAPIC App - Deployment Guide

## Cấu hình Backend URL

App sử dụng environment variables để cấu hình backend URL.

### Local Development (Nhánh nanh)

File `app.json` đã cấu hình sẵn:
```json
"extra": {
  "apiUrl": "http://192.168.1.6:8080/api"
}
```

### Production Build

Khi build production, cần thay đổi URL trong `app.json`:

```json
"extra": {
  "apiUrl": "https://mapic-backend-ute.onrender.com/api"
}
```

## Các bước build Production

### 1. Cập nhật Backend URL

Sửa file `app.json`:
```bash
# Thay đổi từ:
"apiUrl": "http://192.168.1.6:8080/api"

# Thành:
"apiUrl": "https://mapic-backend-ute.onrender.com/api"
```

### 2. Build APK cho Android

```bash
# Build development
npx expo run:android

# Build production APK
eas build --platform android --profile production

# Hoặc build local
npx expo build:android
```

### 3. Build cho iOS

```bash
# Build development
npx expo run:ios

# Build production
eas build --platform ios --profile production
```

## Lưu ý quan trọng

1. **Nhánh nanh**: Luôn giữ URL local `http://192.168.1.6:8080/api`
2. **Nhánh main**: Sử dụng URL production `https://mapic-backend-ute.onrender.com/api`
3. **Sau khi build**: Nhớ đổi lại URL về local nếu cần dev tiếp

## Backend URL hiện tại

- **Local**: `http://192.168.1.6:8080/api`
- **Production**: `https://mapic-backend-ute.onrender.com/api`

## Kiểm tra kết nối

Sau khi thay đổi URL, kiểm tra trong app:
- Mở app và xem console log: `[API Config] Using API URL: ...`
- Test login để đảm bảo kết nối backend thành công
