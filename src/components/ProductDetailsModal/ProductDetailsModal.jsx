import { AnimatePresence, motion } from 'framer-motion'
import { Heart, LoaderCircle, Minus, Plus, ShoppingBag, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import { getProductDetail, mapProductDetailToSelection } from '../../services/catalog'
import { formatCurrency, formatRating } from '../../utils/format'

const ProductDetailsModal = ({ product, onClose }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { addToCart } = useCart()
  const [detailProduct, setDetailProduct] = useState(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!product?.productId) {
      return
    }

    let isSubscribed = true

    const loadProductDetail = async () => {
      setIsLoading(true)
      setErrorMessage('')
      setQuantity(1)

      try {
        const detail = await getProductDetail(product.productId)
        if (!isSubscribed) {
          return
        }

        const resolvedProduct = mapProductDetailToSelection(detail, product)
        setDetailProduct(resolvedProduct)
        setSelectedVariantId(resolvedProduct.variants[0]?.id ?? '')
      } catch (error) {
        if (isSubscribed) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    loadProductDetail()

    return () => {
      isSubscribed = false
    }
  }, [product])

  const selectedVariant = useMemo(
    () => detailProduct?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [detailProduct?.variants, selectedVariantId],
  )

  const maxAllowedQuantity = Math.max(1, Number(selectedVariant?.stockQuantity ?? 1))

  const handleAdd = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập trước khi mua hàng.')
      onClose()
      navigate('/login', { replace: true })
      return
    }

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="overlay-backdrop"
        onClick={onClose}
      />

      <motion.div
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
                  No Preview
                </div>
              )}
              <button type="button" className="absolute left-4 top-4 rounded-full bg-background/90 p-3 backdrop-blur-sm">
                <Heart size={18} fill="currentColor" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
              <p className="mb-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">{detailProduct.category}</p>
              <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">{detailProduct.name}</h2>

              <div className="mb-4 mt-3 flex items-center gap-2">
                <div className="flex text-accent">
                  <Star size={14} fill="currentColor" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatRating(detailProduct.rating)} - {detailProduct.reviews} đánh giá
                </span>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <span className="font-display text-3xl font-semibold text-foreground">
                  {formatCurrency(selectedVariant?.price ?? detailProduct.variants[0]?.price ?? 0)}
                </span>
                {selectedVariant ? (
                  <span className="text-sm text-muted-foreground">Kho còn {selectedVariant.stockQuantity}</span>
                ) : null}
              </div>

              <p className="mb-6 text-sm leading-7 text-muted-foreground">
                {detailProduct.description || 'Sản phẩm đã được đồng bộ từ backend. Hãy chọn biến thể phù hợp trước khi thêm vào giỏ.'}
              </p>

              <div className="mb-6">
                <p className="mb-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">Biến thể khả dụng</p>
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
                        <div>
                          <p className="font-semibold text-foreground">{variant.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">SKU: {variant.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{formatCurrency(variant.price)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Tồn kho {variant.stockQuantity}</p>
                        </div>
                      </div>
                    </button>
                  ))}
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

                <motion.button
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
                </motion.button>
              </div>
            </div>
          </>
        ) : null}
      </motion.div>
    </AnimatePresence>
  )
}

export default ProductDetailsModal
