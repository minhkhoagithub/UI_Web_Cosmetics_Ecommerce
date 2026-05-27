import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, LoaderCircle, RefreshCcw, ShieldCheck } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { createPaymentRequest, getPaymentByOrderRequest } from '../../services/payment'
import {
  formatCurrency,
  formatPaymentStatusLabel,
  getPaymentStatusTone,
} from '../../utils/format'

const OPENED_PAYMENT_KEY_PREFIX = 'cosmetics-shop.payment-window'

const PaymentStatus = () => {
  const navigate = useNavigate()
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
  const pollingTimerRef = useRef(null)
  const callbackToastRef = useRef('')

  const shouldPoll =
    payment?.transactionStatus === 'PENDING' &&
    payment?.orderPaymentStatus !== 'PAID' &&
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
        transactionRef: response.transactionRef,
        transactionStatus: response.status ?? response.transactionStatus,
        orderPaymentStatus: response.orderPaymentStatus,
        paymentRedirectUrl: response.paymentRedirectUrl,
        paymentInfo: response.paymentInfo ?? {},
        amount: response.amount,
      })
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
    if (method !== 'VNPAY' || !payment?.paymentRedirectUrl || !orderId || callbackSource === 'vnpay-return') {
      return
    }

    const storageKey = `${OPENED_PAYMENT_KEY_PREFIX}.${orderId}`
    if (window.sessionStorage.getItem(storageKey)) {
      return
    }

    const popup = window.open(payment.paymentRedirectUrl, '_blank', 'noopener,noreferrer')
    if (popup) {
      window.sessionStorage.setItem(storageKey, 'opened')
      toast.success('Da mo cong thanh toan VNPAY o tab moi.')
    }
  }, [method, orderId, payment?.paymentRedirectUrl, callbackSource])

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
        transactionStatus: recreatedPayment.status,
        orderPaymentStatus: recreatedPayment.orderPaymentStatus,
        paymentRedirectUrl: recreatedPayment.paymentRedirectUrl,
        paymentInfo: recreatedPayment.paymentInfo ?? {},
        amount: recreatedPayment.amount,
      }))

      if (recreatedPayment.paymentRedirectUrl) {
        window.open(recreatedPayment.paymentRedirectUrl, '_blank', 'noopener,noreferrer')
      }

      toast.success('Da khoi tao lai giao dich thanh toan.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsRetrying(false)
    }
  }

  const resolvedStatus = payment?.orderPaymentStatus === 'PAID' ? 'PAID' : payment?.transactionStatus ?? 'PENDING'
  const paymentInfo = payment?.paymentInfo ?? {}
  const showQrBlock = method === 'SEPAY' && paymentInfo.qrUrl
  const showRetryButton = ['FAILED', 'CANCELLED', 'EXPIRED'].includes(payment?.transactionStatus)
  const headline =
    method === 'COD'
      ? 'Don hang cua ban da duoc ghi nhan'
      : payment?.orderPaymentStatus === 'PAID'
        ? 'Thanh toan da hoan tat'
        : 'Dang cho hoan tat thanh toan'

  const helperText = useMemo(() => {
    if (method === 'COD') {
      return 'Ban se thanh toan khi nhan hang. Doi ngu van hanh se xu ly don cua ban som nhat co the.'
    }

    if (payment?.orderPaymentStatus === 'PAID') {
      return 'Backend da xac nhan giao dich thanh cong. Ban co the yen tam quay lai tiep tuc mua sam.'
    }

    if (method === 'SEPAY') {
      return 'Vui long chuyen khoan dung so tien va noi dung ben duoi. He thong se tu dong cap nhat trang thai sau khi nhan webhook.'
    }

    return 'Neu tab thanh toan chua mo, ban co the dung nut ben duoi de mo lai cong thanh toan. Trang nay se tu dong cap nhat khi backend nhan callback.'
  }, [method, payment?.orderPaymentStatus])

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
          Quay lai trang chu
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
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Payment Tracking</p>
                    <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">{headline}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{helperText}</p>
                  </div>

                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getPaymentStatusTone(resolvedStatus)}`}>
                    {formatPaymentStatusLabel(resolvedStatus)}
                  </span>
                </div>

                <div className="mt-8 grid gap-4 rounded-[2rem] bg-secondary/55 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ma don hang</p>
                    <p className="mt-2 font-semibold text-foreground">{orderNo || orderId}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Phuong thuc</p>
                    <p className="mt-2 font-semibold text-foreground">{method}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ma giao dich</p>
                    <p className="mt-2 break-all font-semibold text-foreground">{payment?.transactionRef || 'Dang cap nhat'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">So tien</p>
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
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ngan hang</p>
                          <p className="mt-2 font-semibold text-foreground">{paymentInfo.bankCode || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">So tai khoan</p>
                          <p className="mt-2 font-semibold text-foreground">{paymentInfo.accountNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Chu tai khoan</p>
                          <p className="mt-2 font-semibold text-foreground">{paymentInfo.accountName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Noi dung chuyen khoan</p>
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
                    Lam moi trang thai
                  </button>

                  {method === 'VNPAY' && payment?.paymentRedirectUrl ? (
                    <button
                      type="button"
                      onClick={() => window.open(payment.paymentRedirectUrl, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                    >
                      <ExternalLink size={16} />
                      Mo lai VNPAY
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
                      Tao lai thanh toan
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default PaymentStatus
