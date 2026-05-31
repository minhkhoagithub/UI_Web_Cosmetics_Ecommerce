import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, LoaderCircle, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { cancelOrderRequest } from '../../services/order'
import { createPaymentRequest, getPaymentByOrderRequest } from '../../services/payment'
import { getActiveShopperId } from '../../services/shopper'
import {
  formatCurrency,
  formatPaymentStatusLabel,
  getPaymentStatusTone,
} from '../../utils/format'

const OPENED_PAYMENT_KEY_PREFIX = 'cosmetics-shop.payment-window'

const PaymentStatus = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNo = searchParams.get('orderNo')
  const method = searchParams.get('method') ?? 'COD'
  const callbackSource = searchParams.get('source')
  const callbackMessage = searchParams.get('message')
  const callbackTransactionStatus = searchParams.get('transactionStatus')
  const callbackOrderPaymentStatus = searchParams.get('orderPaymentStatus')

  const [payment, setPayment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isCancelFormOpen, setIsCancelFormOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancellingOrder, setIsCancellingOrder] = useState(false)
  const [isOrderCancelled, setIsOrderCancelled] = useState(false)
  const pollingTimerRef = useRef(null)
  const callbackToastRef = useRef('')

  const shouldPoll =
    payment?.transactionStatus === 'PENDING' &&
    payment?.orderPaymentStatus !== 'PAID' &&
    !isOrderCancelled &&
    method !== 'COD'

  const loadPaymentStatus = async ({ silent = false } = {}) => {
    if (!orderId) {
      return
    }

    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const response = await getPaymentByOrderRequest(orderId)
      setPayment({
        transactionId: response.transactionId,
        orderId: response.orderId,
        orderStatus: response.orderStatus,
        transactionRef: response.transactionRef,
        transactionStatus: response.status ?? response.transactionStatus,
        orderPaymentStatus: response.orderPaymentStatus,
        paymentRedirectUrl: response.paymentRedirectUrl,
        paymentInfo: response.paymentInfo ?? {},
        amount: response.amount,
      })
      setIsOrderCancelled(response.orderStatus === 'CANCELLED')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!orderId) {
      return
    }

    loadPaymentStatus()
  }, [orderId])

  useEffect(() => {
    if (callbackSource !== 'vnpay-return' || !callbackMessage) {
      return
    }

    const toastKey = `${orderId}:${callbackTransactionStatus ?? callbackOrderPaymentStatus ?? 'UNKNOWN'}:${callbackMessage}`
    if (callbackToastRef.current === toastKey) {
      return
    }

    if (callbackOrderPaymentStatus === 'PAID' || callbackTransactionStatus === 'SUCCESS') {
      toast.success(callbackMessage)
    } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(callbackTransactionStatus ?? '')) {
      toast.error(callbackMessage)
    } else {
      toast.info(callbackMessage)
    }

    callbackToastRef.current = toastKey
  }, [callbackMessage, callbackOrderPaymentStatus, callbackSource, callbackTransactionStatus, orderId])

  useEffect(() => {
    if (!shouldPoll) {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
      return undefined
    }

    pollingTimerRef.current = window.setInterval(() => {
      loadPaymentStatus({ silent: true })
    }, 5000)

    return () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
    }
  }, [shouldPoll])

  useEffect(() => {
    if (isOrderCancelled || method !== 'VNPAY' || !payment?.paymentRedirectUrl || !orderId || callbackSource === 'vnpay-return') {
      return
    }

    const storageKey = `${OPENED_PAYMENT_KEY_PREFIX}.${orderId}`
    if (window.sessionStorage.getItem(storageKey)) {
      return
    }

    const popup = window.open(payment.paymentRedirectUrl, '_blank', 'noopener,noreferrer')
    if (popup) {
      window.sessionStorage.setItem(storageKey, 'opened')
      toast.success('Đã mở cổng thanh toán VNPAY ở tab mới.')
    }
  }, [isOrderCancelled, method, orderId, payment?.paymentRedirectUrl, callbackSource])

  const handleRefresh = async () => {
    await loadPaymentStatus({ silent: true })
  }

  const handleRetryPayment = async () => {
    if (!orderId) {
      return
    }

    setIsRetrying(true)

    try {
      const recreatedPayment = await createPaymentRequest(orderId)
      setPayment((previousPayment) => ({
        ...previousPayment,
        transactionId: recreatedPayment.transactionId,
        transactionRef: recreatedPayment.transactionRef,
        orderStatus: recreatedPayment.orderStatus,
        transactionStatus: recreatedPayment.status,
        orderPaymentStatus: recreatedPayment.orderPaymentStatus,
        paymentRedirectUrl: recreatedPayment.paymentRedirectUrl,
        paymentInfo: recreatedPayment.paymentInfo ?? {},
        amount: recreatedPayment.amount,
      }))
      setIsOrderCancelled(recreatedPayment.orderStatus === 'CANCELLED')

      if (recreatedPayment.paymentRedirectUrl) {
        window.open(recreatedPayment.paymentRedirectUrl, '_blank', 'noopener,noreferrer')
      }

      toast.success('Đã khởi tạo lại giao dịch thanh toán.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleCancelOrder = async () => {
    const trimmedReason = cancelReason.trim()
    if (!orderId || !trimmedReason) {
      toast.error('Vui lòng nhập lý do hủy đơn hàng.')
      return
    }

    const shopperId = getActiveShopperId(user?.userId)
    setIsCancellingOrder(true)

    try {
      await cancelOrderRequest({
        orderId,
        userId: shopperId,
        reason: trimmedReason,
      })
      setIsOrderCancelled(true)
      setIsCancelFormOpen(false)
      setCancelReason('')
      toast.success('Đơn hàng đã được hủy. Email thông báo sẽ được gửi đến khách hàng.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsCancellingOrder(false)
    }
  }

  const resolvedStatus = isOrderCancelled
    ? 'CANCELLED'
    : payment?.orderPaymentStatus === 'PAID'
      ? 'PAID'
      : payment?.transactionStatus ?? 'PENDING'
  const paymentInfo = payment?.paymentInfo ?? {}
  const showQrBlock = !isOrderCancelled && method === 'SEPAY' && paymentInfo.qrUrl
  const showRetryButton = !isOrderCancelled && ['FAILED', 'CANCELLED', 'EXPIRED'].includes(payment?.transactionStatus)
  const canCancelOrder = !isOrderCancelled && payment?.orderPaymentStatus !== 'PAID'
  const headline =
    isOrderCancelled
      ? 'Đơn hàng đã được hủy'
      : method === 'COD'
      ? 'Đơn hàng của bạn đã được ghi nhận'
      : payment?.orderPaymentStatus === 'PAID'
        ? 'Thanh toán đã hoàn tất'
        : 'Đang chờ hoàn tất thanh toán'

  const helperText = useMemo(() => {
    if (isOrderCancelled) {
      return 'Yêu cầu hủy đơn đã được ghi nhận. Hệ thống đã hoàn tồn kho và gửi email thông báo cho khách hàng.'
    }

    if (method === 'COD') {
      return 'Bạn sẽ thanh toán khi nhận hàng. Đội ngũ vận hành sẽ xử lý đơn của bạn sớm nhất có thể.'
    }

    if (payment?.orderPaymentStatus === 'PAID') {
      return 'Hệ thống đã xác nhận giao dịch thành công. Bạn có thể yên tâm quay lại tiếp tục mua sắm.'
    }

    if (method === 'SEPAY') {
      return 'Vui lòng chuyển khoản đúng số tiền và nội dung bên dưới. Hệ thống sẽ tự động cập nhật trạng thái sau khi nhận webhook.'
    }

    return 'Nếu tab thanh toán chưa mở, bạn có thể dùng nút bên dưới để mở lại cổng thanh toán. Trang này sẽ tự động cập nhật khi hệ thống nhận phản hồi thanh toán.'
  }, [isOrderCancelled, method, payment?.orderPaymentStatus])

  if (!orderId) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Quay lại trang chủ
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-border bg-background p-8 shadow-sm">
            {isLoading ? (
              <div className="flex min-h-80 items-center justify-center">
                <LoaderCircle className="animate-spin text-foreground" size={28} />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Theo dõi thanh toán</p>
                    <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">{headline}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{helperText}</p>
                  </div>

                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getPaymentStatusTone(resolvedStatus)}`}>
                    {formatPaymentStatusLabel(resolvedStatus)}
                  </span>
                </div>

                <div className="mt-8 grid gap-4 rounded-[2rem] bg-secondary/55 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mã đơn hàng</p>
                    <p className="mt-2 font-semibold text-foreground">{orderNo || orderId}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phương thức</p>
                    <p className="mt-2 font-semibold text-foreground">{method}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mã giao dịch</p>
                    <p className="mt-2 break-all font-semibold text-foreground">{payment?.transactionRef || 'Đang cập nhật'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Số tiền</p>
                    <p className="mt-2 font-semibold text-foreground">{formatCurrency(payment?.amount ?? paymentInfo.amount ?? 0)}</p>
                  </div>
                </div>

                {showQrBlock ? (
                  <div className="mt-8 rounded-[2rem] border border-border p-6">
                    <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                      <div className="overflow-hidden rounded-[1.5rem] bg-secondary p-4">
                        <img src={paymentInfo.qrUrl} alt="SePay QR" className="w-full rounded-2xl object-cover" />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ngân hàng</p>
                          <p className="mt-2 font-semibold text-foreground">{paymentInfo.bankCode || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Số tài khoản</p>
                          <p className="mt-2 font-semibold text-foreground">{paymentInfo.accountNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Chủ tài khoản</p>
                          <p className="mt-2 font-semibold text-foreground">{paymentInfo.accountName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nội dung chuyển khoản</p>
                          <p className="mt-2 break-all font-semibold text-foreground">{paymentInfo.transferContent || payment?.transactionRef}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                      isRefreshing
                        ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                        : 'bg-foreground text-primary-foreground hover:-translate-y-0.5'
                    }`}
                  >
                    {isRefreshing ? <LoaderCircle size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                    Làm mới trạng thái
                  </button>

                  {!isOrderCancelled && method === 'VNPAY' && payment?.paymentRedirectUrl ? (
                    <button
                      type="button"
                      onClick={() => window.open(payment.paymentRedirectUrl, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                    >
                      <ExternalLink size={16} />
                      Mở lại VNPAY
                    </button>
                  ) : null}

                  {showRetryButton ? (
                    <button
                      type="button"
                      onClick={handleRetryPayment}
                      disabled={isRetrying}
                      className={`inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                        isRetrying
                          ? 'cursor-not-allowed border-border text-muted-foreground'
                          : 'border-foreground text-foreground hover:bg-foreground hover:text-primary-foreground'
                      }`}
                    >
                      {isRetrying ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Tạo lại thanh toán
                    </button>
                  ) : null}

                  {canCancelOrder && !isCancelFormOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsCancelFormOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      <XCircle size={16} />
                      Hủy đơn hàng
                    </button>
                  ) : null}
                </div>

                {canCancelOrder && isCancelFormOpen ? (
                  <div className="mt-5 space-y-3 border-t border-border pt-5">
                    <textarea
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      rows={3}
                      placeholder="Lý do hủy đơn hàng"
                      className="w-full resize-none rounded-[1.5rem] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleCancelOrder}
                        disabled={isCancellingOrder}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                          isCancellingOrder
                            ? 'cursor-not-allowed bg-rose-200 text-rose-700'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {isCancellingOrder ? <LoaderCircle size={16} className="animate-spin" /> : <XCircle size={16} />}
                        Xác nhận hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCancelFormOpen(false)
                          setCancelReason('')
                        }}
                        className="inline-flex items-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default PaymentStatus
