# MAPIC Frontend

Ứng dụng mobile MAPIC - Mạng xã hội dựa trên vị trí.

## Công nghệ sử dụng

- React Native
- Expo SDK 54
- TypeScript
- Zustand (State Management)
- React Navigation
- Expo Image Picker
- Expo Location

## Yêu cầu

- Node.js 18+
- npm hoặc yarn
- Expo CLI
- Android Studio (cho Android development)
- Xcode (cho iOS development - chỉ trên macOS)

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Cấu hình API URL trong `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://your-backend-url:8080/api"
    }
  }
}
```

4. Chạy ứng dụng:

Development mode:
```bash
npx expo start
```

Android:
```bash
npx expo run:android
```

iOS (chỉ trên macOS):
```bash
npx expo run:ios
```

## Tính năng

### Đã hoàn thành
- ✅ Đăng ký tài khoản với xác thực OTP
- ✅ Đăng nhập
- ✅ Quên mật khẩu
- ✅ Đổi mật khẩu
- ✅ Chỉnh sửa profile
- ✅ Upload avatar và cover image
- ✅ Tạo khoảnh khắc (moment) với ảnh/video
- ✅ Chọn danh mục và quyền riêng tư
- ✅ Tự động lấy vị trí GPS

### Đang phát triển
- 🚧 Xem danh sách moments
- 🚧 Tương tác với moments (like, comment)
- 🚧 Tìm kiếm và khám phá
- 🚧 Bạn bè
- 🚧 Tin nhắn

## Cấu trúc thư mục

```
frontend/
├── src/
│   ├── api/                    # API services
│   ├── components/             # Reusable components
│   ├── context/                # React Context
│   ├── hooks/                  # Custom hooks
│   ├── modules/                # Native modules
│   ├── navigation/             # Navigation configuration
│   ├── screens/                # Screen components
│   ├── store/                  # Zustand stores
│   ├── utils/                  # Utility functions
│   └── App.tsx                 # Root component
├── android/                    # Android native code
├── ios/                        # iOS native code
├── app.json                    # Expo configuration
├── package.json
└── README.md
```

## Native Modules

### ImagePickerModule
Custom native module để chọn ảnh từ thư viện trên Android.

Location: `android/app/src/main/java/com/frontend/ImagePickerModule.java`

## Build Production

Android APK:
```bash
eas build --platform android --profile preview
```

Android AAB (Google Play):
```bash
eas build --platform android --profile production
```

iOS:
```bash
eas build --platform ios --profile production
```

## License

Private project
