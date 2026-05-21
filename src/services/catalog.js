import { apiRequest, buildQueryString } from './http'

const resolveApiOrigin = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
  }

  const apiOrigin = import.meta.env.VITE_API_ORIGIN
  return apiOrigin ? apiOrigin.replace(/\/$/, '') : ''
}

const API_ORIGIN = resolveApiOrigin()
const RECENT_PRODUCTS_KEY = 'eshop_recent_products'

const normalizeMediaUrl = (url) => {
  if (!url) {
    return null
  }

  if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) {
    return url
  }

  if (!API_ORIGIN) {
    return url
  }

  return url.startsWith('/') ? `${API_ORIGIN}${url}` : `${API_ORIGIN}/${url}`
}

const pickPrimaryMediaUrl = (media = []) => {
  const validMedia = media.filter((entry) => entry?.url && (!entry?.type || entry.type === 'IMAGE'))
  const primaryMedia = validMedia.find((entry) => entry?.primary || entry?.isPrimary)

  return normalizeMediaUrl(primaryMedia?.url ?? validMedia[0]?.url ?? null)
}

export const getProductImage = (detail) => {
  if (!detail) {
    return null
  }

  const variantImage = pickPrimaryMediaUrl((detail.variants ?? []).flatMap((variant) => variant?.media ?? []))

  return variantImage ?? pickPrimaryMediaUrl(detail.media) ?? null
}

export const searchProducts = async ({ q, typeIds, page = 0, size = 12, sort = 'relevance' } = {}) => {
  return apiRequest(
    `/v1/products/search${buildQueryString({ q, typeIds, page, size, sort })}`,
    {},
    'Không thể tải danh sách sản phẩm.',
  )
}

export const getProductSuggestions = async (q) => {
  if (!q?.trim()) {
    return []
  }

  return apiRequest(
    `/v1/search/suggestions${buildQueryString({ q })}`,
    {},
    'Không thể tải gợi ý tìm kiếm.',
  )
}

export const getProductDetail = async (productId) => {
  return apiRequest(`/v1/products/${productId}`, {}, 'Không thể tải chi tiết sản phẩm.')
}

export const mapSearchItemToCard = (item, detail) => ({
  id: item.productId,
  productId: item.productId,
  name: item.productName,
  slug: item.slug,
  category: item.typeName || 'Skincare',
  typeId: item.typeId,
  typeName: item.typeName,
  price: item.minPrice,
  priceMax: item.maxPrice,
  rating: item.averageRating ?? 0,
  reviews: item.reviewCount ?? 0,
  soldCount: item.soldCount ?? 0,
  inStock: item.inStock,
  variantCount: item.activeVariantCount ?? 0,
  image: getProductImage(detail),
  description: detail?.descriptionMd || detail?.shortDescription || '',
})

export const mapProductDetailToSelection = (detail, fallback = {}) => {
  const variants = detail?.variants ?? []
  const activeVariants = variants.filter((variant) => variant?.active !== false)
  const resolvedVariants = activeVariants.length > 0 ? activeVariants : variants

  return {
    id: detail?.id ?? fallback.productId,
    productId: detail?.id ?? fallback.productId,
    name: detail?.name ?? fallback.name,
    slug: detail?.slug ?? fallback.slug,
    category: fallback.category ?? fallback.typeName ?? 'Skincare',
    image: getProductImage(detail),
    price: resolvedVariants[0]?.price ?? fallback.price,
    description: detail?.descriptionMd || detail?.shortDescription || fallback.description || '',
    rating: fallback.rating ?? 0,
    reviews: fallback.reviews ?? 0,
    soldCount: fallback.soldCount ?? 0,
    variants: resolvedVariants.map((variant, index) => ({
      id: variant.id,
      sku: variant.sku,
      label: variant.sku || `Biến thể ${index + 1}`,
      price: variant.price,
      stockQuantity: variant.stockQuantity,
      image: pickPrimaryMediaUrl(variant.media) ?? getProductImage(detail),
    })),
  }
}

const productLinkOf = (product) => {
  if (typeof window === 'undefined') return ''
  const id = product?.productId || product?.id
  return id ? `${window.location.origin}${window.location.pathname}#product-${id}` : window.location.href
}

export const toChatProductPayload = (product) => ({
  productId: product?.productId || product?.id || '',
  variantId: product?.variantId || product?.variants?.[0]?.id || '',
  productName: product?.name || '',
  productImageUrl: product?.image || '',
  productPrice: product?.price ?? product?.variants?.[0]?.price ?? '',
  linkUrl: product?.linkUrl || productLinkOf(product),
})

export const rememberRecentProduct = (product) => {
  if (typeof window === 'undefined' || !product?.productId) return

  const nextItem = toChatProductPayload(product)
  const currentItems = getRecentProducts()
  const nextItems = [nextItem, ...currentItems.filter((item) => item.productId !== nextItem.productId)].slice(0, 8)
  window.localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(nextItems))
}

export const getRecentProducts = () => {
  if (typeof window === 'undefined') return []

  try {
    const rawValue = window.localStorage.getItem(RECENT_PRODUCTS_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return Array.isArray(parsedValue) ? parsedValue.filter((item) => item?.productId && item?.productName) : []
  } catch {
    return []
  }
}
