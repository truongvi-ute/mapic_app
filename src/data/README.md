# Dữ liệu địa giới hành chính Việt Nam

## File: vietnam_address.json

Dữ liệu đầy đủ 63 tỉnh/thành phố, quận/huyện, phường/xã của Việt Nam.

### Cấu trúc dữ liệu:

```json
{
  "01": {
    "name": "Hà Nội",
    "slug": "ha-noi",
    "type": "thanh-pho",
    "name_with_type": "Thành phố Hà Nội",
    "code": "01",
    "quan-huyen": {
      "001": {
        "name": "Ba Đình",
        "type": "quan",
        "name_with_type": "Quận Ba Đình",
        "code": "001",
        "xa-phuong": {
          "00001": {
            "name": "Phúc Xá",
            "type": "phuong",
            "name_with_type": "Phường Phúc Xá",
            "code": "00001"
          }
        }
      }
    }
  }
}
```

### Thống kê:

- **63 tỉnh/thành phố**
- **Hàng trăm quận/huyện**
- **Hàng nghìn phường/xã**

## File: vietnamLocations.ts

Module TypeScript để load và sử dụng dữ liệu địa giới.

### Sử dụng:

```typescript
import { vietnamLocations, getFullAddress } from './vietnamLocations';

// Lấy tất cả tỉnh/thành phố
console.log(vietnamLocations);

// Lấy địa chỉ đầy đủ
const address = getFullAddress('01', '001', '00001');
// => "Phường Phúc Xá, Quận Ba Đình, Thành phố Hà Nội"
```

### Interfaces:

```typescript
interface Province {
  code: string;
  name: string;
  nameWithType: string;
  districts: District[];
}

interface District {
  code: string;
  name: string;
  nameWithType: string;
  wards: Ward[];
}

interface Ward {
  code: string;
  name: string;
  nameWithType: string;
  path: string;
}
```

### Helper functions:

- `getProvinceByCode(code: string)`: Lấy tỉnh/thành phố theo mã
- `getDistrictByCode(provinceCode, districtCode)`: Lấy quận/huyện theo mã
- `getWardByCode(provinceCode, districtCode, wardCode)`: Lấy phường/xã theo mã
- `getFullAddress(provinceCode, districtCode, wardCode)`: Lấy địa chỉ đầy đủ

## Nguồn dữ liệu:

Dữ liệu từ Tổng cục Thống kê Việt Nam (GSO) - Danh mục hành chính Việt Nam.

## Cập nhật:

Để cập nhật dữ liệu mới nhất, tải về từ:
- https://danhmuchanhchinh.gso.gov.vn/
- https://github.com/daohoangson/dvhcvn
