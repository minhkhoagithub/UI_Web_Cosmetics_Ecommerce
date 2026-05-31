import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from './AuthProvider'
import { removeCartItemRequest, updateCartItemQuantityRequest } from '../services/cart'
import { getProductDetail, mapProductDetailToSelection } from '../services/catalog'
import { getActiveProductPromotionsRequest } from '../services/promotion'
import { getActiveShopperId } from '../services/shopper'

const CartContext = createContext(null)

const CART_STORAGE_PREFIX = 'cosmetics-shop.cart'

const getCartStorageKey = (userId) => `${CART_STORAGE_PREFIX}.${userId || 'guest'}`

const readStoredCart = (userId) => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(getCartStorageKey(userId))
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const previousUserIdRef = useRef(user?.userId ?? '')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [items, setItems] = useState([])
  const itemsRef = useRef([])
  const pendingCartSyncsRef = useRef(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const cartPricingSignature = useMemo(
    () => items.map((item) => `${item.productId || ''}:${item.variantId || ''}`).sort().join('|'),
    [items],
  )
  const applyCartItems = useCallback((nextItems) => {
    itemsRef.current = nextItems
    setItems(nextItems)
  }, [])
  const resolveCartUserId = useCallback(() => getActiveShopperId(user?.userId), [user?.userId])
  const trackCartSync = useCallback((promise) => {
    const trackedPromise = Promise.resolve(promise).finally(() => {
      pendingCartSyncsRef.current.delete(trackedPromise)
    })
    pendingCartSyncsRef.current.add(trackedPromise)
    return trackedPromise
  }, [])
  const flushCartSync = useCallback(async () => {
    await Promise.allSettled(Array.from(pendingCartSyncsRef.current))
  }, [])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    const currentUserId = user?.userId ?? ''
    const previousUserId = previousUserIdRef.current

    if (!previousUserId && currentUserId) {
      const guestItems = readStoredCart()
      const userItems = readStoredCart(currentUserId)

      if (guestItems.length > 0 && userItems.length === 0) {
        applyCartItems(guestItems)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(getCartStorageKey())
        }
        previousUserIdRef.current = currentUserId
        return
      }
    }

    applyCartItems(readStoredCart(currentUserId))
    previousUserIdRef.current = currentUserId
  }, [applyCartItems, user?.userId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(getCartStorageKey(user?.userId), JSON.stringify(items))
  }, [items, user?.userId])

  useEffect(() => {
    if (!cartPricingSignature) {
      return
    }

    let isCancelled = false

    const refreshCartPricing = async () => {
      const productIds = Array.from(new Set(items.map((item) => item.productId).filter(Boolean)))
      if (productIds.length === 0) {
        return
      }

      try {
        const [activePromotions, detailResults] = await Promise.all([
          getActiveProductPromotionsRequest().catch(() => []),
          Promise.allSettled(productIds.map((productId) => getProductDetail(productId))),
        ])

        if (isCancelled) {
          return
        }

        const variantsById = new Map()
        detailResults.forEach((result) => {
          if (result.status !== 'fulfilled') {
            return
          }

          mapProductDetailToSelection(result.value, {}, activePromotions).variants.forEach((variant) => {
            variantsById.set(variant.id, variant)
          })
        })

        setItems((previousItems) => {
          let hasChanged = false
          const nextItems = previousItems.map((item) => {
            const variant = variantsById.get(item.variantId)
            if (!variant) {
              return item
            }

            const finalPrice = Number(variant.discountedPrice ?? variant.price ?? item.price ?? 0)
            const originalPrice = Number(variant.originalPrice ?? variant.price ?? item.originalPrice ?? finalPrice)
            const productDiscountAmount = Math.max(0, originalPrice - finalPrice)
            const nextItem = {
              ...item,
              price: finalPrice,
              originalPrice,
              productDiscountAmount,
              onPromotion: Boolean(variant.onPromotion),
              promotionCode: variant.promotionCode ?? null,
              promotionLabel: variant.promotionLabel ?? '',
              stockQuantity: variant.stockQuantity ?? item.stockQuantity,
              image: variant.image || item.image,
            }

            if (
              Number(item.price ?? 0) !== nextItem.price ||
              Number(item.originalPrice ?? item.price ?? 0) !== nextItem.originalPrice ||
              Number(item.productDiscountAmount ?? 0) !== nextItem.productDiscountAmount ||
              Boolean(item.onPromotion) !== nextItem.onPromotion ||
              item.promotionCode !== nextItem.promotionCode ||
              item.promotionLabel !== nextItem.promotionLabel
            ) {
              hasChanged = true
            }

            return nextItem
          })

          const resolvedItems = hasChanged ? nextItems : previousItems
          itemsRef.current = resolvedItems
          return resolvedItems
        })
      } catch {
        // Cart pricing stays usable with the saved snapshot if promotion refresh is unavailable.
      }
    }

    refreshCartPricing()

    return () => {
      isCancelled = true
    }
  }, [cartPricingSignature])

  const rollbackCartItems = useCallback(
    (expectedItems, previousItems, message) => {
      if (itemsRef.current === expectedItems) {
        applyCartItems(previousItems)
      }
      toast.error(message)
    },
    [applyCartItems],
  )

  const addToCart = useCallback((product, variant, quantity) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1)
    const finalPrice = Number(variant.discountedPrice ?? variant.price ?? 0)
    const originalPrice = Number(variant.originalPrice ?? variant.price ?? finalPrice)
    const productDiscountAmount = Math.max(0, originalPrice - finalPrice)

    const previousItems = itemsRef.current
    const existingItem = previousItems.find((item) => item.variantId === variant.id)
    const nextQuantity = Number(existingItem?.quantity ?? 0) + safeQuantity
    const nextItems = existingItem
      ? previousItems.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: nextQuantity,
                stockQuantity: variant.stockQuantity,
                image: variant.image || product.image,
                price: finalPrice,
                originalPrice,
                productDiscountAmount,
                onPromotion: Boolean(variant.onPromotion),
                promotionCode: variant.promotionCode ?? null,
                promotionLabel: variant.promotionLabel ?? '',
              }
            : item,
        )
      : [
        ...previousItems,
        {
          id: variant.id,
          productId: product.productId,
          variantId: variant.id,
          name: product.name,
          category: product.category,
          image: variant.image || product.image,
          sku: variant.sku,
          variantLabel: variant.label,
          price: finalPrice,
          originalPrice,
          productDiscountAmount,
          onPromotion: Boolean(variant.onPromotion),
          promotionCode: variant.promotionCode ?? null,
          promotionLabel: variant.promotionLabel ?? '',
          quantity: safeQuantity,
          stockQuantity: variant.stockQuantity,
        },
      ]

    applyCartItems(nextItems)

    trackCartSync(
      updateCartItemQuantityRequest({
        userId: resolveCartUserId(),
        variantId: variant.id,
        quantity: nextQuantity,
      }).catch((error) => {
        rollbackCartItems(
          nextItems,
          previousItems,
          error.message || 'Không thể đồng bộ sản phẩm vừa thêm lên giỏ hàng hệ thống.',
        )
      }),
    )

    setIsCartOpen(true)
  }, [applyCartItems, resolveCartUserId, rollbackCartItems, trackCartSync])

  const removeFromCart = useCallback((variantId) => {
    const previousItems = itemsRef.current
    const nextItems = previousItems.filter((item) => item.variantId !== variantId)

    if (nextItems.length === previousItems.length) {
      return
    }

    applyCartItems(nextItems)

    trackCartSync(
      removeCartItemRequest({
        userId: resolveCartUserId(),
        variantId,
      }).catch((error) => {
        rollbackCartItems(
          nextItems,
          previousItems,
          error.message || 'Không thể đồng bộ thao tác xóa sản phẩm lên giỏ hàng hệ thống.',
        )
      }),
    )
  }, [applyCartItems, resolveCartUserId, rollbackCartItems, trackCartSync])

  const updateQuantity = useCallback((variantId, quantity) => {
    const nextRequestedQuantity = Number(quantity)

    if (nextRequestedQuantity <= 0) {
      removeFromCart(variantId)
      return
    }

    const previousItems = itemsRef.current
    const currentItem = previousItems.find((item) => item.variantId === variantId)

    if (!currentItem) {
      return
    }

    const nextQuantity = Math.min(nextRequestedQuantity, currentItem.stockQuantity || nextRequestedQuantity)
    const nextItems = previousItems.map((item) =>
      item.variantId === variantId
        ? {
            ...item,
            quantity: nextQuantity,
          }
        : item,
    )

    applyCartItems(nextItems)

    trackCartSync(
      updateCartItemQuantityRequest({
        userId: resolveCartUserId(),
        variantId,
        quantity: nextQuantity,
      }).catch((error) => {
        rollbackCartItems(
          nextItems,
          previousItems,
          error.message || 'Không thể đồng bộ số lượng sản phẩm lên giỏ hàng hệ thống.',
        )
      }),
    )
  }, [applyCartItems, removeFromCart, resolveCartUserId, rollbackCartItems, trackCartSync])

  const clearCart = useCallback(() => {
    applyCartItems([])
  }, [applyCartItems])

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0), 0),
    [items],
  )

  const productDiscountTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.productDiscountAmount ?? 0) * Number(item.quantity ?? 0), 0),
    [items],
  )

  const originalTotalPrice = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.originalPrice ?? item.price ?? 0) * Number(item.quantity ?? 0), 0),
    [items],
  )

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [items],
  )

  const cartItemCount = useMemo(() => items.length, [items])

  return (
    <CartContext.Provider
      value={{
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isSearchOpen,
        setIsSearchOpen,
        addToCart,
        items,
        removeFromCart,
        updateQuantity,
        clearCart,
        flushCartSync,
        totalPrice,
        originalTotalPrice,
        productDiscountTotal,
        totalItems,
        cartItemCount,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export default CartProvider

export const useCart = () => {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }

  return context
}
