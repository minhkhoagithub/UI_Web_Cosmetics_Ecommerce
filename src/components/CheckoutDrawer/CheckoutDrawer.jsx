import { AnimatePresence, motion } from 'framer-motion'
import { LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import { addCartItemRequest, archiveActiveCartRequest } from '../../services/cart'
import { placeOrderRequest } from '../../services/order'
import { formatCurrency } from '../../utils/format'

const inputClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'

const PAYMENT_METHODS = [
  {
    value: 'COD',
    label: 'COD',
    description: 'Đặt hàng trước, thanh toán khi nhận hàng.',
  },
  {
    value: 'VNPAY',
    label: 'VNPAY',
    description: 'Chuyển sang cổng VNPAY và theo dõi trạng thái trực tiếp trong app.',
  },
  {
    value: 'SEPAY',
    label: 'SEPAY',
    description: 'Nhận QR và nội dung chuyển khoản để thanh toán ngay.',
  },
]

const SHIPPING_MODES = [
  { value: 'STANDARD', label: 'Giao hàng tiêu chuẩn' },
  { value: 'EXPRESS', label: 'Giao hàng hoả tốc' },
  { value: 'HCM_FLAT', label: 'Đồng giá nội thành HCM' },
  { value: 'PROVIDER_API', label: 'Giao qua đơn vị vận chuyển' },
]

const CheckoutDrawer = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { isCheckoutOpen, setIsCheckoutOpen, items, totalPrice, clearCart } = useCart()
  const [formValues, setFormValues] = useState({
    shipFullName: '',
    shipPhone: '',
    shipAddress: '',
    shipCity: 'TP. Hồ Chí Minh',
    shipDistrict: '',
    shipWard: '',
    promotionCode: '',
    shippingMode: 'STANDARD',
    shippingProvider: 'GHTK',
    shippingFee: '30000',
    paymentMethod: 'COD',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shippingFee = useMemo(() => Number(formValues.shippingFee || 0), [formValues.shippingFee])
  const grandTotal = useMemo(() => totalPrice + shippingFee, [shippingFee, totalPrice])

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    setIsCheckoutOpen(false)
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((previousValues) => ({
      ...previousValues,
      [name]: value,
      ...(name === 'shippingMode' && value !== 'PROVIDER_API' ? { shippingProvider: 'GHTK' } : {}),
    }))
  }

  const handleCheckout = async (event) => {
    event.preventDefault()

    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để tiếp tục đặt hàng.')
      setIsCheckoutOpen(false)
      navigate('/login', { replace: true })
      return
    }

    if (!user?.userId) {
      toast.error('Không thể xác định người dùng hiện tại.')
      return
    }

    if (items.length === 0) {
      toast.error('Giỏ hàng của bạn đang trống.')
      return
    }

    setIsSubmitting(true)

    try {
      await archiveActiveCartRequest({ userId: user.userId }).catch(() => null)

      for (const item of items) {
        await addCartItemRequest({
          userId: user.userId,
          variantId: item.variantId,
          quantity: item.quantity,
        })
      }

      const orderResult = await placeOrderRequest({
        userId: user.userId,
        promotionCode: formValues.promotionCode || null,
        shipFullName: formValues.shipFullName.trim(),
        shipPhone: formValues.shipPhone.trim(),
        shipAddress: formValues.shipAddress.trim(),
        shipCity: formValues.shipCity.trim(),
        shipDistrict: formValues.shipDistrict.trim(),
        shipWard: formValues.shipWard.trim(),
        shippingMode: formValues.shippingMode,
        shippingProvider: formValues.shippingMode === 'PROVIDER_API' ? formValues.shippingProvider : null,
        shippingFee,
        paymentMethod: formValues.paymentMethod,
      })

      clearCart()
      setIsCheckoutOpen(false)

      toast.success('Đơn hàng đã được tạo thành công.')

      const searchParams = new URLSearchParams({
        orderId: orderResult.orderId,
        orderNo: orderResult.orderNo,
        method: formValues.paymentMethod,
      })

      navigate(`/payment-status?${searchParams.toString()}`)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isCheckoutOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay-backdrop"
            onClick={handleClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Secure Checkout</p>
                <h2 className="font-display text-2xl font-semibold text-foreground">Hoàn tất đơn hàng</h2>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_0.8fr]">
              <form onSubmit={handleCheckout} className="overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Giao hàng</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Thông tin người nhận</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        name="shipFullName"
                        value={formValues.shipFullName}
                        onChange={handleChange}
                        placeholder="Họ và tên người nhận"
                        className={`${inputClassName} sm:col-span-2`}
                        required
                      />
                      <input
                        name="shipPhone"
                        value={formValues.shipPhone}
                        onChange={handleChange}
                        placeholder="Số điện thoại"
                        className={inputClassName}
                        required
                      />
                      <input
                        name="shipCity"
                        value={formValues.shipCity}
                        onChange={handleChange}
                        placeholder="Tỉnh / Thành phố"
                        className={inputClassName}
                        required
                      />
                      <input
                        name="shipDistrict"
                        value={formValues.shipDistrict}
                        onChange={handleChange}
                        placeholder="Quận / Huyện"
                        className={inputClassName}
                        required
                      />
                      <input
                        name="shipWard"
                        value={formValues.shipWard}
                        onChange={handleChange}
                        placeholder="Phường / Xã"
                        className={inputClassName}
                        required
                      />
                      <textarea
                        name="shipAddress"
                        value={formValues.shipAddress}
                        onChange={handleChange}
                        placeholder="Số nhà, tên đường, tòa nhà..."
                        className={`${inputClassName} min-h-28 resize-none sm:col-span-2`}
                        required
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Vận chuyển</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Cấu hình giao hàng</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <select
                        name="shippingMode"
                        value={formValues.shippingMode}
                        onChange={handleChange}
                        className={inputClassName}
                      >
                        {SHIPPING_MODES.map((mode) => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>

                      <input
                        name="shippingFee"
                        value={formValues.shippingFee}
                        onChange={handleChange}
                        type="number"
                        min="1"
                        step="1000"
                        className={inputClassName}
                        placeholder="Phí vận chuyển"
                        required
                      />

                      {formValues.shippingMode === 'PROVIDER_API' ? (
                        <select
                          name="shippingProvider"
                          value={formValues.shippingProvider}
                          onChange={handleChange}
                          className={`${inputClassName} sm:col-span-2`}
                        >
                          <option value="GHTK">Giao Hàng Tiết Kiệm</option>
                        </select>
                      ) : null}

                      <input
                        name="promotionCode"
                        value={formValues.promotionCode}
                        onChange={handleChange}
                        placeholder="Mã khuyến mãi (nếu có)"
                        className={`${inputClassName} sm:col-span-2`}
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Thanh toán</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Chọn phương thức phù hợp</h3>
                    </div>

                    <div className="space-y-3">
                      {PAYMENT_METHODS.map((method) => (
                        <label
                          key={method.value}
                          className={`block rounded-3xl border px-4 py-4 transition-colors ${
                            formValues.paymentMethod === method.value
                              ? 'border-foreground bg-secondary'
                              : 'border-border hover:border-foreground/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.value}
                            checked={formValues.paymentMethod === method.value}
                            onChange={handleChange}
                            className="sr-only"
                          />
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-foreground">{method.label}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{method.description}</p>
                            </div>
                            <ShieldCheck size={18} className="mt-1 text-foreground" />
                          </div>
                        </label>
                      ))}
                    </div>
                  </section>
                </div>
              </form>

              <div className="border-t border-border bg-secondary/45 px-6 py-6 lg:border-l lg:border-t-0">
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Đơn hàng của bạn</p>
                <div className="mt-5 space-y-4">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4 rounded-3xl bg-background p-4">
                      <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{item.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.variantLabel}</p>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">SL {item.quantity}</span>
                          <span className="font-semibold text-foreground">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 rounded-3xl bg-background p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phí vận chuyển</span>
                    <span className="font-medium text-foreground">{formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold text-foreground">Tổng cộng</span>
                    <span className="font-display text-2xl font-semibold text-foreground">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={handleCheckout}
                  disabled={isSubmitting || items.length === 0}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold uppercase tracking-[0.22em] transition ${
                    isSubmitting || items.length === 0
                      ? 'cursor-not-allowed bg-foreground/60 text-primary-foreground'
                      : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                  {isSubmitting ? 'Đang tạo đơn hàng' : 'Xác nhận đặt hàng'}
                </button>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Khi bấm xác nhận, app sẽ đồng bộ giỏ hàng hiện tại lên backend, tạo đơn hàng và chuyển bạn sang bước theo dõi thanh toán.
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

export default CheckoutDrawer
