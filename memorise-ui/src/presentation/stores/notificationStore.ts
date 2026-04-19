import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Notice } from '../../types';

/**
 * Queue-based notification store for toast/snackbar messages and
 * the unsaved-changes navigation guard dialog.
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

  /** Unsaved-changes guard: stores the pending navigation action */
  unsavedGuardAction: (() => void) | null;
  showUnsavedGuard: (onProceed: () => void) => void;
  dismissUnsavedGuard: () => void;
  proceedUnsavedGuard: () => void;
}

let notificationId = 0;

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    (set, get) => ({
      notifications: [],
      current: null,

      enqueue: (notice) => {
        const notification: NotificationWithId = {
          ...notice,
          id: `notice-${++notificationId}`,
          timestamp: Date.now(),
        };

        set((state) => {
          const currentIsLoading = state.current?.loading === true;
          const queue = currentIsLoading
            ? state.notifications.filter((n) => n.id !== state.current?.id)
            : state.notifications;
          const newQueue = [...queue, notification];
          return {
            notifications: newQueue,
            current: state.current === null || currentIsLoading ? notification : state.current,
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

      unsavedGuardAction: null,
      showUnsavedGuard: (onProceed) => set({ unsavedGuardAction: onProceed }),
      dismissUnsavedGuard: () => set({ unsavedGuardAction: null }),
      proceedUnsavedGuard: () => {
        const action = get().unsavedGuardAction;
        set({ unsavedGuardAction: null });
        action?.();
      },
    }),
    { name: 'notification-store' }
  )
);
