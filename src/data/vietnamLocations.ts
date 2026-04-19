// Dữ liệu địa giới hành chính Việt Nam 3 cấp
import vietnamAddressData from './vietnam_address.json';

export interface Ward {
  code: string;
  name: string;
  nameWithType: string;
  path: string;
}

export interface District {
  code: string;
  name: string;
  nameWithType: string;
  wards: Ward[];
}

export interface Province {
  code: string;
  name: string;
  nameWithType: string;
  districts: District[];
}

// Convert JSON data to typed array
function convertVietnamAddressData(): Province[] {
  const provinces: Province[] = [];
  
  // Iterate through provinces
  Object.entries(vietnamAddressData).forEach(([provinceCode, provinceData]: [string, any]) => {
    const districts: District[] = [];
    
    // Iterate through districts
    if (provinceData['quan-huyen']) {
      Object.entries(provinceData['quan-huyen']).forEach(([districtCode, districtData]: [string, any]) => {
        const wards: Ward[] = [];
        
        // Iterate through wards
        if (districtData['xa-phuong']) {
          Object.entries(districtData['xa-phuong']).forEach(([wardCode, wardData]: [string, any]) => {
            wards.push({
              code: wardData.code,
              name: wardData.name,
              nameWithType: wardData.name_with_type,
              path: wardData.path,
            });
          });
        }
        
        districts.push({
          code: districtData.code,
          name: districtData.name,
          nameWithType: districtData.name_with_type,
          wards: wards,
        });
      });
    }
    
    provinces.push({
      code: provinceData.code,
      name: provinceData.name,
      nameWithType: provinceData.name_with_type,
      districts: districts,
    });
  });
  
  return provinces;
}

export const vietnamLocations: Province[] = convertVietnamAddressData();

// Helper functions
export const getProvinceByCode = (code: string): Province | undefined => {
  return vietnamLocations.find(p => p.code === code);
};

export const getDistrictByCode = (provinceCode: string, districtCode: string): District | undefined => {
  const province = getProvinceByCode(provinceCode);
  return province?.districts.find(d => d.code === districtCode);
};

export const getWardByCode = (provinceCode: string, districtCode: string, wardCode: string): Ward | undefined => {
  const district = getDistrictByCode(provinceCode, districtCode);
  return district?.wards.find(w => w.code === wardCode);
};

export const getFullAddress = (provinceCode: string, districtCode: string, wardCode: string): string => {
  const ward = getWardByCode(provinceCode, districtCode, wardCode);
  const district = getDistrictByCode(provinceCode, districtCode);
  const province = getProvinceByCode(provinceCode);
  
  if (ward && district && province) {
    return `${ward.nameWithType}, ${district.nameWithType}, ${province.nameWithType}`;
  }
  
  return '';
};
