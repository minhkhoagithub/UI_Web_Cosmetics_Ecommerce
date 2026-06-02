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

const formatVariantMeasure = (value) =>
  value
    .replace(/-/g, ' ')
    .replace(/(\d+)\s*(ml|g|kg|l|oz)/gi, '$1$2')
    .trim()

const resolveVariantLabelFromOptionValueId = (optionValueId) => {
  if (!optionValueId) {
    return ''
  }

  const normalizedValue = String(optionValueId).trim().toLowerCase()
  const parts = normalizedValue.split('_').filter(Boolean)
  const optionType = parts[1] ?? ''
  const rawValue = parts.slice(2).join(' ')

  if (!rawValue) {
    return ''
  }

  const formattedValue = formatVariantMeasure(rawValue)
  if (/\d+(ml|g|kg|l|oz)\b/i.test(formattedValue)) {
    return formattedValue
  }

  if (['volume', 'size', 'capacity', 'dung', 'dungtich'].includes(optionType)) {
    const numericMatch = formattedValue.match(/\d+/)
    return numericMatch ? `${Number(numericMatch[0])}ml` : formattedValue
  }

  return ''
}

const resolveVariantLabelFromSku = (sku) => {
  if (!sku) {
    return ''
  }

  const compactSku = String(sku).trim().toLowerCase()
  const unitMatch = compactSku.match(/(\d+)\s*(ml|g|kg|l|oz)\b/i)
  if (unitMatch) {
    return `${Number(unitMatch[1])}${unitMatch[2].toLowerCase()}`
  }

  const numericMatch = compactSku.match(/(?:^|[-_])0*(\d{2,4})(?:$|[-_])/)
  return numericMatch ? `${Number(numericMatch[1])}ml` : ''
}

const resolveVariantDisplayLabel = (variant, index) => {
  const labelFromOptions = (variant?.options ?? [])
    .map((option) => resolveVariantLabelFromOptionValueId(option?.optionValueId))
    .find(Boolean)

  if (labelFromOptions) {
    return labelFromOptions
  }

  const labelFromSku = resolveVariantLabelFromSku(variant?.sku)
  if (labelFromSku) {
    return labelFromSku
  }

  return `Tùy chọn ${index + 1}`
}

const normalizeMediaUrl = (url) => {
  if (!url) {
    return null
  }

  const mediaUrl = String(url).trim()
  if (!mediaUrl) {
    return null
  }

  if (/^https?:\/\//i.test(mediaUrl) || /^data:/i.test(mediaUrl)) {
    return mediaUrl
  }

  if (!API_ORIGIN) {
    return mediaUrl
  }

  return mediaUrl.startsWith('/') ? `${API_ORIGIN}${mediaUrl}` : `${API_ORIGIN}/${mediaUrl}`
}

const mediaUrlOf = (entry) => {
  if (typeof entry === 'string') {
    return entry
  }

  return entry?.url ?? entry?.imageUrl ?? entry?.thumbnailUrl ?? entry?.secureUrl ?? null
}

const isImageMedia = (entry) => {
  if (typeof entry === 'string') {
    return true
  }

  const type = String(entry?.type ?? entry?.mediaType ?? '').trim().toUpperCase()
  return !type || type === 'IMAGE'
}

const pickPrimaryMediaUrl = (media = []) => {
  const entries = Array.isArray(media) ? media : []
  const validMedia = entries.filter((entry) => mediaUrlOf(entry) && isImageMedia(entry))
  const primaryMedia = validMedia.find((entry) => entry?.primary || entry?.isPrimary)

  return normalizeMediaUrl(mediaUrlOf(primaryMedia ?? validMedia[0]))
}

export const getProductImage = (detail) => {
  if (!detail) {
    return null
  }

  const variantImage = pickPrimaryMediaUrl((detail.variants ?? []).flatMap((variant) => variant?.media ?? []))

  return variantImage ?? pickPrimaryMediaUrl(detail.media) ?? null
}

export const getVariantImage = (detail, variantId) => {
  if (!detail) {
    return null
  }

  const variant = (detail.variants ?? []).find((item) => item?.id === variantId)

  return pickPrimaryMediaUrl(variant?.media) ?? getProductImage(detail)
}

