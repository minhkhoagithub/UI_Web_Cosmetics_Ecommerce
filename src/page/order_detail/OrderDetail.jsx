import { ArrowLeft, Clock3, LoaderCircle, ReceiptText, Star, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { getProductDetail, getVariantImage } from '../../services/catalog'
import { cancelOrderRequest, getMyOrderDetailRequest } from '../../services/order'
import { createReviewRequest } from '../../services/review'
import { formatCurrency, formatPaymentStatusLabel, getPaymentStatusTone } from '../../utils/format'

const DEFAULT_REVIEW_FORM = {
  rating: 5,
  content: '',
}

const REVIEWABLE_ORDER_STATUSES = new Set(['CREATED', 'COMPLETED'])

const formatOrderDate = (value) => {
  if (!value) {
    return 'Đang cập nhật'
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? 'Đang cập nhật' : parsedDate.toLocaleString('vi-VN')
}

const buildItemReviewKey = (item) => item.itemId ?? item.productId ?? item.variantId

const formatVariantLabel = (optionsSnapshot) => {
  if (!optionsSnapshot || typeof optionsSnapshot !== 'object') {
    return ''
  }

  return Object.entries(optionsSnapshot)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' - ')
}

const buildInitialReviewForms = (items = []) =>
  items.reduce((forms, item) => {
    forms[buildItemReviewKey(item)] = DEFAULT_REVIEW_FORM
    return forms
  }, {})

const getOrderItemImage = (item) => item?.imageUrl || item?.image || item?.thumbnailUrl || ''

const enrichOrderDetailImages = async (orderDetail) => {
  const items = orderDetail?.items ?? []
  const productIds = Array.from(new Set(
    items
      .filter((item) => !getOrderItemImage(item))
      .map((item) => item?.productId)
      .filter(Boolean),
  ))

  if (productIds.length === 0) {
    return orderDetail
  }

  const details = await Promise.allSettled(productIds.map((productId) => getProductDetail(productId)))
  const detailByProductId = new Map()
  details.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      detailByProductId.set(productIds[index], result.value)
    }
  })

  return {
    ...orderDetail,
    items: items.map((item) => ({
      ...item,
      imageUrl: getOrderItemImage(item) || getVariantImage(detailByProductId.get(item.productId), item.variantId),
    })),
  }
}

