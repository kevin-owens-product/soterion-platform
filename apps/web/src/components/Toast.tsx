import { useEffect, useState } from "react";
import { useToastStore, type ToastType } from "@/store/toastStore";
import { useNotificationStore } from "@/store/notificationStore";
import type { GamificationNotification } from "@/types";

// ── Generic toast styles (existing) ─────────────────────

const typeStyles: Record<ToastType, { border: string; icon: string; iconColor: string }> = {
  success: {
    border: "border-l-[#22c55e]",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    iconColor: "text-[#22c55e]",
  },
  warning: {
    border: "border-l-[#f59e0b]",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
    iconColor: "text-[#f59e0b]",
  },
  error: {
    border: "border-l-[#ef4444]",
    icon: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
    iconColor: "text-[#ef4444]",
  },
  info: {
    border: "border-l-[#06b6d4]",
    icon: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
    iconColor: "text-[#06b6d4]",
  },
};

// ── Generic Toast Item ──────────────────────────────────

function ToastItem({
  id,
  type,
  title,
  message,
}: {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const style = typeStyles[type];

  return (
    <div
      className={`
        flex items-start gap-3 w-80 px-4 py-3
        bg-[#0e0e0e] border border-[#1a1a1a] border-l-2 ${style.border}
        rounded-md shadow-lg shadow-black/40
        transition-all duration-300 ease-out
        ${visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"}
      `}
    >
      <svg
        className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={style.icon} />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#d4d4d4]">{title}</p>
        {message && (
          <p className="text-xs text-[#737373] mt-0.5">{message}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(id)}
        className="shrink-0 p-0.5 rounded hover:bg-white/5 transition-colors"
      >
        <svg
          className="w-4 h-4 text-[#525252]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Gamification Toast Item ─────────────────────────────

const AUTO_DISMISS_MS = 5_000;

const gamifTypeLabels: Record<string, string> = {
  badge_unlock: "BADGE UNLOCKED",
  mission_complete: "MISSION COMPLETE",
  streak_milestone: "STREAK MILESTONE",
  score_update: "SCORE UPDATE",
};

function GamificationToastItem({
  notification,
}: {
  notification: GamificationNotification;
}) {
  const dismiss = useNotificationStore((s) => s.dismiss);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border bg-soterion-surface
        shadow-lg shadow-black/40 transition-all duration-300 ease-out
        w-80
        ${visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
      style={{ borderColor: notification.color + "40" }}
    >
      {/* Colored top accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ backgroundColor: notification.color }}
      />

      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: notification.color + "20" }}
        >
          {notification.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-mono font-semibold tracking-wider uppercase"
            style={{ color: notification.color }}
          >
            {gamifTypeLabels[notification.type] ?? notification.type}
          </p>
          <p className="text-sm font-medium text-gray-100 truncate">
            {notification.title}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {notification.message}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => dismiss(notification.id)}
          className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div className="h-0.5 w-full bg-soterion-border">
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: notification.color,
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}

// ── Combined Toast Container ────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const gamifNotifications = useNotificationStore((s) => s.notifications);

  if (toasts.length === 0 && gamifNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {gamifNotifications.map((n) => (
        <GamificationToastItem key={n.id} notification={n} />
      ))}
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
        />
      ))}
    </div>
  );
}
