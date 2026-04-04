import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/query-client";
import type { Purchase } from "react-native-iap";

export type BookletPurchaseTarget = {
  id: number;
  month: number;
  year: number;
};

type ReactNativeIapModule = typeof import("react-native-iap");

let initPromise: Promise<void> | null = null;

export function getBookletProductId(target: { month: number; year: number }) {
  const month = String(target.month).padStart(2, "0");
  return `com.mylifemycashflow.booklet.${target.year}.${month}`;
}

export function canUseNativeIap() {
  return Platform.OS !== "web" && Constants.executionEnvironment !== "storeClient";
}

export async function initializeIapConnection() {
  if (!canUseNativeIap()) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const iap = await import("react-native-iap");
      await iap.initConnection();
    })();
  }

  await initPromise;
}

export async function endIapConnection() {
  if (!initPromise) {
    return;
  }

  try {
    const iap = await import("react-native-iap");
    await iap.endConnection();
  } catch {
    // Ignore shutdown failures.
  } finally {
    initPromise = null;
  }
}

export async function purchaseBooklet(target: BookletPurchaseTarget) {
  const productId = getBookletProductId(target);

  if (!canUseNativeIap()) {
    await verifyBookletPurchaseOnBackend({
      bookletId: target.id,
      platform: Platform.OS,
      productId,
      transactionId: `mock_${Platform.OS}_${target.id}_${Date.now()}`,
      purchaseToken: `mock_${productId}_${Date.now()}`,
    });
    return;
  }

  await initializeIapConnection();
  const iap = await import("react-native-iap");
  const products = (await iap.fetchProducts({ skus: [productId], type: "in-app" })) ?? [];

  if (!products.some((product) => product.id === productId)) {
    throw new Error(
      `Store product ${productId} is not configured yet. Add it in App Store Connect and Google Play Console first.`,
    );
  }

  const purchase = await requestNativePurchase(iap, productId);

  await verifyBookletPurchaseOnBackend({
    bookletId: target.id,
    platform: Platform.OS,
    productId: purchase.productId,
    transactionId: purchase.id,
    purchaseToken: purchase.purchaseToken || purchase.id,
  });

  await iap.finishTransaction({ purchase, isConsumable: false });
}

async function requestNativePurchase(iap: ReactNativeIapModule, productId: string): Promise<Purchase> {
  return new Promise<Purchase>((resolve, reject) => {
    const successSub = iap.purchaseUpdatedListener((purchase) => {
      const matchesSku = purchase.productId === productId || purchase.ids?.includes(productId);
      if (!matchesSku) {
        return;
      }

      cleanup();
      resolve(purchase);
    });

    const errorSub = iap.purchaseErrorListener((error) => {
      cleanup();
      reject(new Error(error.message || "Purchase failed"));
    });

    function cleanup() {
      successSub.remove();
      errorSub.remove();
    }

    const request = Platform.OS === "ios"
      ? { request: { apple: { sku: productId } }, type: "in-app" as const }
      : { request: { google: { skus: [productId] } }, type: "in-app" as const };

    iap.requestPurchase(request).catch((error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error("Could not start purchase"));
    });
  });
}

async function verifyBookletPurchaseOnBackend(input: {
  bookletId: number;
  platform: string;
  productId: string;
  transactionId: string;
  purchaseToken: string;
}) {
  await apiRequest("POST", "/api/purchases/verify", input);
}
