import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { getRandomAffirmationImage } from "@/lib/affirmation-images";
import { fetch } from "expo/fetch";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowInForeground: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function scheduleAffirmationReminders(
  startHour: number,
  endHour: number,
  intervalMinutes: number,
) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === "web") return;

  const daysAhead = 30;
  const now = new Date();
  let notifIndex = 0;

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + dayOffset);
    const dateKey = targetDate.toISOString().split("T")[0];

    const message = await getAffirmationSnippetForDate(dateKey);

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const triggerDate = new Date(targetDate);
        triggerDate.setHours(hour, minute, 0, 0);

        if (triggerDate <= now) {
          continue;
        }

        const imageUrl = getRandomAffirmationImage(1, notifIndex + dayOffset + 1);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "My Life & My Cash Flow",
            body: message,
            sound: true,
            ...(Platform.OS === "ios" && {
              attachment: {
                uri: imageUrl,
              },
            }),
            ...(Platform.OS === "android" && {
              largeIcon: imageUrl,
              bigPicture: imageUrl,
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

        notifIndex++;
      }
    }
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function getAffirmationSnippetForDate(date: string): Promise<string> {
  try {
    const url = new URL(`/api/affirmations/by-date?date=${encodeURIComponent(date)}`, getApiUrl());
    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) {
      return "Your date-specific affirmation is ready. Tap to affirm it fully now.";
    }

    const aff = await res.json();
    if (!aff || !aff.content) {
      return "Your date-specific affirmation is ready. Tap to affirm it fully now.";
    }

    const firstParagraph = String(aff.content)
      .split("\n\n")[0]
      .replace(/\s+/g, " ")
      .trim();

    const snippet = firstParagraph.length > 120
      ? `${firstParagraph.slice(0, 117).trimEnd()}...`
      : firstParagraph;

    return `${snippet} Tap to affirm it fully.`;
  } catch {
    return "Your date-specific affirmation is ready. Tap to affirm it fully now.";
  }
}
