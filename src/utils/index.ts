import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Props as AstroSEOProps } from "astro-seo";
import { site } from "~/constants";
import Astro from "astro";

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

  const image = allImages[assetPath];

  if (!image) throw new Error(`Image not found: ${assetPath}`);

  return image().then((x) => x.default);
};

export const maybeDynamicImportImage = (assetPath: string) => {
  try {
    return dynamicImportImage(assetPath);
  } catch {
    return null;
  }
};

export const compileMeta = async (...data: AstroSEOProps[]): Promise<AstroSEOProps> => {
  const defaultImage = await dynamicImportImage("~/assets/images/og-default.png");

  const defaults: AstroSEOProps = {
    titleDefault: site.name,
    titleTemplate: `%s | ${site.name}`,
    description: site.description,
    openGraph: {
      basic: {
        type: "website",
        title: site.name,
        image: defaultImage.src,
      },
      image: {
        url: defaultImage.src,
        width: defaultImage.width,
        height: defaultImage.height,
      },
    },
  } as const;

  const draft = deepMerge(defaults, ...data) as AstroSEOProps;

  // Make sure images are absolute
  if (draft.openGraph?.basic?.image) {
    draft.openGraph.basic.image = new URL(draft.openGraph.basic.image, import.meta.env.SITE).toString();
  }

  if (draft.openGraph?.image?.url) {
    draft.openGraph.image.url = new URL(draft.openGraph.image.url, import.meta.env.SITE).toString();
  }

  return draft;
}

export type ArticleMetaData = {
  title: string;
  description: string;
  image: string;
  authorName?: string;
  category?: string;
  publishedDate: Date;
  modifiedDate: Date;
};

export const articleMeta = async (data: ArticleMetaData): Promise<AstroSEOProps> => {
  const importedImage = await maybeDynamicImportImage(data.image);

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      basic: {
        title: data.title,
        type: "article",
        image: importedImage?.src || data.image,
      },
      article: {
        authors: data.authorName ? [data.authorName] : [],
        section: data.category,
        publishedTime: data.publishedDate.toISOString(),
        modifiedTime: data.modifiedDate.toISOString(),
      },
      image: importedImage ? ({
        url: importedImage.src,
        width: importedImage.width,
        height: importedImage.height,
      }) : ({}),
    },
  };
};

export type PageMetaData = {
  title: string;
  description: string;
  image: string;
};

export const pageMeta = async (data: PageMetaData): Promise<AstroSEOProps> => {
  const importedImage = await maybeDynamicImportImage(data.image);

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      basic: {
        title: data.title,
        type: "website",
        image: importedImage?.src || data.image,
      },
      optional: {
        siteName: 'Ludi',
        description: data.description,
      }
    },
  };
};

/**
 * Performs a deep merge of multiple objects
 * @param objects - Array of objects to merge
 * @returns A new object with all properties deeply merged
 */
export const deepMerge = (...objects: Record<string, any>[]): Record<string, any> => {
  // Filter out null/undefined objects
  const validObjects = objects.filter(obj => obj != null);

  // Return empty object if no valid objects were provided
  if (validObjects.length === 0) {
    return {};
  }

  // If only one object is provided, create a shallow copy
  if (validObjects.length === 1) {
    return { ...validObjects[0] };
  }

  // Start with an empty object
  const result: Record<string, any> = {};

  // Process each object in the input array
  for (const obj of validObjects) {
    // Iterate through all properties of the current object
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const currentValue = obj[key];

        // If property doesn't exist in result yet, just add it
        if (!(key in result)) {
          result[key] = currentValue;
          continue;
        }

        const existingValue = result[key];

        // Handle merging based on value types
        if (isPlainObject(currentValue) && isPlainObject(existingValue)) {
          // Recursively merge objects
          result[key] = deepMerge(existingValue, currentValue);
        } else if (Array.isArray(currentValue) && Array.isArray(existingValue)) {
          // Merge arrays by concatenating
          result[key] = [...existingValue, ...currentValue];
        } else {
          // For primitive values or anything else, the later object's value takes precedence
          result[key] = currentValue;
        }
      }
    }
  }

  return result;
};

/**
 * Checks if a value is a plain object (not null, not array, not date, etc.)
 * @param value - The value to check
 * @returns True if the value is a plain object
 */
export const isPlainObject = (value: any): boolean => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // Check if it's not an array, date, regexp, etc.
  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};