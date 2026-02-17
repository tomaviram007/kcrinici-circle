const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ValidationResult {
  valid: boolean;
  error?: { title: string; description: string };
}

export const validateImageFile = (file: File, maxSizeMB = 5): ValidationResult => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: {
        title: "סוג קובץ לא נתמך",
        description: "ניתן להעלות רק תמונות (JPEG, PNG, WebP, GIF)",
      },
    };
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: {
        title: "הקובץ גדול מדי",
        description: `גודל מקסימלי: ${maxSizeMB}MB`,
      },
    };
  }

  return { valid: true };
};
