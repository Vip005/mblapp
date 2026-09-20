import { ProductVariant } from '../types';

export const createVariants = (
  prefix: string,
  configs: { name: string; unit: string; price: number; originalPrice: number; stock?: number }[]
): ProductVariant[] => {
  return configs.map((c, i) => ({
    id: `${prefix}-v${i + 1}`,
    name: c.name,
    unit: c.unit,
    price: c.price,
    originalPrice: c.originalPrice,
    stock: c.stock ?? 30,
    isAvailable: true,
  }));
};
