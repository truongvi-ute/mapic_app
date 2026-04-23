# Hướng Dẫn Build APK cho MAPIC

## 📱 Chuẩn Bị Icon

### 1. Lưu icon vào đúng vị trí:
- **Icon chính**: `src/assets/images/icon.png` (1024x1024px)
- **Foreground**: `src/assets/images/icon-app.png` (512x512px, nền trong suốt)
- **Background**: `src/assets/images/android-icon-background.png` (512x512px)
- **Monochrome**: `src/assets/images/android-icon-monochrome.png` (512x512px, đen trắng)

### 2. Tạo icon từ hình bạn gửi:
```bash
# Resize icon thành các kích thước cần thiết
# Sử dụng Photoshop, GIMP, hoặc online tool như:
# - https://icon.kitchen/
# - https://romannurik.github.io/AndroidAssetStudio/
```

---

## 🔧 Cài Đặt EAS CLI

```bash
# Cài đặt EAS CLI globally
npm install -g @expo/eas-cli

# Đăng nhập Expo account (tạo account tại expo.dev nếu chưa có)
eas login
```

---

## 🏗️ Build APK

### Phương pháp 1: EAS Build (Khuyến nghị)

```bash
# Di chuyển vào thư mục project
cd mapic_app

# Cấu hình EAS (chỉ cần làm 1 lần)
eas build:configure

# Build APK cho Android
eas build --platform android --profile preview

# Hoặc build production
eas build --platform android --profile production
```

### Phương pháp 2: Local Build

```bash
# Cài đặt Android Studio và Android SDK trước
# Sau đó:

cd mapic_app

# Build local
npx expo run:android --variant release

# Hoặc sử dụng Expo CLI cũ
expo build:android -t apk
```

---

## ⚙️ Cấu Hình Build Profile

Tạo file `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 📦 Tên File APK

Với cấu hình hiện tại, APK sẽ có tên:
- **Package name**: `com.mapic.app`
- **App name**: `MAPIC`
- **File APK**: `MAPIC-v1.0.0.apk` (hoặc tương tự)

### Để tùy chỉnh tên file APK:

Thêm vào `app.json`:
```json
"android": {
  "package": "com.mapic.app",
  "versionCode": 1,
  "buildNumber": "1.0.0"
}
```

---

## 🎨 Icon Requirements

### Kích thước icon cần thiết:

1. **icon.png**: 1024x1024px (icon chính)
2. **icon-app.png**: 512x512px (foreground, nền trong suốt)
3. **android-icon-background.png**: 512x512px (background màu)
4. **android-icon-monochrome.png**: 512x512px (đen trắng cho Android 13+)

### Từ hình bạn gửi, cần tạo:

1. **Foreground**: Chỉ phần bản đồ Việt Nam + chữ MAPIC (nền trong suốt)
2. **Background**: Màu nền xanh đậm (#2C3E50)
3. **Monochrome**: Version đen trắng của logo

---

## 🚀 Các Bước Build

### 1. Chuẩn bị icon
```bash
# Copy icon vào đúng thư mục
cp your-icon-1024.png src/assets/images/icon.png
cp your-foreground-512.png src/assets/images/icon-app.png
# ... các icon khác
```

### 2. Test local trước
```bash
cd mapic_app
npm install
npx expo start
# Test trên emulator/device
```

### 3. Build APK
```bash
# Sử dụng EAS (khuyến nghị)
eas build --platform android --profile preview

# Hoặc local build
npx expo run:android --variant release
```

### 4. Download APK
- EAS build: Vào https://expo.dev/accounts/[username]/projects/mapic/builds
- Local build: Tìm trong `android/app/build/outputs/apk/release/`

---

## 📱 Test APK

1. **Install trên device**:
   ```bash
   adb install app-release.apk
   ```

2. **Test các tính năng**:
   - Login/Register
   - Camera/Gallery
   - Location
   - Push notifications
   - Chat realtime

---

## 🔍 Troubleshooting

### Lỗi thường gặp:

1. **Icon không hiển thị**: Kiểm tra đường dẫn và kích thước
2. **Build failed**: Kiểm tra dependencies và Android SDK
3. **APK quá lớn**: Optimize images và remove unused dependencies

### Commands hữu ích:

```bash
# Clear cache
npx expo start -c

# Check bundle size
npx expo export --dump-assetmap

# Analyze bundle
npx @expo/bundle-analyzer
```

---

## 📋 Checklist

- [ ] Icon đã được chuẩn bị đúng kích thước
- [ ] `app.json` đã được cấu hình
- [ ] EAS CLI đã được cài đặt
- [ ] Expo account đã được tạo
- [ ] Build profile đã được setup
- [ ] APK đã được test trên device

---

**Lưu ý**: Với icon đẹp như bạn gửi, APK sẽ trông rất professional! 🎉