const getPromotionVariantIds = (promotion) => {
  const variantIds = promotion?.config?.variantIds
  return Array.isArray(variantIds) ? variantIds.map((id) => String(id)) : []
}

const calculateVariantDiscount = (price, promotion) => {
  const resolvedPrice = Number(price ?? 0)
  const discountPercent = Number(promotion?.config?.discountPercent)
  if (Number.isFinite(discountPercent) && discountPercent > 0) {
    return Math.min(resolvedPrice, Math.round((resolvedPrice * discountPercent) / 100))
  }

  const discountAmount = Number(promotion?.config?.discountAmount)
  if (Number.isFinite(discountAmount) && discountAmount > 0) {
    return Math.min(resolvedPrice, discountAmount)
  }

  return 0
}

const getPromotionLabel = (promotion) => {
  const discountPercent = promotion?.config?.discountPercent
  if (discountPercent !== undefined && discountPercent !== null) {
    return `-${Number(discountPercent)}%`
  }

  return 'Khuyến mãi'
}

const findBestPromotionForVariant = (variant, promotions = []) => {
  const variantId = String(variant?.id ?? '')
  if (!variantId) {
    return null
  }

  return promotions
    .filter((promotion) => promotion?.type === 'PRODUCT_DISCOUNT')
    .filter((promotion) => getPromotionVariantIds(promotion).includes(variantId))
    .map((promotion) => ({
      promotion,
      discountAmount: calculateVariantDiscount(variant?.price, promotion),
    }))
    .filter((entry) => entry.discountAmount > 0)
    .sort((left, right) => right.discountAmount - left.discountAmount)[0] ?? null
}

const mapVariantPromotionFields = (variant, promotions = []) => {
  const bestPromotion = findBestPromotionForVariant(variant, promotions)
  const originalPrice = Number(variant?.price ?? 0)
  const discountedPrice = bestPromotion ? Math.max(0, originalPrice - bestPromotion.discountAmount) : originalPrice

  return {
    originalPrice,
    discountedPrice,
    onPromotion: Boolean(bestPromotion),
    promotionId: bestPromotion?.promotion.id ?? null,
    promotionCode: bestPromotion?.promotion.code ?? null,
    promotionName: bestPromotion?.promotion.name ?? null,
    promotionLabel: bestPromotion ? getPromotionLabel(bestPromotion.promotion) : '',
    discountAmount: bestPromotion?.discountAmount ?? 0,
  }
}

const summarizePromotionPricing = (variants = []) => {
  const prices = variants.map((variant) => Number(variant.discountedPrice ?? variant.price ?? 0))
  const originalPrices = variants.map((variant) => Number(variant.originalPrice ?? variant.price ?? 0))
  const promotedVariants = variants.filter((variant) => variant.onPromotion)
  const strongestPromotion = [...promotedVariants].sort((left, right) => Number(right.discountAmount ?? 0) - Number(left.discountAmount ?? 0))[0]

  return {
    price: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    originalPrice: originalPrices.length ? Math.min(...originalPrices) : 0,
    originalPriceMax: originalPrices.length ? Math.max(...originalPrices) : 0,
    onPromotion: promotedVariants.length > 0,
    promotionLabel: strongestPromotion?.promotionLabel ?? '',
  }
}

const mapSemanticReferences = (values = []) =>
  (Array.isArray(values) ? values : [])
    .map((value) => ({
      id: value?.id ?? '',
      code: value?.code ?? '',
      name: value?.name ?? value?.code ?? '',
    }))
    .filter((value) => value.id || value.code || value.name)

export const searchProducts = async ({ q, typeIds, page = 0, size = 12, sort = 'relevance' } = {}) => {
  return apiRequest(
    `/v1/products/search${buildQueryString({ q, typeIds, page, size, sort })}`,
    {
      retries: 2,
      retryDelayMs: 300,
      timeoutMs: 8000,
    },
    'Không thể tải danh sách sản phẩm.',
  )
}

