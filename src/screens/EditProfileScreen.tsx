import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import userService, { UpdateProfileData } from '../api/userService';

type GenderType = 'MALE' | 'FEMALE' | 'OTHER' | null;

interface DropdownOption {
  label: string;
  value: number;
}

interface EditProfileScreenProps {
  onBack: () => void;
  onSaveSuccess: () => void;
}

export default function EditProfileScreen({ onBack, onSaveSuccess }: EditProfileScreenProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<GenderType>(null);
  const [phone, setPhone] = useState('');
  
  // Date components
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Dropdown states
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Generate dropdown options
  const generateDays = (month: number | null, year: number | null): DropdownOption[] => {
    if (!month || !year) {
      return Array.from({ length: 31 }, (_, i) => ({
        label: (i + 1).toString(),
        value: i + 1,
      }));
    }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: (i + 1).toString(),
      value: i + 1,
    }));
  };

  const generateMonths = (): DropdownOption[] => {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return months.map((month, index) => ({
      label: month,
      value: index + 1,
    }));
  };

  const generateYears = (): DropdownOption[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1900; year--) {
      years.push({
        label: year.toString(),
        value: year,
      });
    }
    return years;
  };

  const days = generateDays(selectedMonth, selectedYear);
  const months = generateMonths();
  const years = generateYears();

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setGender(user.gender || null);
      setPhone(user.phone || '');
      
      if (user.dateOfBirth) {
        const date = new Date(user.dateOfBirth);
        setSelectedDay(date.getDate());
        setSelectedMonth(date.getMonth() + 1);
        setSelectedYear(date.getFullYear());
      }
    }
  }, [user]);

  // Validate and adjust day when month/year changes
  useEffect(() => {
    if (selectedDay && selectedMonth && selectedYear) {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      if (selectedDay > daysInMonth) {
        setSelectedDay(daysInMonth);
      }
    }
  }, [selectedMonth, selectedYear]);

  const formatDateDisplay = () => {
    if (!selectedDay || !selectedMonth || !selectedYear) {
      return 'Chọn ngày sinh';
    }
    return `${selectedDay}/${selectedMonth}/${selectedYear}`;
  };

  const renderDropdown = (
    visible: boolean,
    onClose: () => void,
    options: DropdownOption[],
    selectedValue: number | null,
    onSelect: (value: number) => void,
    title: string
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedValue === item.value && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedValue === item.value && styles.dropdownItemTextSelected
                ]}>
                  {item.label}
                </Text>
                {selectedValue === item.value && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            style={styles.dropdownList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Lỗi', 'Tên không được để trống');
      return;
    }

    setLoading(true);
    try {
      let dateOfBirth = null;
      if (selectedDay && selectedMonth && selectedYear) {
        const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
        dateOfBirth = date.toISOString().split('T')[0];
      }

      const profileData: UpdateProfileData = {
        name: name.trim(),
        bio: bio.trim() || undefined,
        gender: gender,
        dateOfBirth: dateOfBirth,
        phone: phone.trim() || undefined,
        location: null,
      };

      const updatedProfile = await userService.updateProfile(profileData);
      
      if (user) {
        const updatedUser = {
          ...user,
          name: updatedProfile.name,
          bio: updatedProfile.bio,
          gender: updatedProfile.gender,
          dateOfBirth: updatedProfile.dateOfBirth,
          phone: updatedProfile.phone,
        };
        
        setUser(updatedUser);
      }
      
      showAlert('Thành công', 'Cập nhật thông tin thành công!', [
        {
          text: 'OK',
          onPress: () => {
            onSaveSuccess();
            onBack();
          },
        },
      ]);
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa thông tin</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Tên hiển thị <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên của bạn"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>Tên này sẽ hiển thị trên trang cá nhân của bạn</Text>
        </View>

        {/* Phone Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Số điện thoại</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={20} color="#666" />
            <TextInput
              style={styles.inputWithIconText}
              value={phone}
              onChangeText={setPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Bio Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Tiểu sử</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Viết gì đó về bạn..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

        {/* Gender Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Giới tính</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'MALE' && styles.genderButtonActive]}
              onPress={() => setGender('MALE')}
            >
              <Ionicons 
                name="male" 
                size={20} 
                color={gender === 'MALE' ? '#fff' : '#007AFF'} 
              />
              <Text style={[styles.genderText, gender === 'MALE' && styles.genderTextActive]}>
                Nam
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.genderButton, gender === 'FEMALE' && styles.genderButtonActive]}
              onPress={() => setGender('FEMALE')}
            >
              <Ionicons 
                name="female" 
                size={20} 
                color={gender === 'FEMALE' ? '#fff' : '#e91e63'} 
              />
              <Text style={[styles.genderText, gender === 'FEMALE' && styles.genderTextActive]}>
                Nữ
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.genderButton, gender === 'OTHER' && styles.genderButtonActive]}
              onPress={() => setGender('OTHER')}
            >
              <Ionicons 
                name="transgender" 
                size={20} 
                color={gender === 'OTHER' ? '#fff' : '#9c27b0'} 
              />
              <Text style={[styles.genderText, gender === 'OTHER' && styles.genderTextActive]}>
                Khác
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date of Birth Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Ngày sinh</Text>
          
          {/* Date Display */}
          <View style={styles.dateDisplayContainer}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.dateDisplayText}>{formatDateDisplay()}</Text>
          </View>
          
          {/* Date Dropdowns */}
          <View style={styles.dateDropdownsContainer}>
            {/* Day Dropdown */}
            <TouchableOpacity
              style={[styles.dateDropdown, { flex: 1 }]}
              onPress={() => setShowDayDropdown(true)}
            >
              <Text style={styles.dateDropdownText}>
                {selectedDay ? selectedDay.toString() : 'Ngày'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#999" />
            </TouchableOpacity>
            
            {/* Month Dropdown */}
            <TouchableOpacity
              style={[styles.dateDropdown, { flex: 2 }]}
              onPress={() => setShowMonthDropdown(true)}
            >
              <Text style={styles.dateDropdownText}>
                {selectedMonth ? `Tháng ${selectedMonth}` : 'Tháng'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#999" />
            </TouchableOpacity>
            
            {/* Year Dropdown */}
            <TouchableOpacity
              style={[styles.dateDropdown, { flex: 1.2 }]}
              onPress={() => setShowYearDropdown(true)}
            >
              <Text style={styles.dateDropdownText}>
                {selectedYear ? selectedYear.toString() : 'Năm'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropdown Modals */}
        {renderDropdown(
          showDayDropdown,
          () => setShowDayDropdown(false),
          days,
          selectedDay,
          setSelectedDay,
          'Chọn ngày'
        )}
        
        {renderDropdown(
          showMonthDropdown,
          () => setShowMonthDropdown(false),
          months,
          selectedMonth,
          setSelectedMonth,
          'Chọn tháng'
        )}
        
        {renderDropdown(
          showYearDropdown,
          () => setShowYearDropdown(false),
          years,
          selectedYear,
          setSelectedYear,
          'Chọn năm'
        )}

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Thông tin của bạn sẽ được hiển thị công khai trên trang cá nhân.
          </Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#f44336',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  genderButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  genderTextActive: {
    color: '#fff',
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
    marginBottom: 12,
  },
  dateDisplayText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dateDropdownsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateDropdownText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  inputWithIconText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    lineHeight: 18,
  },
  spacer: {
    height: 32,
  },
});

