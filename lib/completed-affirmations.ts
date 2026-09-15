import AsyncStorage from "@react-native-async-storage/async-storage";

const COMPLETED_KEY = "completed_affirmation_ids";
const MAX_CACHED = 100;

export async function getCompletedAffirmationIds(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_KEY);
    if (raw) {
      const ids: number[] = JSON.parse(raw);
      return new Set(ids);
    }
  } catch {}
  return new Set();
}

export async function markAffirmationCompleted(affirmationId: number): Promise<void> {
  try {
    const ids = await getCompletedAffirmationIds();
    ids.add(affirmationId);
    const arr = [...ids];
    if (arr.length > MAX_CACHED) {
      await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(arr.slice(-MAX_CACHED)));
    } else {
      await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(arr));
    }
  } catch {}
}

export async function isAffirmationCompleted(affirmationId: number): Promise<boolean> {
  const ids = await getCompletedAffirmationIds();
  return ids.has(affirmationId);
}
