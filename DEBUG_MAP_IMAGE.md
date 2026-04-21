# Debug Map Image Loading

## Vấn đề
Khi mở bản đồ, ảnh không hiển thị trên marker.

## Nguyên nhân có thể
1. `item.media` không được load từ API (rỗng hoặc undefined)
2. `mediaUrl` không đúng format
3. `buildMomentImageUrl()` không build đúng URL

## Cách kiểm tra

### Bước 1: Kiểm tra console logs
Khi bấm nút map, xem console logs:

```
[HomeScreen] Opening map with: {
  location: {...},
  provinceName: "...",
  firstImage: "...",  // <-- Kiểm tra giá trị này
  mediaCount: 1       // <-- Phải > 0
}

[MomentMapScreen] Props: {
  imageUrl: "..."     // <-- Phải có giá trị
}

[MomentMapScreen] Full image URL: "http://..."  // <-- Phải là URL đầy đủ
```

### Bước 2: Kiểm tra API response
Xem API `/api/moments/feed` có trả về `media` không:

```json
{
  "data": {
    "content": [
      {
        "id": 1,
        "media": [              // <-- Phải có array này
          {
            "id": 1,
            "mediaUrl": "xxx.jpg",
            "mediaType": "IMAGE"
          }
        ]
      }
    ]
  }
}
```

### Bước 3: Nếu media rỗng
Backend có thể không load media. Kiểm tra:
- `MomentRepository.findFeedMoments()` có JOIN FETCH media không?
- `MomentResponse.fromEntity()` có map media không?

## Giải pháp

### Nếu mediaCount = 0:
Backend không load media. Cần thêm:
```java
@Query("SELECT DISTINCT m FROM Moment m " +
       "LEFT JOIN FETCH m.media " +  // <-- Thêm dòng này
       "WHERE ...")
```

### Nếu imageUrl = undefined:
Moment không có media. Đây là bình thường, map sẽ hiện marker đơn giản.

### Nếu Full image URL sai:
Kiểm tra `buildMomentImageUrl()` trong `frontend/src/config/api.ts`
