import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

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

  const affirmationMessages = [
    "Have you affirmed today? Your words shape your reality.",
    "Time to speak your abundance into existence.",
    "Your affirmation is waiting. Manifest your greatness.",
    "Pause and affirm. Your energy creates your wealth.",
    "The universe is listening. Have you affirmed today?",
    "Your cash flow follows your mindset. Affirm now.",
    "Speak your blessings into being. Open your affirmation.",
    "Abundance is your birthright. Take a moment to affirm.",
    "Your words are seeds. Plant them now with your affirmation.",
    "Every affirmation builds your empire. Don't skip today.",
  ];

  let notifIndex = 0;
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const message =
        affirmationMessages[notifIndex % affirmationMessages.length];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "My Life & My Cash Flow",
          body: message,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      notifIndex++;
    }
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
