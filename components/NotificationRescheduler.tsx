import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/query-client";
import { scheduleAffirmationReminders } from "@/lib/notifications";

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

    scheduledThisSession.current = true;
    const startHour = settings.startHour ?? 8;
    const endHour = settings.endHour ?? 21;
    const intervalMinutes = settings.intervalMinutes ?? 30;

    scheduleAffirmationReminders(startHour, endHour, intervalMinutes).catch(
      () => {
        // Let it retry on the next app open instead of failing silently forever.
        scheduledThisSession.current = false;
      },
    );
  }, [user, settings]);

  return null;
}
