import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const dynamicImportImage = (assetPath: string) => {
  const allImages = import.meta.glob<{ default: ImageMetadata }>(
    "/src/assets/images/**/*",
  );
  if (assetPath.startsWith("~/")) {
    assetPath = assetPath.replace("~/", "/src/");
  }
  // console.dir(allImages);
  // console.log(assetPath);
  const image = allImages[assetPath];
  if (!image) throw new Error(`Image not found: ${assetPath}`);
  return image().then((x) => x.default);
};
