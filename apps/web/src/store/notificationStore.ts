import { create } from "zustand";
import type { GamificationNotification, GamificationEventType } from "@/types";

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5_000;

interface NotificationState {
  notifications: GamificationNotification[];
  queue: GamificationNotification[];
  push: (
    type: GamificationEventType,
    title: string,
    message: string,
    icon?: string,
  ) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const TYPE_COLORS: Record<GamificationEventType, string> = {
  badge_unlock: "#8b5cf6",
  mission_complete: "#22c55e",
  streak_milestone: "#f97316",
  score_update: "#f59e0b",
};

const TYPE_ICONS: Record<GamificationEventType, string> = {
  badge_unlock: "\uD83C\uDFC5",
  mission_complete: "\u2705",
  streak_milestone: "\uD83D\uDD25",
  score_update: "\u2B50",
};

let idCounter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  queue: [],

  push: (type, title, message, icon) => {
    const notification: GamificationNotification = {
      id: `notif-${Date.now()}-${++idCounter}`,
      type,
      title,
      message,
      icon: icon ?? TYPE_ICONS[type],
      color: TYPE_COLORS[type],
      timestamp: Date.now(),
      dismissed: false,
    };

    const { notifications, queue } = get();

    if (notifications.length >= MAX_VISIBLE) {
      set({ queue: [...queue, notification] });
    } else {
      set({ notifications: [...notifications, notification] });
      scheduleAutoDismiss(notification.id, get, set);
    }
  },

  dismiss: (id) => {
    const { notifications, queue } = get();
    const filtered = notifications.filter((n) => n.id !== id);

    // Promote from queue if space available
    if (queue.length > 0 && filtered.length < MAX_VISIBLE) {
      const [next, ...rest] = queue;
      if (next) {
        set({ notifications: [...filtered, next], queue: rest });
        scheduleAutoDismiss(
          next.id,
          get,
          set as Parameters<typeof scheduleAutoDismiss>[2],
        );
      }
    } else {
      set({ notifications: filtered });
    }
  },

  clearAll: () => set({ notifications: [], queue: [] }),
}));

function scheduleAutoDismiss(
  id: string,
  get: () => NotificationState,
  set: (partial: Partial<NotificationState>) => void,
) {
  setTimeout(() => {
    const { notifications, queue } = get();
    const filtered = notifications.filter((n) => n.id !== id);

    if (queue.length > 0 && filtered.length < MAX_VISIBLE) {
      const [next, ...rest] = queue;
      if (next) {
        set({ notifications: [...filtered, next], queue: rest });
        scheduleAutoDismiss(next.id, get, set);
      }
    } else {
      set({ notifications: filtered });
    }
  }, AUTO_DISMISS_MS);
}
