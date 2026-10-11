import { apiClient } from './apiClient';
import { API_CONFIG } from './config';
import { Product, FilterOptions, SortOption } from '../../types';
import { mapProduct, resolveImageUrl } from './adapters';
import { storeService } from './storeService';

export const productService = {
  // ============================================================
  // GET PRODUCTS
  // ============================================================
  async getProducts(
    filters?: FilterOptions,
    sort?: SortOption,
    storeId?: number
  ): Promise<Product[]> {
    let result: Product[] = [];

    const activeStoreId =
      storeId ?? (await storeService.getSelectedStoreId());

    if (!activeStoreId) {
      return [];
    }

    try {
      let endpoint = `/api/Products?storeId=${activeStoreId}`;

      if (filters?.categoryId && /^\d+$/.test(filters.categoryId)) {
        endpoint += `&categoryId=${filters.categoryId}`;
      }

      const res = await apiClient.get(endpoint);

      const items = Array.isArray(res)
        ? res
        : res?.result || [];

      if (items.length > 0) {
        result = items.map(mapProduct);
      }
    } catch (e: any) {
      console.warn(
        '[productService.getProducts] Backend error:',
        e.message
      );

      return [];
    }

    // ==========================================================
    // FILTERS
    // ==========================================================
    if (filters) {
      if (filters.categoryId) {
        result = result.filter(
          (p) =>
            p.categoryId === filters.categoryId ||
            p.tags.includes(filters.categoryId!)
        );
      }

      if (typeof filters.minPrice === 'number') {
        result = result.filter(
          (p) => p.sellingPrice >= filters.minPrice!
        );
      }

      if (typeof filters.maxPrice === 'number') {
        result = result.filter(
          (p) => p.sellingPrice <= filters.maxPrice!
        );
      }

      if (typeof filters.minRating === 'number') {
        result = result.filter(
          (p) => p.rating >= filters.minRating!
        );
      }

      if (filters.inStockOnly) {
        result = result.filter(
          (p) => p.isAvailable && p.stock > 0
        );
      }

      if (filters.brand) {
        result = result.filter(
          (p) =>
            p.brand.toLowerCase() ===
            filters.brand?.toLowerCase()
        );
      }
    }

    // ==========================================================
    // SORT
    // ==========================================================
    if (sort) {
      switch (sort) {
        case 'price_asc':
          result.sort(
            (a, b) => a.sellingPrice - b.sellingPrice
          );
          break;

        case 'price_desc':
          result.sort(
            (a, b) => b.sellingPrice - a.sellingPrice
          );
          break;

        case 'rating':
          result.sort(
            (a, b) => b.rating - a.rating
          );
          break;

        case 'popularity':
          result.sort(
            (a, b) => b.reviewCount - a.reviewCount
          );
          break;

        case 'newest':
          result.reverse();
          break;
      }
    }

    return result;
  },

  // ============================================================
  // GET PRODUCT BY ID
  // ============================================================
  async getProductById(
    id: string,
    storeId?: number
  ): Promise<Product | null> {
    if (/^\d+$/.test(id)) {
      try {
        const res = await apiClient.get(
          `/api/Products/${id}`
        );

        if (
          res &&
          (res.productID || res.result?.productID)
        ) {
          const rawProduct = res.result || res;

          // Existing product mapper
          const mappedProduct = mapProduct(rawProduct);

          // ======================================================
          // PRODUCT IMAGES
          // ======================================================
          // Backend structure:
          //
          // variants: [
          //   {
          //     images: [
          //       {
          //         imageID: 1,
          //         imageUrl: "...",
          //         isPrimary: true
          //       }
          //     ]
          //   }
          // ]
          //
          // Convert variant images into:
          // product.image
          // product.gallery
          // ======================================================

          const variantImages: string[] =
            rawProduct.variants?.flatMap(
              (variant: any): string[] =>
                (variant.images || [])
                  .filter(
                    (img: any) =>
                      typeof img?.imageUrl === 'string' &&
                      img.imageUrl.trim().length > 0
                  )
                  .sort(
                    (a: any, b: any) =>
                      Number(b.isPrimary) -
                      Number(a.isPrimary)
                  )
                  .map(
                    (img: any): string =>
                      resolveImageUrl(img.imageUrl)
                  )
                  .filter((url: string): url is string => Boolean(url && url.length > 0))
            ) || [];

          // ======================================================
          // REMOVE DUPLICATE IMAGES
          // ======================================================

          const uniqueImages: string[] = Array.from(
            new Set<string>(variantImages)
          );

          // ======================================================
          // FINAL PRODUCT
          // ======================================================

          return {
            ...mappedProduct,

            // First image = main product image
            image:
              uniqueImages[0] ||
              mappedProduct.image ||
              '',

            // All images = product gallery
            gallery:
              uniqueImages.length > 0
                ? uniqueImages
                : mappedProduct.gallery || [],
          };
        }
      } catch (e: any) {
        console.warn(
          `[productService.getProductById] Backend failed for id ${id}:`,
          e.message
        );
      }
    }

    // ==========================================================
    // FALLBACK
    // ==========================================================

    const all = await this.getProducts(
      undefined,
      undefined,
      storeId
    );

    const found = all.find(
      (p) => p.id === id
    );

    return found
      ? { ...found }
      : null;
  },

  // ============================================================
  // GET PRODUCTS BY CATEGORY
  // ============================================================
  async getProductsByCategory(
    categoryId: string,
    storeId?: number
  ): Promise<Product[]> {
    try {
      const categoryIdNumber = Number(categoryId);

      const activeStoreId =
        storeId ??
        (await storeService.getSelectedStoreId());

      if (
        !Number.isInteger(categoryIdNumber) ||
        categoryIdNumber <= 0
      ) {
        console.warn(
          '[productService.getProductsByCategory] Invalid categoryId:',
          categoryId
        );

        return [];
      }

      let endpoint =
        `/api/Products?categoryId=${categoryIdNumber}`;

      if (
        activeStoreId &&
        activeStoreId > 0
      ) {
        endpoint += `&storeId=${activeStoreId}`;
      }

      const res =
        await apiClient.get(endpoint);

      const items = Array.isArray(res)
        ? res
        : res?.result || [];

      if (!Array.isArray(items)) {
        return [];
      }

      return items.map(mapProduct);
    } catch (e: any) {
      console.warn(
        '[productService.getProductsByCategory] Backend error:',
        e?.message
      );

      return [];
    }
  },

  // ============================================================
  // SEARCH PRODUCTS
  // ============================================================
  async searchProducts(
    query: string,
    storeId?: number
  ): Promise<Product[]> {
    const clean = query.trim().toLowerCase();

    if (!clean) {
      return [];
    }

    const all = await this.getProducts(
      undefined,
      undefined,
      storeId
    );

    return all.filter((p) => {
      const matchName =
        p.name.toLowerCase().includes(clean);

      const matchBrand =
        p.brand.toLowerCase().includes(clean);

      const matchTags =
        p.tags.some((tag) =>
          tag.toLowerCase().includes(clean)
        );

      return (
        matchName ||
        matchBrand ||
        matchTags
      );
    });
  },

  // ============================================================
  // FEATURED PRODUCTS
  // ============================================================
  async getFeaturedProducts(
    storeId?: number
  ): Promise<Product[]> {
    const all = await this.getProducts(
      undefined,
      undefined,
      storeId
    );

    const featured =
      all.filter(
        (p) => p.isFeatured
      );

    return featured.length > 0
      ? featured
      : all.slice(0, 6);
  },

  // ============================================================
  // FLASH DEALS
  // ============================================================
  async getFlashDeals(
    storeId?: number
  ): Promise<Product[]> {
    const all = await this.getProducts(
      undefined,
      undefined,
      storeId
    );

    const deals =
      all.filter(
        (p) =>
          p.isFlashDeal ||
          p.discount >= 10
      );

    return deals.length > 0
      ? deals
      : all.slice(0, 4);
  },

  // ============================================================
  // POPULAR PRODUCTS
  // ============================================================
  async getPopularProducts(
    storeId?: number
  ): Promise<Product[]> {
    const all = await this.getProducts(
      undefined,
      undefined,
      storeId
    );

    const popular =
      all.filter(
        (p) => p.isPopular
      );

    return popular.length > 0
      ? popular
      : all.slice(0, 6);
  },

  // ============================================================
  // SIMILAR PRODUCTS
  // ============================================================
  async getSimilarProducts(
    productId: string,
    categoryId: string,
    storeId?: number
  ): Promise<Product[]> {
    const all = await this.getProducts(
      { categoryId },
      undefined,
      storeId
    );

    return all
      .filter(
        (p) =>
          p.id !== productId &&
          p.categoryId === categoryId
      )
      .slice(0, 6);
  },
};