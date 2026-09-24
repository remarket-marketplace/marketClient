import { ZodError } from "zod";
import { ProductSchema, type Product } from "@/validation/product/product";

type ProductRecord = Record<string, unknown>;

function normalizeProductImageUrl(rawImageUrl: unknown): string {
  if (typeof rawImageUrl !== "string") {
    return "";
  }

  const trimmedImageUrl = rawImageUrl.trim();
  if (!trimmedImageUrl) {
    return "";
  }

  if (
    trimmedImageUrl.startsWith("/uploads/")
    || trimmedImageUrl.startsWith("/v1/uploads/")
  ) {
    return trimmedImageUrl;
  }

  if (
    trimmedImageUrl.startsWith("http://")
    || trimmedImageUrl.startsWith("https://")
  ) {
    try {
      const parsedUrl = new URL(trimmedImageUrl);
      const filename = parsedUrl.pathname.split("/").filter(Boolean).pop();
      return filename ? `/uploads/${filename}` : trimmedImageUrl;
    } catch {
      return trimmedImageUrl;
    }
  }

  return trimmedImageUrl.startsWith("/") ? trimmedImageUrl : `/${trimmedImageUrl}`;
}

export function normalizeProductPayload(product: unknown): unknown {
  if (!product || typeof product !== "object") {
    return product;
  }

  const productRecord = product as ProductRecord;
  const normalizedImages = Array.isArray(productRecord.images)
    ? productRecord.images.map((image) => {
        if (!image || typeof image !== "object") {
          return image;
        }

        const imageRecord = image as ProductRecord;
        const normalizedImageUrl = normalizeProductImageUrl(
          imageRecord.image_url ?? imageRecord.url ?? "",
        );

        return {
          ...imageRecord,
          image_url: normalizedImageUrl,
          url: normalizedImageUrl,
        };
      })
    : [];

  return {
    ...productRecord,
    images: normalizedImages,
  };
}

export function parseProduct(product: unknown): Product {
  return ProductSchema.parse(normalizeProductPayload(product));
}

export function parseOptionalProduct(
  product: unknown,
  context: string,
): Product | null {
  try {
    return parseProduct(product);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(`${context}: invalid product payload`, error.issues);
      return null;
    }
    throw error;
  }
}

export function parseProductList(
  products: unknown,
  context: string,
): Product[] {
  if (!Array.isArray(products)) {
    console.error(`${context}: products payload is not an array`, products);
    return [];
  }

  return products.flatMap((product, index) => {
    const parsedProduct = parseOptionalProduct(
      product,
      `${context} [index=${index}]`,
    );
    return parsedProduct ? [parsedProduct] : [];
  });
}
