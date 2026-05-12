import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthProvider'

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
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setItems(readStoredCart(user?.userId))
  }, [user?.userId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(getCartStorageKey(user?.userId), JSON.stringify(items))
  }, [items, user?.userId])

  const addToCart = useCallback((product, variant, quantity) => {
    setItems((previousItems) => {
      const existingItem = previousItems.find((item) => item.variantId === variant.id)

      if (existingItem) {
        return previousItems.map((item) =>
          item.variantId === variant.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                stockQuantity: variant.stockQuantity,
                image: variant.image || product.image,
                price: variant.price,
              }
            : item,
        )
      }

      return [
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
          price: variant.price,
          quantity,
          stockQuantity: variant.stockQuantity,
        },
      ]
    })

    setIsCartOpen(true)
  }, [])

  const removeFromCart = useCallback((variantId) => {
    setItems((previousItems) => previousItems.filter((item) => item.variantId !== variantId))
  }, [])

  const updateQuantity = useCallback((variantId, quantity) => {
    if (quantity <= 0) {
      setItems((previousItems) => previousItems.filter((item) => item.variantId !== variantId))
      return
    }

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.variantId === variantId
          ? {
              ...item,
              quantity: Math.min(quantity, item.stockQuantity || quantity),
            }
          : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0), 0),
    [items],
  )

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [items],
  )

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
        totalPrice,
        totalItems,
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
