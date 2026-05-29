import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Heart, LoaderCircle, Minus, Plus, ShoppingBag, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCart } from '../../context/CartProvider'
import { getProductDetail, mapProductDetailToSelection, rememberRecentProduct } from '../../services/catalog'
import { getActiveProductPromotionsRequest } from '../../services/promotion'
import { getProductReviewsRequest } from '../../services/review'
import { formatCurrency, formatRating } from '../../utils/format'

const semanticTextOf = (item) => {
  const name = String(item?.name ?? '').trim()
  const code = String(item?.code ?? '').trim()

  if (name && code && !name.toLowerCase().includes(code.toLowerCase())) {
    return `${name} (${code})`
  }

  return name || code
}

const ProductDetailsModal = ({ product, onClose }) => {
  const { addToCart } = useCart()
  const [detailProduct, setDetailProduct] = useState(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [reviews, setReviews] = useState([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [hasLoadedReviews, setHasLoadedReviews] = useState(false)

  useEffect(() => {
    if (!product?.productId) {
      return
    }

    let isSubscribed = true

    const loadProductDetail = async () => {
      setIsLoading(true)
      setErrorMessage('')
      setQuantity(1)
      setReviews([])
      setHasLoadedReviews(false)

      try {
        setIsLoadingReviews(true)

        const [detail, nextReviews, activePromotions] = await Promise.all([
          getProductDetail(product.productId),
          getProductReviewsRequest(product.productId),
          getActiveProductPromotionsRequest().catch(() => product.productPromotions ?? []),
        ])

        if (!isSubscribed) {
          return
        }

        const resolvedProduct = mapProductDetailToSelection(detail, product, activePromotions)
        setDetailProduct(resolvedProduct)
        setSelectedVariantId(resolvedProduct.variants[0]?.id ?? '')
        rememberRecentProduct(resolvedProduct)
        setReviews(Array.isArray(nextReviews) ? nextReviews : [])
        setHasLoadedReviews(true)
      } catch (error) {
        if (isSubscribed) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
          setIsLoadingReviews(false)
        }
      }
    }

    loadProductDetail()

    return () => {
      isSubscribed = false
    }
  }, [product])

  const reviewStats = useMemo(() => {
    if (!hasLoadedReviews) {
      return null
    }

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        reviewCount: 0,
      }
    }

    const totalRating = reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0)
    return {
      averageRating: totalRating / reviews.length,
      reviewCount: reviews.length,
    }
  }, [hasLoadedReviews, reviews])

  const selectedVariant = useMemo(
    () => detailProduct?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [detailProduct?.variants, selectedVariantId],
  )

  const displayedRating = reviewStats ? reviewStats.averageRating : detailProduct?.rating ?? 0
  const displayedReviewCount = reviewStats ? reviewStats.reviewCount : detailProduct?.reviews ?? 0
  const maxAllowedQuantity = Math.max(1, Number(selectedVariant?.stockQuantity ?? 1))
  const selectedDisplayPrice =
    selectedVariant?.discountedPrice ??
    selectedVariant?.price ??
    detailProduct?.variants?.[0]?.discountedPrice ??
    detailProduct?.variants?.[0]?.price ??
    0
  const detailAttributeGroups = useMemo(
    () =>
      [
        { key: 'ingredients', title: 'Thành phần', items: detailProduct?.ingredients ?? [] },
        { key: 'skinTypes', title: 'Loại da phù hợp', items: detailProduct?.skinTypes ?? [] },
        { key: 'concerns', title: 'Vấn đề da', items: detailProduct?.concerns ?? [] },
        { key: 'tags', title: 'Nhãn', items: detailProduct?.tags ?? [] },
      ].filter((group) => group.items.length > 0),
    [detailProduct],
  )

  const handleAdd = () => {
    if (!detailProduct || !selectedVariant) {
      toast.error('Sản phẩm hiện chưa sẵn sàng để thêm vào giỏ hàng.')
      return
    }

    if (selectedVariant.stockQuantity <= 0) {
      toast.error('Biến thể này hiện đã hết hàng.')
      return
    }

    addToCart(detailProduct, selectedVariant, quantity)
    toast.success('Đã thêm sản phẩm vào giỏ hàng.')
    setQuantity(1)
    onClose()
  }

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overlay-backdrop"
        onClick={onClose}
      />

      <Motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="fixed inset-4 z-50 flex h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[2rem] bg-background shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[88vh] md:w-[min(72rem,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 transition-colors hover:bg-muted"
        >
          <X size={20} className="text-foreground" />
        </button>

        {isLoading ? (
          <div className="flex h-full min-h-96 w-full items-center justify-center">
            <LoaderCircle className="animate-spin text-foreground" size={28} />
          </div>
        ) : errorMessage ? (
          <div className="flex h-full w-full items-center justify-center p-8 text-center text-rose-600">{errorMessage}</div>
        ) : detailProduct ? (
          <>
            <div className="relative bg-secondary md:w-1/2">
              {selectedVariant?.image || detailProduct.image ? (
                <img
                  src={selectedVariant?.image || detailProduct.image}
                  alt={detailProduct.name}
                  className="h-72 w-full object-cover md:h-full"
                />
              ) : (
                <div className="flex h-72 w-full items-center justify-center bg-secondary text-sm uppercase tracking-[0.28em] text-muted-foreground md:h-full">
                  Chưa có ảnh
                </div>
              )}
              <button type="button" className="absolute left-4 top-4 rounded-full bg-background/90 p-3 backdrop-blur-sm">
                <Heart size={18} fill="currentColor" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                {detailProduct.category}
                {detailProduct.brandName ? ` / ${detailProduct.brandName}` : ''}
              </p>
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">{detailProduct.name}</h2>

              <div className="mb-4 mt-3 flex items-center gap-2">
                <div className="flex text-accent">
                  <Star size={14} fill="currentColor" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatRating(displayedRating)} - {displayedReviewCount} đánh giá
                </span>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <span className={`font-display text-3xl font-semibold ${selectedVariant?.onPromotion ? 'text-rose-700' : 'text-foreground'}`}>
                  {formatCurrency(selectedDisplayPrice)}
                </span>
                {selectedVariant?.onPromotion ? (
                  <>
                    <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{selectedVariant.promotionLabel || 'Khuyến mãi'}</span>
                    <span className="text-sm text-muted-foreground line-through">{formatCurrency(selectedVariant.originalPrice ?? selectedVariant.price)}</span>
                  </>
                ) : null}
                {/* {selectedVariant ? (
                  <span className="text-sm text-muted-foreground">Kho còn {selectedVariant.stockQuantity}</span>
                ) : null} */}
              </div>

              <p className="mb-6 text-sm leading-7 text-muted-foreground">
                {detailProduct.description || 'Sản phẩm đã được đồng bộ từ backend. Hãy chọn biến thể phù hợp trước khi thêm vào giỏ.'}
              </p>

              {detailAttributeGroups.length > 0 ? (
                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  {detailAttributeGroups.map((group) => (
                    <section key={group.key} className="rounded-3xl border border-border bg-secondary/45 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{group.title}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <span
                            key={item.id || `${group.key}-${semanticTextOf(item)}`}
                            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                          >
                            {semanticTextOf(item)}
                          </span>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : null}

              <div className="mb-6">
                <p className="mb-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">Dung lượng khả dụng</p>
                <div className="grid gap-3">
                  {detailProduct.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`rounded-3xl border px-4 py-4 text-left transition ${
                        selectedVariantId === variant.id
                          ? 'border-foreground bg-secondary'
                          : 'border-border hover:border-foreground/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-semibold text-foreground">{variant.label}</p>
                        <div className="text-right">
                          <p className={`font-semibold ${variant.onPromotion ? 'text-rose-700' : 'text-foreground'}`}>{formatCurrency(variant.discountedPrice ?? variant.price)}</p>
                          {variant.onPromotion ? <p className="text-xs text-muted-foreground line-through">{formatCurrency(variant.originalPrice ?? variant.price)}</p> : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8 border-t border-border pt-6">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Đánh giá người dùng</p>

                <div className="mt-6">
                  {isLoadingReviews ? (
                    <div className="flex items-center gap-3 rounded-[1.75rem] border border-border bg-background px-5 py-5 text-sm text-muted-foreground">
                      <LoaderCircle size={18} className="animate-spin" />
                      Đang tải đánh giá mới nhất...
                    </div>
                  ) : reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <article key={review.id} className="rounded-[1.75rem] border border-border bg-background px-5 py-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{review.reviewerName || 'Khách hàng'}</p>
                              <div className="mt-2 flex items-center gap-1 text-accent">
                                {[1, 2, 3, 4, 5].map((starValue) => (
                                  <Star
                                    key={starValue}
                                    size={14}
                                    fill={starValue <= Number(review.rating ?? 0) ? 'currentColor' : 'none'}
                                  />
                                ))}
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {review.createdAt ? new Date(review.createdAt).toLocaleString('vi-VN') : ''}
                            </p>
                          </div>

                          {review.content?.trim() ? (
                            <p className="mt-4 text-sm leading-7 text-muted-foreground">{review.content.trim()}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.75rem] border border-dashed border-border bg-background px-5 py-6 text-sm leading-7 text-muted-foreground">
                      Chưa có đánh giá người dùng nào cho sản phẩm này.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3">
                <div className="flex items-center border border-border">
                  <button
                    type="button"
                    onClick={() => setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((currentQuantity) => Math.min(maxAllowedQuantity, currentQuantity + 1))}
                    className="cursor-pointer p-4 transition-colors hover:bg-muted"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <Motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdd}
                  disabled={!selectedVariant || selectedVariant.stockQuantity <= 0}
                  className={`flex flex-1 items-center justify-center gap-2 py-4 text-sm uppercase tracking-widest transition ${
                    !selectedVariant || selectedVariant.stockQuantity <= 0
                      ? 'cursor-not-allowed bg-foreground/60 text-primary-foreground'
                      : 'bg-foreground text-background hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <ShoppingBag size={16} />
                  Thêm vào giỏ
                </Motion.button>
              </div>
            </div>
          </>
        ) : null}
      </Motion.div>
    </AnimatePresence>
  )
}

export default ProductDetailsModal
