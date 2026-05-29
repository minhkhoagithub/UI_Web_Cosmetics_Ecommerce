import { AnimatePresence, motion } from 'framer-motion'
import { BadgePercent, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import { addCartItemRequest, archiveActiveCartRequest } from '../../services/cart'
import { quoteShippingFeeRequest } from '../../services/shipping'
import { appendOrderHistoryEntry } from '../../services/orderHistory'
import { placeOrderRequest } from '../../services/order'
import { getMyOrderVouchersRequest, validatePromotionCodeRequest } from '../../services/promotion'
import { getActiveShopperId } from '../../services/shopper'
import { getAddressesRequest } from '../../services/user'
import { formatCurrency } from '../../utils/format'

const inputClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'

const DEFAULT_FORM_VALUES = {
  shipFullName: '',
  shipPhone: '',
  shipAddress: '',
  shipCity: 'TP. Ho Chi Minh',
  shipDistrict: '',
  shipWard: '',
  promotionCode: '',
  shippingMode: 'PROVIDER_API',
  shippingProvider: 'GHTK',
  shippingFee: '',
  paymentMethod: 'COD',
}

const resolveSavedShippingAddress = (addresses = []) => {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return null
  }

  return addresses.find((address) => address?.isDefault) ?? addresses[0] ?? null
}

const sortSavedAddresses = (addresses = []) =>
  [...addresses].sort((left, right) => {
    if (Boolean(left?.isDefault) === Boolean(right?.isDefault)) {
      return 0
    }

    return left?.isDefault ? -1 : 1
  })

const buildShippingFields = ({ user, address } = {}) => ({
  shipFullName: address?.fullName?.trim() || user?.fullName?.trim() || '',
  shipPhone: address?.phone?.trim() || user?.phone?.trim() || '',
  shipAddress: address?.address?.trim() || '',
  shipCity: address?.city?.trim() || 'TP. Ho Chi Minh',
  shipDistrict: address?.district?.trim() || '',
  shipWard: address?.ward?.trim() || '',
})

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

const DEFAULT_SHIPPING_QUOTE_STATE = {
  status: 'idle',
  message: '',
  weightGrams: 0,
}

const DEFAULT_VOUCHER_PREVIEW_STATE = {
  status: 'idle',
  message: '',
  discountAmount: 0,
  promotionCode: '',
}

const DEFAULT_VOUCHER_LIST_STATE = {
  status: 'idle',
  message: '',
}

const formatVoucherDiscount = (voucher) => {
  const percent = voucher?.config?.discountPercent
  if (percent !== undefined && percent !== null) {
    const maxDiscountAmount = voucher?.config?.maxDiscountAmount
    return maxDiscountAmount
      ? `Giảm ${Number(percent)}%, tối đa ${formatCurrency(maxDiscountAmount)}`
      : `Giảm ${Number(percent)}%`
  }

  const amount = voucher?.config?.discountAmount
  if (amount !== undefined && amount !== null) {
    return `Giảm ${formatCurrency(amount)}`
  }

  return 'Voucher'
}

const formatVoucherCondition = (voucher) => {
  const minOrderValue = Number(voucher?.config?.minOrderValue ?? 0)
  return minOrderValue > 0 ? `Đơn từ ${formatCurrency(minOrderValue)}` : 'Không giới hạn giá trị đơn'
}

const MotionDiv = motion.div
const MotionAside = motion.aside