export const searchProductsByImage = async ({
  file,
  typeIds,
  minPrice,
  maxPrice,
  inStock,
  sort = 'relevance',
  page = 0,
  size = 6,
} = {}) => {
  const formData = new FormData()
  formData.append('file', file)

  if (Array.isArray(typeIds)) {
    typeIds.forEach((typeId) => {
      if (typeId !== undefined && typeId !== null && typeId !== '') {
        formData.append('typeIds', String(typeId))
      }
    })
  }

  return apiRequest(
    `/v1/products/search/image${buildQueryString({ minPrice, maxPrice, inStock, sort, page, size })}`,
    {
      method: 'POST',
      body: formData,
    },
    'Image search failed.',
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

export const mapSearchItemToCard = (item, detail, promotions = []) => {
  const detailSelection = detail
    ? mapProductDetailToSelection(detail, {
        productId: item.productId,
        name: item.productName,
        slug: item.slug,
        category: item.typeName,
        typeName: item.typeName,
        rating: item.averageRating ?? 0,
        reviews: item.reviewCount ?? 0,
        soldCount: item.soldCount ?? 0,
      }, promotions)
    : null

  return {
    id: item.productId,
    productId: item.productId,
    name: item.productName,
    slug: item.slug,
    category: item.typeName || 'Chăm sóc da',
    typeId: item.typeId,
    typeName: item.typeName,
    price: detailSelection?.price ?? item.minPrice,
    priceMax: detailSelection?.priceMax ?? item.maxPrice,
    originalPrice: detailSelection?.originalPrice ?? item.minPrice,
    originalPriceMax: detailSelection?.originalPriceMax ?? item.maxPrice,
    onPromotion: detailSelection?.onPromotion ?? false,
    promotionLabel: detailSelection?.promotionLabel ?? '',
    productPromotions: promotions,
    rating: item.averageRating ?? 0,
    reviews: item.reviewCount ?? 0,
    soldCount: item.soldCount ?? 0,
    tags: detailSelection?.tags ?? [],
    inStock: item.inStock,
    variantCount: item.activeVariantCount ?? 0,
    image: getProductImage(detail) ?? normalizeMediaUrl(item.thumbnailUrl ?? item.imageUrl ?? item.url),
    description: detail?.descriptionMd || detail?.shortDescription || '',
  }
}

export const mapProductDetailToSelection = (detail, fallback = {}, promotions = []) => {
  const variants = detail?.variants ?? []
  const activeVariants = variants.filter((variant) => variant?.active !== false)
  const resolvedVariants = activeVariants.length > 0 ? activeVariants : variants
  const mappedVariants = resolvedVariants.map((variant, index) => ({
    id: variant.id,
    sku: variant.sku,
    label: resolveVariantDisplayLabel(variant, index),
    price: variant.price,
    stockQuantity: variant.stockQuantity,
    image: pickPrimaryMediaUrl(variant.media) ?? getProductImage(detail) ?? fallback.image,
    ...mapVariantPromotionFields(variant, promotions),
  }))
  const pricing = summarizePromotionPricing(mappedVariants)

  return {
    id: detail?.id ?? fallback.productId,
    productId: detail?.id ?? fallback.productId,
    name: detail?.name ?? fallback.name,
    slug: detail?.slug ?? fallback.slug,
    category: fallback.category ?? fallback.typeName ?? 'Chăm sóc da',
    image: getProductImage(detail) ?? fallback.image,
    price: mappedVariants.length ? pricing.price : fallback.price,
    priceMax: mappedVariants.length ? pricing.priceMax : fallback.priceMax,
    originalPrice: mappedVariants.length ? pricing.originalPrice : fallback.originalPrice ?? fallback.price,
    originalPriceMax: mappedVariants.length ? pricing.originalPriceMax : fallback.originalPriceMax ?? fallback.priceMax,
    onPromotion: pricing.onPromotion,
    promotionLabel: pricing.promotionLabel,
    productPromotions: promotions,
    brandName: detail?.brandName ?? fallback.brandName ?? '',
    ingredients: mapSemanticReferences(detail?.ingredients),
    skinTypes: mapSemanticReferences(detail?.skinTypes),
    concerns: mapSemanticReferences(detail?.concerns),
    tags: mapSemanticReferences(detail?.tags),
    description: detail?.descriptionMd || detail?.shortDescription || fallback.description || '',
    rating: fallback.rating ?? 0,
    reviews: fallback.reviews ?? 0,
    soldCount: fallback.soldCount ?? 0,
    variants: mappedVariants,
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

