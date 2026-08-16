/**
 * Utility to compress and resize image files before uploading
 * Reduces image size by 80%-95% (e.g. 5MB -> 80KB) for lightning-fast loading
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<File> {
  if (typeof window === "undefined" || !file || !file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = canvas.toDataURL("image/webp").startsWith("data:image/webp")
          ? "image/webp"
          : "image/jpeg";

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);

            const ext = mimeType === "image/webp" ? "webp" : "jpg";
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const newFile = new File([blob], `${nameWithoutExt}.${ext}`, {
              type: mimeType,
              lastModified: Date.now()
            });

            resolve(newFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