const CheckoutDrawer = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isCheckoutOpen, setIsCheckoutOpen, items, totalPrice, originalTotalPrice, productDiscountTotal, clearCart, flushCartSync } = useCart()
  const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('')
  const [shippingAddressMode, setShippingAddressMode] = useState('new')
  const [savedAddressMessage, setSavedAddressMessage] = useState('')
  const [isLoadingSavedAddress, setIsLoadingSavedAddress] = useState(false)
  const [shippingQuoteState, setShippingQuoteState] = useState(DEFAULT_SHIPPING_QUOTE_STATE)
  const [voucherPreviewState, setVoucherPreviewState] = useState(DEFAULT_VOUCHER_PREVIEW_STATE)
  const [availableVouchers, setAvailableVouchers] = useState([])
  const [voucherListState, setVoucherListState] = useState(DEFAULT_VOUCHER_LIST_STATE)

  const shippingFee = useMemo(() => Number(formValues.shippingFee || 0), [formValues.shippingFee])
  const totalItemQuantity = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    [items],
  )
  const hasPromotionCode = formValues.promotionCode.trim().length > 0
  const voucherDiscountAmount = useMemo(
    () => (voucherPreviewState.status === 'success' ? Number(voucherPreviewState.discountAmount ?? 0) : 0),
    [voucherPreviewState.discountAmount, voucherPreviewState.status],
  )
  const grandTotal = useMemo(
    () => Math.max(0, totalPrice + shippingFee - voucherDiscountAmount),
    [shippingFee, totalPrice, voucherDiscountAmount],
  )
  const isProviderShipping = true
  const isShippingQuoteLoading = shippingQuoteState.status === 'loading'
  const isShippingQuoteReady = shippingQuoteState.status === 'success'
  const isVoucherBlockingCheckout = hasPromotionCode && voucherPreviewState.status !== 'success'
  const checkoutUser = useMemo(
    () => ({
      userId: user?.userId ?? '',
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
    }),
    [user?.fullName, user?.phone, user?.userId],
  )
  const shouldDisableCheckout =
    isSubmitting ||
    items.length === 0 ||
    (isProviderShipping && (!isShippingQuoteReady || isShippingQuoteLoading)) ||
    isVoucherBlockingCheckout

  useEffect(() => {
    if (!isCheckoutOpen) {
      setShippingQuoteState(DEFAULT_SHIPPING_QUOTE_STATE)
      setVoucherPreviewState(DEFAULT_VOUCHER_PREVIEW_STATE)
      return
    }

    let isCancelled = false
    const baseShippingFields = buildShippingFields({ user: checkoutUser })

    setFormValues((previousValues) => ({
      ...previousValues,
      ...baseShippingFields,
      shippingMode: 'PROVIDER_API',
      shippingProvider: 'GHTK',
      shippingFee: '',
      promotionCode: '',
    }))
    setSavedAddresses([])
    setSelectedSavedAddressId('')
    setShippingAddressMode(checkoutUser.userId ? 'saved' : 'new')
    setSavedAddressMessage('')
    setIsLoadingSavedAddress(false)

    if (!checkoutUser.userId) {
      return () => {
        isCancelled = true
      }
    }

    const loadDefaultAddress = async () => {
      setIsLoadingSavedAddress(true)

      try {
        const response = await getAddressesRequest({ userId: checkoutUser.userId })

        if (isCancelled) {
          return
        }

        const normalizedAddresses = sortSavedAddresses(response ?? [])
        const resolvedAddress = resolveSavedShippingAddress(normalizedAddresses)

        if (!resolvedAddress) {
          setSavedAddresses([])
          setSelectedSavedAddressId('')
          setShippingAddressMode('new')
          setSavedAddressMessage('Bạn chưa có địa chỉ mặc định. Vui lòng nhập địa chỉ giao hàng hoặc cập nhật trong hồ sơ.')
          return
        }

        setSavedAddresses(normalizedAddresses)
        setSelectedSavedAddressId(resolvedAddress.id ?? '')
        setShippingAddressMode('saved')
        setSavedAddressMessage(
          resolvedAddress.isDefault
            ? 'Địa chỉ mặc định đã được tự động áp dụng cho đơn hàng này.'
            : 'Đã áp dụng địa chỉ giao hàng đã lưu của bạn.',
        )
        setFormValues((previousValues) => ({
          ...previousValues,
          ...buildShippingFields({ user: checkoutUser, address: resolvedAddress }),
        }))
      } catch {
        if (isCancelled) {
          return
        }

        setSavedAddresses([])
        setSelectedSavedAddressId('')
        setShippingAddressMode('new')
        setSavedAddressMessage('Không thể tải địa chỉ đã lưu lúc này. Bạn có thể nhập nhanh thông tin giao hàng bên dưới.')
      } finally {
        if (!isCancelled) {
          setIsLoadingSavedAddress(false)
        }
      }
    }

    loadDefaultAddress()

    return () => {
      isCancelled = true
    }
  }, [checkoutUser, isCheckoutOpen])

  useEffect(() => {
    if (!isCheckoutOpen) {
      setAvailableVouchers([])
      setVoucherListState(DEFAULT_VOUCHER_LIST_STATE)
      return
    }

    if (!checkoutUser.userId) {
      setAvailableVouchers([])
      setVoucherListState({
        status: 'guest',
        message: 'Đăng nhập để chọn voucher được gán cho tài khoản của bạn.',
      })
      setFormValues((previousValues) =>
        previousValues.promotionCode ? { ...previousValues, promotionCode: '' } : previousValues,
      )
      return
    }

    let isCancelled = false
    setVoucherListState({
      status: 'loading',
      message: 'Đang tải voucher của bạn...',
    })

    const loadMyVouchers = async () => {
      try {
        const vouchers = await getMyOrderVouchersRequest()

        if (isCancelled) {
          return
        }

        setAvailableVouchers(Array.isArray(vouchers) ? vouchers : [])
        setVoucherListState({
          status: 'success',
          message: vouchers?.length ? '' : 'Tài khoản của bạn hiện chưa có voucher nào có thể dùng.',
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        setAvailableVouchers([])
        setVoucherListState({
          status: 'error',
          message: error.message,
        })
      }
    }

    loadMyVouchers()

    return () => {
      isCancelled = true
    }
  }, [checkoutUser.userId, isCheckoutOpen])

  useEffect(() => {
    if (!isCheckoutOpen) {
      setVoucherPreviewState(DEFAULT_VOUCHER_PREVIEW_STATE)
      return
    }

    const promotionCode = formValues.promotionCode.trim()

    if (!promotionCode) {
      setVoucherPreviewState(DEFAULT_VOUCHER_PREVIEW_STATE)
      return
    }

    if (!checkoutUser.userId) {
      setVoucherPreviewState({
        status: 'error',
        message: 'Voucher chỉ áp dụng cho tài khoản đã đăng nhập.',
        discountAmount: 0,
        promotionCode,
      })
      return
    }

    if (items.length === 0 || totalPrice <= 0) {
      setVoucherPreviewState({
        status: 'error',
        message: 'Giỏ hàng cần có sản phẩm để áp dụng mã khuyến mãi.',
        discountAmount: 0,
        promotionCode,
      })
      return
    }

    let isCancelled = false
    setVoucherPreviewState({
      status: 'loading',
      message: 'Đang kiểm tra mã khuyến mãi...',
      discountAmount: 0,
      promotionCode,
    })

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await validatePromotionCodeRequest({
          promotionCode,
          subtotal: totalPrice,
          items: items.map((item) => ({
            variantId: item.variantId,
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.price ?? 0),
            lineTotal: Number(item.price ?? 0) * Number(item.quantity ?? 0),
          })),
        })

        if (isCancelled) {
          return
        }

        const discountAmount = Math.max(0, Number(result?.discountAmount ?? 0))
        setVoucherPreviewState({
          status: 'success',
          message: 'Mã khuyến mãi đã được áp dụng.',
          discountAmount,
          promotionCode: result?.promotionCode ?? promotionCode,
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        setVoucherPreviewState({
          status: 'error',
          message: error.message,
          discountAmount: 0,
          promotionCode,
        })
      }
    }, 350)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [checkoutUser.userId, formValues.promotionCode, isCheckoutOpen, items, totalPrice])

  useEffect(() => {
    if (!isCheckoutOpen) {
      return
    }

    if (!isProviderShipping) {
      setShippingQuoteState(DEFAULT_SHIPPING_QUOTE_STATE)
      return
    }

    if (items.length === 0 || totalPrice <= 0 || totalItemQuantity <= 0) {
      setShippingQuoteState({
        status: 'error',
        message: 'Giỏ hàng cần có sản phẩm để tính phí vận chuyển GHTK.',
        weightGrams: 0,
      })
      setFormValues((previousValues) =>
        previousValues.shippingFee === '' ? previousValues : { ...previousValues, shippingFee: '' },
      )
      return
    }

    if (!formValues.shipCity.trim() || !formValues.shipDistrict.trim()) {
      setShippingQuoteState({
        status: 'needs-address',
        message: 'Nhập ít nhất tỉnh/thành phố và quận/huyện để hệ thống tính phí GHTK.',
        weightGrams: 0,
      })
      setFormValues((previousValues) =>
        previousValues.shippingFee === '' ? previousValues : { ...previousValues, shippingFee: '' },
      )
      return
    }

    let isCancelled = false
    setFormValues((previousValues) =>
      previousValues.shippingFee === '' ? previousValues : { ...previousValues, shippingFee: '' },
    )
    setShippingQuoteState({
      status: 'loading',
      message: 'Đang tính phí vận chuyển từ GHTK...',
      weightGrams: 0,
    })
    const timeoutId = window.setTimeout(async () => {
      try {
        const quote = await quoteShippingFeeRequest({
          shippingProvider: formValues.shippingProvider,
          shipAddress: formValues.shipAddress,
          shipCity: formValues.shipCity,
          shipDistrict: formValues.shipDistrict,
          shipWard: formValues.shipWard,
          orderValue: totalPrice,
          itemQuantity: totalItemQuantity,
        })

        if (isCancelled) {
          return
        }

        setFormValues((previousValues) => ({
          ...previousValues,
          shippingFee: String(quote.fee ?? ''),
        }))
        setShippingQuoteState({
          status: quote.deliverySupported ? 'success' : 'unsupported',
          message:
            quote.message ||
            (quote.deliverySupported
              ? 'Đã cập nhật phí vận chuyển từ GHTK.'
              : 'GHTK hiện chưa hỗ trợ giao đến khu vực này.'),
          weightGrams: Number(quote.weightGrams ?? 0),
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        setFormValues((previousValues) => ({
          ...previousValues,
          shippingFee: '',
        }))
        setShippingQuoteState({
          status: 'error',
          message: error.message,
          weightGrams: 0,
        })
      }
    }, 500)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    formValues.shipAddress,
    formValues.shipCity,
    formValues.shipDistrict,
    formValues.shipWard,
    formValues.shippingProvider,
    isCheckoutOpen,
    isProviderShipping,
    items.length,
    totalItemQuantity,
    totalPrice,
  ])

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
    }))
  }

  const handleSelectVoucher = (promotionCode) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      promotionCode: previousValues.promotionCode === promotionCode ? '' : promotionCode,
    }))
  }

  const handleSelectSavedAddress = (address) => {
    if (!address) {
      return
    }

    setShippingAddressMode('saved')
    setSelectedSavedAddressId(address.id ?? '')
    setSavedAddressMessage(
      address.isDefault
        ? 'Địa chỉ mặc định đã được áp dụng cho đơn hàng này.'
        : 'Đã chuyển sang một địa chỉ đã lưu khác trong danh sách của bạn.',
    )
    setFormValues((previousValues) => ({
      ...previousValues,
      ...buildShippingFields({ user: checkoutUser, address }),
    }))
  }

  const handleUseNewAddress = () => {
    setShippingAddressMode('new')
    setSelectedSavedAddressId('')
    setSavedAddressMessage('Bạn đang nhập một địa chỉ mới cho đơn hàng này.')
    setFormValues((previousValues) => ({
      ...previousValues,
      ...buildShippingFields({ user: checkoutUser }),
    }))
  }

  const defaultSavedAddress = useMemo(
    () => savedAddresses.find((address) => address?.isDefault) ?? savedAddresses[0] ?? null,
    [savedAddresses],
  )

  const handleCheckout = async (event) => {
    event.preventDefault()

    if (items.length === 0) {
      toast.error('Giỏ hàng của bạn đang trống.')
      return
    }

    if (isVoucherBlockingCheckout) {
      toast.error(voucherPreviewState.message || 'Mã khuyến mãi chưa hợp lệ.')
      return
    }

    const shopperId = getActiveShopperId(user?.userId)
    setIsSubmitting(true)

    try {
      await flushCartSync()
      await archiveActiveCartRequest({ userId: shopperId }).catch(() => null)

      for (const item of items) {
        await addCartItemRequest({
          userId: shopperId,
          variantId: item.variantId,
          quantity: item.quantity,
        })
      }

      const orderResult = await placeOrderRequest({
        userId: shopperId,
        promotionCode: formValues.promotionCode || null,
        shipFullName: formValues.shipFullName.trim(),
        shipPhone: formValues.shipPhone.trim(),
        shipAddress: formValues.shipAddress.trim(),
        shipCity: formValues.shipCity.trim(),
        shipDistrict: formValues.shipDistrict.trim(),
        shipWard: formValues.shipWard.trim(),
        shippingMode: 'PROVIDER_API',
        shippingProvider: 'GHTK',
        shippingFee,
        paymentMethod: formValues.paymentMethod,
      })

      appendOrderHistoryEntry(shopperId, {
        orderId: orderResult.orderId,
        orderNo: orderResult.orderNo,
        paymentMethod: formValues.paymentMethod,
        receiverName: formValues.shipFullName.trim(),
        totalAmount: grandTotal,
        createdAt: new Date().toISOString(),
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
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay-backdrop"
            onClick={handleClose}
          />

          <MotionAside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Thanh toán an toàn</p>
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
              <form id="checkout-form" onSubmit={handleCheckout} className="overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Giao hàng</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Thông tin người nhận</h3>
                    </div>

                    {user?.userId ? (
                      <div className="rounded-3xl border border-border bg-secondary/45 px-4 py-4 text-sm">
                        {isLoadingSavedAddress ? (
                          <p className="text-muted-foreground">Đang tải thông tin giao hàng đã lưu...</p>
                        ) : (
                          <>
                            <p className="font-medium text-foreground">
                              {savedAddressMessage || 'Thông tin tài khoản của bạn đã được điền sẵn cho checkout.'}
                            </p>

                            {savedAddresses.length > 0 ? (
                              <>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {defaultSavedAddress ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectSavedAddress(defaultSavedAddress)}
                                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                        shippingAddressMode === 'saved' && selectedSavedAddressId === defaultSavedAddress.id
                                          ? 'bg-foreground text-primary-foreground'
                                          : 'border border-border text-foreground hover:border-foreground'
                                      }`}
                                    >
                                      Dùng địa chỉ mặc định
                                    </button>
                                  ) : null}

                                  <button
                                    type="button"
                                    onClick={handleUseNewAddress}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                      shippingAddressMode === 'new'
                                        ? 'bg-foreground text-primary-foreground'
                                        : 'border border-border text-foreground hover:border-foreground'
                                    }`}
                                  >
                                    Nhập địa chỉ mới
                                  </button>
                                </div>

                                <div className="mt-4 space-y-3">
                                  {savedAddresses.map((address) => {
                                    const isSelected =
                                      shippingAddressMode === 'saved' && selectedSavedAddressId === address.id

                                    return (
                                      <button
                                        key={address.id}
                                        type="button"
                                        onClick={() => handleSelectSavedAddress(address)}
                                        className={`block w-full rounded-3xl border px-4 py-4 text-left transition ${
                                          isSelected
                                            ? 'border-foreground bg-background'
                                            : 'border-border bg-background/70 hover:border-foreground/50'
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-semibold text-foreground">{address.fullName}</p>
                                          {address.isDefault ? (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                              Mặc định
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-2 text-muted-foreground">{address.phone}</p>
                                        <p className="mt-1 text-muted-foreground">
                                          {address.address}, {address.ward}, {address.district}, {address.city}
                                        </p>
                                      </button>
                                    )
                                  })}
                                </div>
                              </>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                setIsCheckoutOpen(false)
                                navigate('/profile')
                              }}
                              className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:text-accent"
                            >
                              Quản lý địa chỉ trong hồ sơ
                            </button>

                            {shippingAddressMode === 'new' ? (
                              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                Địa chỉ mới bạn nhập bên dưới sẽ chỉ áp dụng cho đơn hàng này. Nếu muốn lưu vào hồ sơ, hãy thêm trong trang quản lý địa chỉ.
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}

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
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Tính phí vận chuyển tự động</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className={`${inputClassName} flex items-center bg-secondary/45 text-foreground`}>
                        Giao Hàng Tiết Kiệm (GHTK)
                      </div>
                      <div className={`${inputClassName} flex items-center bg-secondary/45 text-foreground`}>
                        {shippingFee > 0 ? formatCurrency(shippingFee) : 'Đang chờ tính phí vận chuyển'}
                      </div>

                      <div className="rounded-3xl border border-border bg-secondary/45 px-4 py-4 sm:col-span-2">
                        <div className="flex items-start gap-3">
                          <BadgePercent size={20} className="mt-0.5 text-foreground" />
                          <div>
                            <p className="font-semibold text-foreground">Voucher tài khoản</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              Mỗi đơn hàng chỉ được chọn một voucher hóa đơn. Voucher chỉ áp dụng cho tài khoản được admin gán.
                            </p>
                          </div>
                        </div>

                        {voucherListState.message ? (
                          <p
                            className={`mt-3 text-sm leading-6 ${
                              voucherListState.status === 'error' ? 'text-rose-700' : 'text-muted-foreground'
                            }`}
                          >
                            {voucherListState.message}
                          </p>
                        ) : null}

                        {checkoutUser.userId && availableVouchers.length > 0 ? (
                          <div className="mt-4 space-y-3">
                            {availableVouchers.map((voucher) => {
                              const isSelected = formValues.promotionCode === voucher.code

                              return (
                                <label
                                  key={voucher.id || voucher.code}
                                  className={`block cursor-pointer rounded-3xl border px-4 py-4 transition ${
                                    isSelected
                                      ? 'border-foreground bg-background'
                                      : 'border-border bg-background/70 hover:border-foreground/50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="promotionCode"
                                    value={voucher.code}
                                    checked={isSelected}
                                    onChange={() => handleSelectVoucher(voucher.code)}
                                    className="sr-only"
                                  />
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-semibold text-foreground">{voucher.code}</p>
                                      <p className="mt-1 text-sm text-muted-foreground">{voucher.name}</p>
                                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                                        {formatVoucherDiscount(voucher)}
                                      </p>
                                    </div>
                                    <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                                      {formatVoucherCondition(voucher)}
                                    </span>
                                  </div>
                                </label>
                              )
                            })}

                            {formValues.promotionCode ? (
                              <button
                                type="button"
                                className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:text-accent"
                                onClick={() => handleSelectVoucher(formValues.promotionCode)}
                              >
                                Không dùng voucher
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={`rounded-3xl border px-4 py-4 text-sm leading-6 ${
                        shippingQuoteState.status === 'error' || shippingQuoteState.status === 'unsupported'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-border bg-secondary/45 text-muted-foreground'
                      }`}
                    >
                      <p
                        className={`font-medium ${
                          shippingQuoteState.status === 'error' || shippingQuoteState.status === 'unsupported'
                            ? 'text-rose-700'
                            : 'text-foreground'
                        }`}
                      >
                        {shippingQuoteState.message || 'Nhập địa chỉ giao hàng để hệ thống tự động lấy phí vận chuyển GHTK.'}
                      </p>
                      {shippingQuoteState.weightGrams > 0 ? (
                        <p className="mt-1">
                          Khối lượng tạm tính gửi GHTK: {shippingQuoteState.weightGrams}g.
                        </p>
                      ) : null}
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
                        {Number(item.productDiscountAmount ?? 0) > 0 ? (
                          <div className="mt-1 flex items-center justify-between text-xs">
                            <span className="text-rose-700">{item.promotionLabel || 'Khuyến mãi'}</span>
                            <span className="text-muted-foreground line-through">{formatCurrency(item.originalPrice * item.quantity)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 rounded-3xl bg-background p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span className="font-medium text-foreground">{formatCurrency(originalTotalPrice || totalPrice)}</span>
                  </div>
                  {productDiscountTotal > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Giảm giá sản phẩm</span>
                      <span className="font-medium text-rose-700">-{formatCurrency(productDiscountTotal)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính sau KM</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
                  </div>
                  {hasPromotionCode ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Voucher</span>
                        <span
                          className={
                            voucherPreviewState.status === 'success'
                              ? 'font-medium text-rose-700'
                              : 'font-medium text-muted-foreground'
                          }
                        >
                          {voucherPreviewState.status === 'success'
                            ? `-${formatCurrency(voucherDiscountAmount)}`
                            : voucherPreviewState.status === 'loading'
                              ? 'Đang kiểm tra'
                              : 'Chưa áp dụng'}
                        </span>
                      </div>
                      {voucherPreviewState.message ? (
                        <p
                          className={`text-xs leading-5 ${
                            voucherPreviewState.status === 'error' ? 'text-rose-700' : 'text-muted-foreground'
                          }`}
                        >
                          {voucherPreviewState.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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
                  form="checkout-form"
                  type="submit"
                  disabled={shouldDisableCheckout}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold uppercase tracking-[0.22em] transition ${
                    shouldDisableCheckout
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
          </MotionAside>
        </>
      ) : null}
    </AnimatePresence>
  )
}

export default CheckoutDrawer
