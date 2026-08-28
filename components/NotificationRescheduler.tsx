import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-context";
import { scheduleAffirmationReminders } from "@/lib/notifications";

const NOTIF_VERSION_KEY = "notif_schedule_version";
const CURRENT_NOTIF_VERSION = "2";

/**
 * Keeps the one-time (per-date) affirmation reminders topped up.
 * Reminders are only pre-scheduled for a rolling window of days, so on every
 * app open we re-schedule if the user has notifications enabled. This makes the
 * notification body always match the affirmation for the day it fires.
 */
export default function NotificationRescheduler() {
  const { user } = useAuth();
  const scheduledThisSession = useRef(false);

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/notification-settings"],
    enabled: !!user && Platform.OS !== "web",
  });

  useEffect(() => {
    if (!user || Platform.OS === "web") return;
    if (!settings || scheduledThisSession.current) return;
    if (!settings.enabled) return;

    const startHour = settings.startHour ?? 8;
    const endHour = settings.endHour ?? 21;
    const intervalMinutes = settings.intervalMinutes ?? 30;

    const reschedule = async () => {
      const storedVersion = await AsyncStorage.getItem(NOTIF_VERSION_KEY).catch(() => null);
      const forceReschedule = storedVersion !== CURRENT_NOTIF_VERSION;

      if (forceReschedule) {
        await AsyncStorage.setItem(NOTIF_VERSION_KEY, CURRENT_NOTIF_VERSION);
      }

      scheduledThisSession.current = true;
      await scheduleAffirmationReminders(startHour, endHour, intervalMinutes);
    };

    reschedule().catch(() => {
      scheduledThisSession.current = false;
    });
  }, [user, settings]);

  return null;
}
