import React, { createContext, useContext, ReactNode } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Constants from "expo-constants";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl } from "@/lib/query-client";
import { MaintenanceScreen, MaintenanceInfo } from "@/components/MaintenanceScreen";
import { AppUpdateScreen, AppUpdateInfo } from "@/components/AppUpdateScreen";
import { LiveBanners, AnnouncementInfo } from "@/components/LiveBanners";

interface PublicSettings {
  maintenance?: MaintenanceInfo;
  appUpdate?: AppUpdateInfo;
  announcement?: AnnouncementInfo;
}

interface MaintenanceContextValue {
  maintenance: MaintenanceInfo | null;
  appUpdate: AppUpdateInfo | null;
  announcement: AnnouncementInfo | null;
  refetch: () => void;
  isLoading: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

function getCurrentVersionCode(): number {
  const fromConfig =
    (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode ??
    (Constants.expoConfig as { android?: { versionCode?: number } } | undefined)?.android?.versionCode;
  const parsed = Number(fromConfig ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** True when the update notice / block should apply to this installed build. */
function isAppUpdateApplicable(appUpdate: AppUpdateInfo | null, currentVersionCode: number): boolean {
  if (!appUpdate?.enabled) return false;
  const minCode = Number(appUpdate.minVersionCode) || 0;
  // Admin enabled notice but left minVersionCode empty → show to all installed builds.
  if (minCode <= 0) return true;
  // Can't read native versionCode (older build) → still show the notice.
  if (currentVersionCode <= 0) return true;
  return currentVersionCode < minCode;
}

async function fetchPublicSettings(): Promise<PublicSettings> {
  const baseUrl = getApiUrl();
  const res = await fetch(new URL("/api/settings/public", baseUrl).toString());
  if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`);
  return res.json();
}

export function MaintenanceProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: fetchPublicSettings,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const maintenance = data?.maintenance ?? null;
  const appUpdate = data?.appUpdate ?? null;
  const announcement = data?.announcement ?? null;

  const isAdmin = !!user?.isAdmin;
  const blocked = !authLoading && maintenance?.enabled && !isAdmin;

  if (blocked && maintenance) {
    return (
      <MaintenanceScreen
        maintenance={maintenance}
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }

  const currentVersionCode = getCurrentVersionCode();
  const updateNeeded = isAppUpdateApplicable(appUpdate, currentVersionCode);

  // Forced update blocks the whole app for non-admins.
  if (updateNeeded && appUpdate?.force && !isAdmin) {
    return <AppUpdateScreen appUpdate={appUpdate} />;
  }

  return (
    <MaintenanceContext.Provider
      value={{
        maintenance,
        appUpdate,
        announcement,
        refetch: () => { refetch(); },
        isLoading: isLoading || authLoading,
      }}
    >
      <View style={{ flex: 1 }}>
        {children}
        <LiveBanners
          announcement={announcement}
          softUpdate={updateNeeded ? appUpdate : null}
        />
      </View>
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const ctx = useContext(MaintenanceContext);
  if (!ctx) {
    throw new Error("useMaintenance must be used within MaintenanceProvider");
  }
  return ctx;
}
