import { NotificationDTO } from '../api/notificationService';

export interface NavigationTarget {
  screen: string;
  params?: any;
}

/**
 * Determine navigation target based on notification type
 */
export function getNavigationTargetFromNotification(
  notification: NotificationDTO
): NavigationTarget | null {
  const { type, targetType, targetId, actorId } = notification;

  switch (type) {
    case 'FRIEND_REQUEST':
      return {
        screen: 'friends',
        params: { tab: 'requests' },
      };

    case 'FRIEND_ACCEPT':
      return {
        screen: 'userProfile',
        params: { userId: actorId },
      };

    case 'MOMENT_REACTION':
    case 'MOMENT_COMMENT':
    case 'MOMENT_TAG':
      if (targetType === 'MOMENT' && targetId) {
        return {
          screen: 'explore-moment',
          params: { momentId: targetId },
        };
      }
      return {
        screen: 'home',
        params: {},
      };

    case 'NEW_MESSAGE':
      return {
        screen: 'chat-room',
        params: { userId: actorId },
      };

    case 'SOS_ALERT':
      return {
        screen: 'map',
        params: { 
          focusUserId: actorId,
          isSOSAlert: true,
        },
      };

    default:
      return null;
  }
}

/**
 * Navigate to target using navigation object
 */
export function navigateToTarget(
  navigation: any,
  target: NavigationTarget | null
) {
  if (!target) return;

  try {
    navigation.navigate(target.screen, target.params);
  } catch (error) {
    console.error('Error navigating to target:', error);
  }
}
