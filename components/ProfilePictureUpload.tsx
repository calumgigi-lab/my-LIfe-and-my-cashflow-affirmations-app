import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { apiRequest } from "@/lib/query-client";
import { useThemeColors } from "@/constants/colors";

interface ProfilePictureUploadProps {
  currentImageUrl?: string;
  displayName?: string;
  size?: number;
  editable?: boolean;
  onUploadComplete?: () => void;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImageUrl,
  displayName = "User",
  size = 100,
  editable = true,
  onUploadComplete,
}) => {
  const scheme = useColorScheme();
  const colors = useThemeColors(scheme);
  const isDark = scheme === "dark";
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      try {
        // Use expo-file-system to read the file as base64 on native platforms
        const base64String = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });

        const response = await apiRequest("POST", "/api/profile/picture", {
          pictureUrl: `data:image/jpeg;base64,${base64String}`,
        });

        return response;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setSelectedImage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onUploadComplete?.();
      Alert.alert("Success", "Profile picture updated successfully!");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to update profile picture. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/profile/picture", {});
    },
    onSuccess: () => {
      setSelectedImage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onUploadComplete?.();
      Alert.alert("Success", "Profile picture removed");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to remove profile picture. Please try again.");
    },
  });

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        uploadMutation.mutate(imageUri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        uploadMutation.mutate(imageUri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const displayUrl = selectedImage || currentImageUrl;
  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: displayUrl || selectedImage ? "transparent" : colors.gold,
          },
        ]}
      >
        {displayUrl ? (
          <Image
            source={{ uri: displayUrl }}
            style={[
              styles.profileImage,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
              },
            ]}
          />
        ) : (
          <Text
            style={[
              styles.initials,
              {
                fontSize: size / 2.5,
                color: isDark ? "#000" : "#fff",
                fontFamily: "DMSans_700Bold",
              },
            ]}
          >
            {initials}
          </Text>
        )}

        {isLoading && (
          <View
            style={[
              styles.loadingOverlay,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: "rgba(0, 0, 0, 0.3)",
              },
            ]}
          >
            <ActivityIndicator color={colors.gold} size="small" />
          </View>
        )}

        {editable && !isLoading && (
          <View
            style={[
              styles.editButton,
              {
                backgroundColor: colors.gold,
                width: size / 3.5,
                height: size / 3.5,
                borderRadius: size / 7,
              },
            ]}
          >
            <Pressable
              onPress={pickImage}
              style={styles.editButtonPress}
            >
              <Ionicons name="camera" size={size / 6} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      {editable && (
        <View style={styles.actionButtons}>
          <Pressable
            onPress={pickImage}
            disabled={isLoading}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: isLoading ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="image" size={18} color={colors.text} />
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.text, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Gallery
            </Text>
          </Pressable>

          <Pressable
            onPress={takePhoto}
            disabled={isLoading}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: isLoading ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="camera" size={18} color={colors.text} />
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.text, fontFamily: "DMSans_500Medium" },
              ]}
            >
              Camera
            </Text>
          </Pressable>

          {currentImageUrl && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  "Remove Picture",
                  "Are you sure you want to remove your profile picture?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => deleteMutation.mutate(),
                    },
                  ],
                );
              }}
              disabled={isLoading}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark ? "rgba(220, 38, 38, 0.1)" : "rgba(220, 38, 38, 0.05)",
                  borderColor: "#dc2626",
                  opacity: isLoading ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="trash" size={18} color="#dc2626" />
              <Text
                style={[
                  styles.actionButtonText,
                  { color: "#dc2626", fontFamily: "DMSans_500Medium" },
                ]}
              >
                Remove
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  profileImage: {
    resizeMode: "cover",
  },
  initials: {
    fontWeight: "bold",
  },
  loadingOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  editButtonPress: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
  },
});
