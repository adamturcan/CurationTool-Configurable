import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Notice } from '../../types';

/**
 * Queue-based notification store for toast/snackbar messages.
 * enqueue() adds to queue, dequeue() advances to next.
 *
 * @category Stores
 */

interface NotificationWithId extends Notice {
  id: string;
  timestamp: number;
}

interface NotificationStore {
  notifications: NotificationWithId[];
  current: NotificationWithId | null;
  enqueue: (notice: Notice) => void;
  dequeue: () => void;
}

let notificationId = 0;

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set) => ({
      notifications: [],
      current: null,

      enqueue: (notice) => {
        const notification: NotificationWithId = {
          ...notice,
          id: `notice-${++notificationId}`,
          timestamp: Date.now(),
        };
        
        set((state) => {
          const newQueue = [...state.notifications, notification];
          return {
            notifications: newQueue,
            // If no current notification, set this one as current
            current: state.current === null ? notification : state.current,
          };
        });
      },

      dequeue: () => {
        set((state) => {
          const remaining = state.notifications.filter(
            (n) => n.id !== state.current?.id
          );
          return {
            notifications: remaining,
            current: remaining[0] || null,
          };
        });
      },
    }),
    { name: 'notification-store' }
  )
);
