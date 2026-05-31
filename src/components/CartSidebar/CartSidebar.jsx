import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Minus, Plus, Trash2, X } from 'lucide-react'
import { useCart } from '../../context/CartProvider'
import { formatCurrency } from '../../utils/format'

const CartSidebar = () => {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, totalPrice, setIsCheckoutOpen, cartItemCount } = useCart()

  return (
    <AnimatePresence>
      {isCartOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay-backdrop"
            onClick={() => setIsCartOpen(false)}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-background shadow-2xl sm:w-[28rem]"
          >
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="font-display text-xl font-semibold text-foreground">Giỏ hàng ({cartItemCount})</h2>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
              >
                <X size={20} className="text-foreground" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="mb-2 text-muted-foreground">Giỏ hàng của bạn đang trống</p>
                  <p className="text-sm text-muted-foreground">Hãy thêm sản phẩm từ danh mục để bắt đầu.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.variantId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      layout
                      className="flex gap-4"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-foreground">{item.name}</h3>
                        <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.variantLabel}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-semibold ${item.onPromotion ? 'text-rose-700' : 'text-foreground'}`}>{formatCurrency(item.price)}</p>
                          {item.onPromotion ? <span className="text-xs text-muted-foreground line-through">{formatCurrency(item.originalPrice)}</span> : null}
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center border border-border">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              className="cursor-pointer p-1.5 transition-colors hover:bg-muted"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-3 text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              className="cursor-pointer p-1.5 transition-colors hover:bg-muted"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.variantId)}
                            className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {items.length > 0 ? (
              <div className="space-y-4 border-t border-border p-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-semibold text-foreground">{formatCurrency(totalPrice)}</span>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsCartOpen(false)
                    setIsCheckoutOpen(true)
                  }}
                  className="flex w-full items-center justify-center gap-2 bg-foreground py-4 text-sm uppercase tracking-widest text-background transition-colors duration-300 hover:bg-accent hover:text-accent-foreground"
                >
                  Thanh toán
                  <ArrowRight size={16} />
                </motion.button>
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

export default CartSidebar
