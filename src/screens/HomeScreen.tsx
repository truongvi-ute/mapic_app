import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/useAuthStore';
import { useAlert } from '../context/AlertContext';
import MomentCard, { Moment } from '../components/MomentCard';

interface PageInfo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const { showAlert } = useAlert();
  
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.26:8080/api';
  const baseUrl = API_URL.replace('/api', '');

  useEffect(() => {
    loadFeed(0, false);
  }, []);

  const loadFeed = async (page: number, append: boolean = false) => {
    if (append && loadingMore) return;
    if (!append && loading) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      console.log(`[HomeScreen] Loading feed page ${page}`);

      const response = await fetch(`${API_URL}/moments/feed?page=${page}&size=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data;
        
        console.log(`[HomeScreen] Loaded ${data.content.length} moments (page ${page})`);
        
        setPageInfo({
          pageNumber: data.pageNumber,
          pageSize: data.pageSize,
          totalElements: data.totalElements,
          totalPages: data.totalPages,
          first: data.first,
          last: data.last,
          hasNext: data.hasNext,
          hasPrevious: data.hasPrevious,
        });

        if (append) {
          setMoments(prev => [...prev, ...data.content]);
        } else {
          setMoments(data.content);
        }
        
        setCurrentPage(page);
      } else {
        console.error('[HomeScreen] Failed to load feed:', response.status);
        showAlert('Lỗi', 'Không thể tải dữ liệu');
      }
    } catch (error) {
      console.error('[HomeScreen] Error loading feed:', error);
      showAlert('Lỗi', 'Không thể kết nối đến server');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(0, false);
  }, []);

  const onEndReached = useCallback(() => {
    if (pageInfo && pageInfo.hasNext && !loadingMore) {
      console.log('[HomeScreen] Loading next page:', currentPage + 1);
      loadFeed(currentPage + 1, true);
    }
  }, [pageInfo, loadingMore, currentPage]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Đang tải thêm...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📷</Text>
        <Text style={styles.emptyTitle}>Chưa có khoảnh khắc nào</Text>
        <Text style={styles.emptyText}>
          Hãy bắt đầu chia sẻ những khoảnh khắc đẹp của bạn!
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>MAPIC</Text>
      <Text style={styles.subtitle}>Khám phá khoảnh khắc</Text>
    </View>
  );

  if (loading && moments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={moments}
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            baseUrl={baseUrl}
            onPressProfile={() => console.log('View profile:', item.author.id)}
            onPressMap={() => console.log('View map:', item.id)}
            onPressLike={() => console.log('Like moment:', item.id)}
            onPressComment={() => console.log('Comment on moment:', item.id)}
            onPressShare={() => console.log('Share moment:', item.id)}
            onPressMenu={() => {
              showAlert(
                'Tùy chọn',
                'Chọn hành động',
                [
                  { text: 'Lưu', onPress: () => console.log('Save moment:', item.id) },
                  { text: 'Báo cáo', onPress: () => console.log('Report moment:', item.id), style: 'destructive' },
                  { text: 'Hủy', style: 'cancel' },
                ]
              );
            }}
          />
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={moments.length === 0 ? styles.emptyList : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
