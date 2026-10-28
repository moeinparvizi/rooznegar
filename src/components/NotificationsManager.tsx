"use client";

import { useEffect } from "react";
import { asset } from "@/lib/site";
import { useAppStore, useToday } from "@/lib/store";
import { buildDaySchedule } from "@/lib/schedule";
import { timeToMinutes, toFa } from "@/lib/jalali";

function alreadySent(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markSent(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* storage can be unavailable */
  }
}

async function push(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: asset("/icons/icon-192.png"),
    badge: asset("/icons/icon-192.png"),
    silent: true,
  };
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export function NotificationsManager() {
  const settings = useAppStore((s) => s.settings);
  const days = useAppStore((s) => s.days);
  const today = useToday();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const notifications = settings.notifications;
    if (!notifications.blockStart && !notifications.zeroRule && !notifications.morning) {
      return;
    }

    const check = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const plan = days[today];
      const schedule = buildDaySchedule(today, settings, plan?.mode);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      if (notifications.blockStart) {
        for (const block of schedule.blocks) {
          if (!block.core && block.id !== "gym") continue;
          if (!block.startTime) continue;
          const start = timeToMinutes(block.startTime);
          if (nowMinutes < start || nowMinutes > start + 1) continue;
          const key = `rz-notify-start-${today}-${block.id}`;
          if (alreadySent(key)) continue;
          markSent(key);
          void push(
            `الان وقت ${block.title} است`,
            block.note ?? "یک قدم کوچک کافی است.",
            key,
          );
        }
      }

      if (notifications.morning) {
        const wake = timeToMinutes(settings.wakeTime);
        if (nowMinutes >= wake && nowMinutes <= wake + 60) {
          const key = `rz-notify-morning-${today}`;
          if (!alreadySent(key)) {
            markSent(key);
            const bigTask = schedule.blocks.find((b) => b.id === schedule.bigTaskId);
            void push(
              "صبح بخیر. امروز بزرگش را انتخاب کن.",
              bigTask
                ? `کار بزرگ امروز: ${bigTask.title} · ${toFa(bigTask.duration)} دقیقه`
                : "فقط یک بلوک مهم، نه ده بلوک نیمه‌کاره.",
              key,
            );
          }
        }
      }

      if (notifications.zeroRule) {
        const zeroAt = Math.max(
          19 * 60 + 30,
          timeToMinutes(settings.sleepTime) - 120,
        );
        const sleep = timeToMinutes(settings.sleepTime);
        if (nowMinutes >= zeroAt && nowMinutes < sleep) {
          const key = `rz-notify-zero-${today}`;
          if (!alreadySent(key)) {
            const planNow = plan;
            const moved =
              (planNow?.langMinutes ?? 0) > 0 ||
              (planNow?.deepMinutes ?? 0) > 0 ||
              !!planNow?.journal?.trim();
            if (!moved) {
              markSent(key);
              void push(
                "هیچ روزی صفر نیست",
                "حتی یک خط ژورنال یا پنج دقیقه زبان، باغ امروز را زنده می‌کند.",
                key,
              );
            }
          }
        }
      }
    };

    check();
    const timer = window.setInterval(check, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [days, settings, today]);

  return null;
}