const OrderDetail = () => {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const { isAuthenticated, user } = useAuth()
  const [orderDetail, setOrderDetail] = useState(null)
  const [reviewForms, setReviewForms] = useState({})
  const [submittingReviewKeys, setSubmittingReviewKeys] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [failedImageItemKeys, setFailedImageItemKeys] = useState(() => new Set())
  const [isCancelFormOpen, setIsCancelFormOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancellingOrder, setIsCancellingOrder] = useState(false)

  const isReviewableOrder = REVIEWABLE_ORDER_STATUSES.has(orderDetail?.status ?? '')
  const paymentStatus = orderDetail?.paymentStatus ?? 'UNPAID'
  const canCancelOrder = ['CREATED', 'CONFIRMED'].includes(orderDetail?.status ?? '') && paymentStatus === 'UNPAID'

  const loadOrderDetail = useCallback(async ({ silent = false } = {}) => {
    if (!orderId) {
      return
    }

    if (!silent) {
      setIsLoading(true)
      setErrorMessage('')
      setFailedImageItemKeys(new Set())
    }

    try {
      const response = await getMyOrderDetailRequest(orderId)
      const enrichedResponse = await enrichOrderDetailImages(response)
      setOrderDetail(enrichedResponse)
      if (enrichedResponse?.status === 'CANCELLED' || enrichedResponse?.paymentStatus === 'PAID') {
        setIsCancelFormOpen(false)
        setCancelReason('')
      }
      setErrorMessage('')
      setReviewForms((currentForms) => ({
        ...buildInitialReviewForms(enrichedResponse?.items ?? []),
        ...currentForms,
      }))
    } catch (error) {
      if (!silent) {
        setErrorMessage(error.message)
      }
      toast.error(error.message)
      if (!silent) {
        setOrderDetail(null)
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [orderId])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    loadOrderDetail()
  }, [isAuthenticated, loadOrderDetail])

  const orderItems = useMemo(() => orderDetail?.items ?? [], [orderDetail?.items])

  const handleReviewFieldChange = (itemKey, fieldName, value) => {
    setReviewForms((currentForms) => ({
      ...currentForms,
      [itemKey]: {
        ...(currentForms[itemKey] ?? DEFAULT_REVIEW_FORM),
        [fieldName]: value,
      },
    }))
  }

  const markItemImageFailed = (itemKey) => {
    setFailedImageItemKeys((currentKeys) => new Set(currentKeys).add(itemKey))
  }

  const handleSubmitReview = async (item) => {
    if (!user?.userId || !orderDetail?.orderId || !item?.productId) {
      toast.error('Không thể gửi đánh giá cho sản phẩm này.')
      return
    }

    const itemKey = buildItemReviewKey(item)
    const reviewForm = reviewForms[itemKey] ?? DEFAULT_REVIEW_FORM

    setSubmittingReviewKeys((currentState) => ({
      ...currentState,
      [itemKey]: true,
    }))

    try {
      await createReviewRequest({
        userId: user.userId,
        productId: item.productId,
        orderId: orderDetail.orderId,
        rating: reviewForm.rating,
        content: reviewForm.content,
      })

      setReviewForms((currentForms) => ({
        ...currentForms,
        [itemKey]: DEFAULT_REVIEW_FORM,
      }))
      toast.success('Đánh giá của bạn đã được ghi nhận.')
      await loadOrderDetail({ silent: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmittingReviewKeys((currentState) => ({
        ...currentState,
        [itemKey]: false,
      }))
    }
  }

  const handleCancelOrder = async () => {
    const trimmedReason = cancelReason.trim()
    if (!orderDetail?.orderId || !user?.userId || !trimmedReason) {
      toast.error('Vui lòng nhập lý do hủy đơn hàng.')
      return
    }

    setIsCancellingOrder(true)

    try {
      const result = await cancelOrderRequest({
        orderId: orderDetail.orderId,
        userId: user.userId,
        reason: trimmedReason,
      })
      setOrderDetail((currentOrder) => currentOrder
        ? {
            ...currentOrder,
            status: result?.status ?? 'CANCELLED',
          }
        : currentOrder)
      setIsCancelFormOpen(false)
      setCancelReason('')
      toast.success('Đơn hàng đã được hủy. Email thông báo sẽ được gửi đến khách hàng.')
      await loadOrderDetail({ silent: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsCancellingOrder(false)
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!orderId) {
    return <Navigate to="/order-history" replace />
  }

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/order-history')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Quay lại lịch sử đơn hàng
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-border bg-background p-8 shadow-sm">
            {isLoading ? (
              <div className="flex min-h-80 items-center justify-center">
                <LoaderCircle size={28} className="animate-spin text-foreground" />
              </div>
            ) : errorMessage ? (
              <div className="rounded-[1.75rem] border border-destructive/20 bg-destructive/5 px-5 py-6 text-sm leading-7 text-destructive">
                {errorMessage}
              </div>
            ) : orderDetail ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Chi tiết đơn hàng</p>
                    <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">
                      {orderDetail.orderNo || orderDetail.orderId}
                    </h1>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 size={14} />
                        {formatOrderDate(orderDetail.createdAt)}
                      </span>
                      <span>{orderDetail.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-4 py-2 text-sm font-semibold ${getPaymentStatusTone(paymentStatus)}`}>
                      {formatPaymentStatusLabel(paymentStatus)}
                    </span>
                  </div>
                </div>

                <div className="mt-8 rounded-[1.75rem] bg-secondary/45 p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Người nhận</p>
                      <p className="mt-2 font-semibold text-foreground">{orderDetail.shipFullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{orderDetail.shipPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Địa chỉ giao hàng</p>
                      <p className="mt-2 text-sm leading-7 text-foreground">
                        {orderDetail.shipAddress}, {orderDetail.shipWard}, {orderDetail.shipDistrict}, {orderDetail.shipCity}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-5">
                  {orderItems.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-border bg-secondary/20 px-5 py-6 text-sm leading-7 text-muted-foreground">
                      Đơn hàng này hiện không có dữ liệu sản phẩm chi tiết, nên hệ thống chưa thể hiện danh sách mặt hàng và phần
                      đánh giá. Các đơn mới được tạo sau khi backend lưu đầy đủ `order_items` sẽ hiện review bình thường.
                    </div>
                  ) : (
                    orderItems.map((item) => {
                      const itemKey = buildItemReviewKey(item)
                      const reviewForm = reviewForms[itemKey] ?? DEFAULT_REVIEW_FORM
                      const isSubmittingReview = Boolean(submittingReviewKeys[itemKey])
                      const variantLabel = formatVariantLabel(item.optionsSnapshot)

                      return (
                        <article key={itemKey} className="rounded-[1.75rem] border border-border bg-secondary/25 p-5">
                          <div className="flex flex-col gap-4 md:flex-row">
                            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[1.5rem] bg-secondary">
                              {item.imageUrl && !failedImageItemKeys.has(itemKey) ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  onError={() => markItemImageFailed(itemKey)}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  Chưa có ảnh
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h2 className="font-display text-2xl font-semibold text-foreground">{item.name}</h2>
                                  {variantLabel ? (
                                    <p className="mt-2 text-sm text-muted-foreground">{variantLabel}</p>
                                  ) : null}
                                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span>SL {item.quantity}</span>
                                    <span>{formatCurrency(item.unitPrice)}</span>
                                  </div>
                                </div>

                                <div className="text-left md:text-right">
                                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Thành tiền</p>
                                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(item.lineTotal)}</p>
                                </div>
                              </div>

                              {isReviewableOrder ? (
                                <div className="mt-6 rounded-[1.5rem] border border-border bg-background p-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">Đánh giá sản phẩm</p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {item.reviewMessage || 'Bạn có thể để lại cảm nhận sau khi đã nhận và dùng sản phẩm.'}
                                      </p>
                                    </div>
                                  </div>

                                  {item.alreadyReviewed ? (
                                    <div className="mt-4 rounded-[1.25rem] bg-secondary/45 p-4">
                                      <div className="flex items-center gap-2 text-accent">
                                        {[1, 2, 3, 4, 5].map((starValue) => (
                                          <Star
                                            key={starValue}
                                            size={14}
                                            fill={starValue <= Number(item.reviewRating ?? 0) ? 'currentColor' : 'none'}
                                          />
                                        ))}
                                      </div>
                                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        {item.reviewContent?.trim() || 'Bạn đã đánh giá bằng số sao và không để lại nội dung.'}
                                      </p>
                                      {item.reviewCreatedAt ? (
                                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                          Gửi lúc {formatOrderDate(item.reviewCreatedAt)}
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : item.canReview ? (
                                    <div className="mt-4 space-y-4">
                                      <div>
                                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Số sao</p>
                                        <div className="flex flex-wrap gap-2">
                                          {[1, 2, 3, 4, 5].map((ratingValue) => (
                                            <button
                                              key={ratingValue}
                                              type="button"
                                              onClick={() => handleReviewFieldChange(itemKey, 'rating', ratingValue)}
                                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                                                Number(reviewForm.rating) === ratingValue
                                                  ? 'border-foreground bg-foreground text-primary-foreground'
                                                  : 'border-border bg-background text-foreground hover:border-foreground/50'
                                              }`}
                                            >
                                              <Star size={14} fill="currentColor" />
                                              {ratingValue}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <div>
                                        <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                          Nội dung đánh giá
                                        </label>
                                        <textarea
                                          value={reviewForm.content}
                                          onChange={(event) => handleReviewFieldChange(itemKey, 'content', event.target.value)}
                                          rows={4}
                                          placeholder="Hãy chia sẻ trải nghiệm của bạn với sản phẩm này."
                                          className="w-full rounded-[1.5rem] border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                                        />
                                      </div>

                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleSubmitReview(item)}
                                          disabled={isSubmittingReview}
                                          className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                                            isSubmittingReview
                                              ? 'cursor-not-allowed bg-foreground/60 text-primary-foreground'
                                              : 'bg-foreground text-primary-foreground hover:bg-accent hover:text-accent-foreground'
                                          }`}
                                        >
                                          {isSubmittingReview ? <LoaderCircle size={16} className="animate-spin" /> : null}
                                          {isSubmittingReview ? 'Đang gửi đánh giá' : 'Gửi đánh giá'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border bg-background p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tổng quan thanh toán</p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-medium text-foreground">{formatCurrency(orderDetail?.subtotalAmount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Giảm giá</span>
                  <span className="font-medium text-foreground">-{formatCurrency(orderDetail?.discountAmount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span className="font-medium text-foreground">{formatCurrency(orderDetail?.shippingFee ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold text-foreground">Tổng cộng</span>
                  <span className="font-display text-2xl font-semibold text-foreground">{formatCurrency(orderDetail?.totalAmount ?? 0)}</span>
                </div>
              </div>
            </div>

            {orderDetail ? (
              <div className="rounded-[2rem] border border-border bg-background p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Theo dõi giao dịch</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Trạng thái thanh toán và chi tiết giao dịch vẫn được theo dõi ở màn hình trạng thái thanh toán.
                </p>
                <Link
                  to={`/payment-status?orderId=${encodeURIComponent(orderDetail.orderId)}&orderNo=${encodeURIComponent(orderDetail.orderNo ?? '')}&method=${encodeURIComponent(orderDetail.paymentMethod ?? 'COD')}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:-translate-y-0.5"
                >
                  <ReceiptText size={16} />
                  Xem trạng thái thanh toán
                </Link>

                {canCancelOrder ? (
                  <div className="mt-5 border-t border-border pt-5">
                    {isCancelFormOpen ? (
                      <div className="space-y-3">
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCancelFormOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-rose-700 transition hover:border-rose-400 hover:bg-rose-50"
                      >
                        <XCircle size={16} />
                        Hủy đơn hàng
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default OrderDetail
