import { AnimatePresence, motion } from 'framer-motion'
import { LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import { addCartItemRequest, archiveActiveCartRequest } from '../../services/cart'
import { appendOrderHistoryEntry } from '../../services/orderHistory'
import { placeOrderRequest } from '../../services/order'
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
  shippingMode: 'STANDARD',
  shippingProvider: 'GHTK',
  shippingFee: '30000',
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
    description: 'Dat hang truoc, thanh toan khi nhan hang.',
  },
  {
    value: 'VNPAY',
    label: 'VNPAY',
    description: 'Chuyen sang cong VNPAY va theo doi trang thai truc tiep trong app.',
  },
  {
    value: 'SEPAY',
    label: 'SEPAY',
    description: 'Nhan QR va noi dung chuyen khoan de thanh toan ngay.',
  },
]

const SHIPPING_MODES = [
  { value: 'STANDARD', label: 'Giao hang tieu chuan' },
  { value: 'EXPRESS', label: 'Giao hang hoa toc' },
  { value: 'HCM_FLAT', label: 'Dong gia noi thanh HCM' },
  { value: 'PROVIDER_API', label: 'Giao qua don vi van chuyen' },
]

const CheckoutDrawer = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isCheckoutOpen, setIsCheckoutOpen, items, totalPrice, clearCart } = useCart()
  const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('')
  const [shippingAddressMode, setShippingAddressMode] = useState('new')
  const [savedAddressMessage, setSavedAddressMessage] = useState('')
  const [isLoadingSavedAddress, setIsLoadingSavedAddress] = useState(false)

  const shippingFee = useMemo(() => Number(formValues.shippingFee || 0), [formValues.shippingFee])
  const grandTotal = useMemo(() => totalPrice + shippingFee, [shippingFee, totalPrice])

  useEffect(() => {
    if (!isCheckoutOpen) {
      return
    }

    let isCancelled = false
    const baseShippingFields = buildShippingFields({ user })

    setFormValues((previousValues) => ({
      ...previousValues,
      ...baseShippingFields,
    }))
    setSavedAddresses([])
    setSelectedSavedAddressId('')
    setShippingAddressMode(user?.userId ? 'saved' : 'new')
    setSavedAddressMessage('')
    setIsLoadingSavedAddress(false)

    if (!user?.userId) {
      return () => {
        isCancelled = true
      }
    }

    const loadDefaultAddress = async () => {
      setIsLoadingSavedAddress(true)

      try {
        const response = await getAddressesRequest({ userId: user.userId })

        if (isCancelled) {
          return
        }

        const normalizedAddresses = sortSavedAddresses(response ?? [])
        const resolvedAddress = resolveSavedShippingAddress(normalizedAddresses)

        if (!resolvedAddress) {
          setSavedAddresses([])
          setSelectedSavedAddressId('')
          setShippingAddressMode('new')
          setSavedAddressMessage('Ban chua co dia chi mac dinh. Vui long nhap dia chi giao hang hoac cap nhat trong ho so.')
          return
        }

        setSavedAddresses(normalizedAddresses)
        setSelectedSavedAddressId(resolvedAddress.id ?? '')
        setShippingAddressMode('saved')
        setSavedAddressMessage(
          resolvedAddress.isDefault
            ? 'Dia chi mac dinh da duoc tu dong ap dung cho don hang nay.'
            : 'Da ap dung dia chi giao hang da luu cua ban.',
        )
        setFormValues((previousValues) => ({
          ...previousValues,
          ...buildShippingFields({ user, address: resolvedAddress }),
        }))
      } catch {
        if (isCancelled) {
          return
        }

        setSavedAddresses([])
        setSelectedSavedAddressId('')
        setShippingAddressMode('new')
        setSavedAddressMessage('Khong the tai dia chi da luu luc nay. Ban co the nhap nhanh thong tin giao hang ben duoi.')
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
  }, [isCheckoutOpen, user?.fullName, user?.phone, user?.userId])

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

  const handleSelectSavedAddress = (address) => {
    if (!address) {
      return
    }

    setShippingAddressMode('saved')
    setSelectedSavedAddressId(address.id ?? '')
    setSavedAddressMessage(
      address.isDefault
        ? 'Dia chi mac dinh da duoc ap dung cho don hang nay.'
        : 'Da chuyen sang mot dia chi da luu khac trong danh sach cua ban.',
    )
    setFormValues((previousValues) => ({
      ...previousValues,
      ...buildShippingFields({ user, address }),
    }))
  }

  const handleUseNewAddress = () => {
    setShippingAddressMode('new')
    setSelectedSavedAddressId('')
    setSavedAddressMessage('Ban dang nhap mot dia chi moi cho don hang nay.')
    setFormValues((previousValues) => ({
      ...previousValues,
      ...buildShippingFields({ user }),
    }))
  }

  const defaultSavedAddress = useMemo(
    () => savedAddresses.find((address) => address?.isDefault) ?? savedAddresses[0] ?? null,
    [savedAddresses],
  )

  const handleCheckout = async (event) => {
    event.preventDefault()

    if (items.length === 0) {
      toast.error('Gio hang cua ban dang trong.')
      return
    }

    const shopperId = getActiveShopperId(user?.userId)
    setIsSubmitting(true)

    try {
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
        shippingMode: formValues.shippingMode,
        shippingProvider: formValues.shippingMode === 'PROVIDER_API' ? formValues.shippingProvider : null,
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

      toast.success('Don hang da duoc tao thanh cong.')

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
                <h2 className="font-display text-2xl font-semibold text-foreground">Hoan tat don hang</h2>
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
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Giao hang</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Thong tin nguoi nhan</h3>
                    </div>

                    {user?.userId ? (
                      <div className="rounded-3xl border border-border bg-secondary/45 px-4 py-4 text-sm">
                        {isLoadingSavedAddress ? (
                          <p className="text-muted-foreground">Dang tai thong tin giao hang da luu...</p>
                        ) : (
                          <>
                            <p className="font-medium text-foreground">
                              {savedAddressMessage || 'Thong tin tai khoan cua ban da duoc dien san cho checkout.'}
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
                                      Dung dia chi mac dinh
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
                                    Nhap dia chi moi
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
                                              Mac dinh
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
                              Quan ly dia chi trong ho so
                            </button>

                            {shippingAddressMode === 'new' ? (
                              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                                Dia chi moi ban nhap ben duoi se chi ap dung cho don hang nay. Neu muon luu vao ho so, hay them trong trang quan ly dia chi.
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
                        placeholder="Ho va ten nguoi nhan"
                        className={`${inputClassName} sm:col-span-2`}
                        required
                      />
                      <input
                        name="shipPhone"
                        value={formValues.shipPhone}
                        onChange={handleChange}
                        placeholder="So dien thoai"
                        className={inputClassName}
                        required
                      />
                      <input
                        name="shipCity"
                        value={formValues.shipCity}
                        onChange={handleChange}
                        placeholder="Tinh / Thanh pho"
                        className={inputClassName}
                        required
                      />
                      <input
                        name="shipDistrict"
                        value={formValues.shipDistrict}
                        onChange={handleChange}
                        placeholder="Quan / Huyen"
                        className={inputClassName}
                        required
                      />
                      <input
                        name="shipWard"
                        value={formValues.shipWard}
                        onChange={handleChange}
                        placeholder="Phuong / Xa"
                        className={inputClassName}
                        required
                      />
                      <textarea
                        name="shipAddress"
                        value={formValues.shipAddress}
                        onChange={handleChange}
                        placeholder="So nha, ten duong, toa nha..."
                        className={`${inputClassName} min-h-28 resize-none sm:col-span-2`}
                        required
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Van chuyen</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Cau hinh giao hang</h3>
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
                        placeholder="Phi van chuyen"
                        required
                      />

                      {formValues.shippingMode === 'PROVIDER_API' ? (
                        <select
                          name="shippingProvider"
                          value={formValues.shippingProvider}
                          onChange={handleChange}
                          className={`${inputClassName} sm:col-span-2`}
                        >
                          <option value="GHTK">Giao Hang Tiet Kiem</option>
                        </select>
                      ) : null}

                      <input
                        name="promotionCode"
                        value={formValues.promotionCode}
                        onChange={handleChange}
                        placeholder="Ma khuyen mai (neu co)"
                        className={`${inputClassName} sm:col-span-2`}
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Thanh toan</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-foreground">Chon phuong thuc phu hop</h3>
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
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Don hang cua ban</p>
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
                    <span className="text-muted-foreground">Tam tinh</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Phi van chuyen</span>
                    <span className="font-medium text-foreground">{formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold text-foreground">Tong cong</span>
                    <span className="font-display text-2xl font-semibold text-foreground">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <button
                  form="checkout-form"
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold uppercase tracking-[0.22em] transition ${
                    isSubmitting || items.length === 0
                      ? 'cursor-not-allowed bg-foreground/60 text-primary-foreground'
                      : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
                  {isSubmitting ? 'Dang tao don hang' : 'Xac nhan dat hang'}
                </button>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Khi bam xac nhan, app se dong bo gio hang hien tai len backend, tao don hang va chuyen ban sang buoc theo doi thanh toan.
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
