import { Platform } from "react-native";
import { QueryClient } from "@tanstack/react-query";

const MIN_REFRESH_MS = 700;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Force refetch even when queries use staleTime: Infinity. */
export async function invalidateQueryKeys(queryClient: QueryClient, keys: string[][]) {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export async function runScreenRefresh(
  setRefreshing: (value: boolean) => void,
  work: () => Promise<void>,
) {
  setRefreshing(true);
  try {
    await Promise.all([work(), delay(MIN_REFRESH_MS)]);
  } finally {
    setRefreshing(false);
  }
}

export function headerRefreshOffset(insetsTop: number, webExtra = 67, headerExtra = 60) {
  return insetsTop + headerExtra + (Platform.OS === "web" ? webExtra : 0);
}
