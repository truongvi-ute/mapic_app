# Cài đặt Lottie Animation

Để sử dụng Lottie animation trong FloatingActionMenu, bạn cần cài đặt thư viện:

## Bước 1: Cài đặt package

```bash
cd frontend
npx expo install lottie-react-native
```

## Bước 2: Rebuild app

```bash
npx expo run:android
```

## Lưu ý:
- File animation đã được đặt tại: `frontend/src/assets/aminations/Menu icon Lottie JSON animation.json`
- Animation sẽ chạy khi nhấn vào nút menu (FAB button)
- Khi menu đóng, animation sẽ reset về trạng thái ban đầu

## Nếu gặp lỗi:
1. Xóa folder `node_modules` và `android/build`
2. Chạy lại: `npm install`
3. Rebuild: `npx expo run:android`
