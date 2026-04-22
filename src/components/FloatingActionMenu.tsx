import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import custom icons
const iconImages = {
  home: require('../assets/images/home.png'),
  compass: require('../assets/images/explore.png'),
  'add-circle': require('../assets/images/write.png'),
  people: require('../assets/images/friend.png'),
  notifications: require('../assets/images/notification.png'),
  person: require('../assets/images/profile.png'),
  message: require('../assets/images/message.png'),
};

// Ionicons-only icons (no local asset)
const ionicIconsOnly = [];

// Function to get icon source based on active state
const getIconSource = (iconKey: keyof typeof iconImages) => {
  return iconImages[iconKey];
};

const { height } = Dimensions.get('window');

interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
}

interface FloatingActionMenuProps {
  items: MenuItem[];
  activeItem?: string;
}

export default function FloatingActionMenu({ items, activeItem }: FloatingActionMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    if (isVisible) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const openMenu = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const handleItemPress = (item: MenuItem) => {
    closeMenu();
    setTimeout(() => {
      item.onPress();
    }, 300);
  };

  return (
    <>
      {/* Menu Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.menuContainer,
                  {
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                {/* Menu Items */}
                <View style={styles.menuItems}>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.menuItem,
                        activeItem === item.id && styles.menuItemActive,
                      ]}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemContent}>
                        <Text style={styles.menuItemLabel}>{item.label}</Text>
                        <View
                          style={[
                            styles.iconContainer,
                            activeItem === item.id && styles.iconContainerActive,
                          ]}
                        >
                          {ionicIconsOnly.includes(item.icon as string) ? (
                            <Ionicons
                              name={item.icon as any}
                              size={24}
                              color={activeItem === item.id ? '#007AFF' : '#8E8E93'}
                            />
                          ) : (
                            <Image
                              source={getIconSource(item.icon as keyof typeof iconImages)}
                              style={[
                                styles.iconImage,
                                activeItem === item.id && styles.iconImageActive,
                              ]}
                              resizeMode="contain"
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Floating Action Button - Always on top */}
      <TouchableOpacity
        style={styles.fab}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        {isVisible ? (
          <Ionicons name="close" size={28} color="#FFFFFF" />
        ) : (
          <Image
            source={require('../assets/images/menu.png')}
            style={styles.menuIcon}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  menuIcon: {
    width: 28,
    height: 28,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  menuItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 100, // Space for FAB
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemActive: {
    backgroundColor: '#F0F8FF',
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#E3F2FD',
  },
  iconImage: {
    width: 24,
    height: 24,
    opacity: 0.6,
  },
  iconImageActive: {
    opacity: 1,
  },
});
