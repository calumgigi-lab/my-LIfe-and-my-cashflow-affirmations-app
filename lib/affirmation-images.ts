/**
 * Affirmation Images - Local images with randomization
 */

// Array of local affirmation images
// These are your custom images that will be randomized across affirmations
export const AFFIRMATION_IMAGES = [
  "/page-images/IMG_2782.JPG.jpeg",
  "/page-images/IMG_2788.JPG.jpeg",
  "/page-images/IMG_2789.JPG.jpeg",
  "/page-images/IMG_8956.JPG.jpeg",
  "/page-images/IMG_8958.JPG.jpeg",
  "/page-images/IMG_8959.JPG.jpeg",
  "/page-images/IMG_8960.JPG.jpeg",
  "/page-images/IMG_8961.JPG.jpeg",
  "/page-images/IMG_8962.JPG.jpeg",
  "/page-images/IMG_8963.JPG.jpeg",
  "/page-images/IMG_8964.JPG.jpeg",
  "/page-images/IMG_8965.JPG.jpeg",
  "/page-images/IMG_8966.JPG.jpeg",
  "/page-images/IMG_8967.JPG.jpeg",
  "/page-images/IMG_8970.JPG.jpeg",
  "/page-images/IMG_8971.JPG.jpeg",
  "/page-images/IMG_8972.JPG.jpeg",
  "/page-images/IMG_8975.JPG.jpeg",
  "/page-images/IMG_8978.JPG.jpeg",
  "/page-images/IMG_8980.JPG.jpeg",
  "/page-images/IMG_8981.JPG.jpeg",
  "/page-images/IMG_8982.JPG.jpeg",
  "/page-images/IMG_8983.JPG.jpeg",
  "/page-images/IMG_8984.JPG.jpeg",
  "/page-images/IMG_8985.JPG.jpeg",
  "/page-images/IMG_8988.JPG.jpeg",
  "/page-images/IMG_8989.JPG.jpeg",
  "/page-images/IMG_8994.JPG.jpeg",
  "/page-images/IMG_8996.JPG.jpeg",
];

/**
 * Get a random image for an affirmation
 * Uses a seeded selection based on day number to ensure consistency
 * but varies by booklet to increase diversity
 */
export function getRandomAffirmationImage(bookletId: number, dayNumber: number): string {
  // Create a seed from bookletId and dayNumber for pseudo-random but consistent selection
  const seed = (bookletId * 31 + dayNumber) % AFFIRMATION_IMAGES.length;
  return AFFIRMATION_IMAGES[seed];
}

/**
 * Get all affirmation images (for future use in image selection gallery)
 */
export function getAllAffirmationImages(): string[] {
  return AFFIRMATION_IMAGES;
}

/**
 * Rotate through images for variety
 * This ensures different affirmations get different images based on position
 */
export function getAffirmationImageByIndex(index: number): string {
  return AFFIRMATION_IMAGES[index % AFFIRMATION_IMAGES.length];
}
