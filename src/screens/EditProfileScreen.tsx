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
import { SPACING, COLORS, LIGHT_COLORS, DARK_COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SHADOWS, DIMENSIONS } from '../constants/design';
import { useThemeStore } from '../store/useThemeStore';
import SafeContainer from '../components/ui/SafeContainer';
import Spacer from '../components/ui/Spacer';
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
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
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
    <SafeContainer style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={DIMENSIONS.iconLG} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa thông tin</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Ionicons name="checkmark" size={DIMENSIONS.iconLG} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Name Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Tên hiển thị <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên của bạn"
            placeholderTextColor={C.textTertiary}
          />
          <Text style={[styles.hint, { color: C.textTertiary }]}>Tên này sẽ hiển thị trên trang cá nhân của bạn</Text>
        </View>

        {/* Phone Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Số điện thoại</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="call-outline" size={DIMENSIONS.iconSM} color={C.textTertiary} />
            <TextInput
              style={[styles.inputWithIconText, { color: C.textPrimary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Nhập số điện thoại"
              placeholderTextColor={C.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Bio Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Tiểu sử</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Viết gì đó về bạn..."
            placeholderTextColor={C.textTertiary}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: C.textTertiary }]}>{bio.length}/500</Text>
        </View>

        {/* Gender Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Giới tính</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, { backgroundColor: C.surface, borderColor: C.border }, gender === 'MALE' && styles.genderButtonActive]}
              onPress={() => setGender('MALE')}
            >
              <Ionicons name="male" size={DIMENSIONS.iconSM} color={gender === 'MALE' ? COLORS.white : COLORS.primary} />
              <Text style={[styles.genderText, { color: C.textSecondary }, gender === 'MALE' && styles.genderTextActive]}>Nam</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.genderButton, { backgroundColor: C.surface, borderColor: C.border }, gender === 'FEMALE' && styles.genderButtonActive]}
              onPress={() => setGender('FEMALE')}
            >
              <Ionicons name="female" size={DIMENSIONS.iconSM} color={gender === 'FEMALE' ? COLORS.white : COLORS.error} />
              <Text style={[styles.genderText, { color: C.textSecondary }, gender === 'FEMALE' && styles.genderTextActive]}>Nữ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.genderButton, { backgroundColor: C.surface, borderColor: C.border }, gender === 'OTHER' && styles.genderButtonActive]}
              onPress={() => setGender('OTHER')}
            >
              <Ionicons name="transgender" size={DIMENSIONS.iconSM} color={gender === 'OTHER' ? COLORS.white : COLORS.info} />
              <Text style={[styles.genderText, { color: C.textSecondary }, gender === 'OTHER' && styles.genderTextActive]}>Khác</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date of Birth Field */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Ngày sinh</Text>
          
          {/* Date Display */}
          <View style={[styles.dateDisplayContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="calendar-outline" size={DIMENSIONS.iconSM} color={C.textTertiary} />
            <Text style={[styles.dateDisplayText, { color: C.textSecondary }]}>{formatDateDisplay()}</Text>
          </View>
          
          {/* Date Dropdowns */}
          <View style={styles.dateDropdownsContainer}>
            <TouchableOpacity
              style={[styles.dateDropdown, { flex: 1, backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setShowDayDropdown(true)}
            >
              <Text style={[styles.dateDropdownText, { color: C.textPrimary }]}>
                {selectedDay ? selectedDay.toString() : 'Ngày'}
              </Text>
              <Ionicons name="chevron-down" size={DIMENSIONS.iconXS} color={C.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateDropdown, { flex: 2, backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setShowMonthDropdown(true)}
            >
              <Text style={[styles.dateDropdownText, { color: C.textPrimary }]}>
                {selectedMonth ? `Tháng ${selectedMonth}` : 'Tháng'}
              </Text>
              <Ionicons name="chevron-down" size={DIMENSIONS.iconXS} color={C.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dateDropdown, { flex: 1.2, backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setShowYearDropdown(true)}
            >
              <Text style={[styles.dateDropdownText, { color: C.textPrimary }]}>
                {selectedYear ? selectedYear.toString() : 'Năm'}
              </Text>
              <Ionicons name="chevron-down" size={DIMENSIONS.iconXS} color={C.textTertiary} />
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
        <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(67,97,238,0.12)' : '#EEF2FF', borderColor: isDark ? 'rgba(67,97,238,0.3)' : '#C7D2FE' }]}>
          <Ionicons name="information-circle-outline" size={DIMENSIONS.iconSM} color={C.primary} />
          <Text style={[styles.infoText, { color: C.textSecondary }]}>
            Thông tin của bạn sẽ được hiển thị công khai trên trang cá nhân.
          </Text>
        </View>

        <Spacer size="xxxl" />
      </ScrollView>
    </SafeContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
  },
  saveButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.xxl,
  },
  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray800,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray800,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
  },
  charCount: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.gray500,
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    gap: SPACING.sm,
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray800,
  },
  genderTextActive: {
    color: COLORS.white,
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  dateDisplayText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray800,
    fontWeight: FONT_WEIGHT.medium,
  },
  dateDropdownsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dateDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  dateDropdownText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.gray800,
    fontWeight: FONT_WEIGHT.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  dropdownTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.gray800,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  dropdownItemSelected: {
    backgroundColor: COLORS.gray50,
  },
  dropdownItemText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray800,
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: SPACING.md,
  },
  inputWithIconText: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.lg,
    color: COLORS.gray800,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    lineHeight: FONT_SIZE.sm * 1.4,
  },
});

