import { ArrowRight, BadgeCheck, CircleAlert, Clock3, House, ReceiptText } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { formatPaymentStatusLabel, getPaymentStatusTone } from '../../utils/format'

const resolveHeadline = (resolvedStatus) => {
  switch (resolvedStatus) {
    case 'PAID':
    case 'SUCCESS':
      return 'Thanh toán thành công'
    case 'CANCELLED':
      return 'Thanh toán đã bị hủy'
    case 'EXPIRED':
      return 'Phiên thanh toán đã hết hạn'
    case 'FAILED':
      return 'Thanh toán chưa hoàn tất'
    default:
      return 'Đã ghi nhận kết quả thanh toán'
  }
}

const resolveDescription = (resolvedStatus, message) => {
  if (message) {
    return message
  }

  switch (resolvedStatus) {
    case 'PAID':
    case 'SUCCESS':
      return 'Hệ thống đã cập nhật trạng thái đơn hàng ở backend. Bạn có thể đóng tab này hoặc quay lại website để tiếp tục mua sắm.'
    case 'CANCELLED':
      return 'Giao dịch đã bị hủy trước khi hoàn tất. Bạn có thể quay lại website và tạo lại thanh toán nếu cần.'
    case 'EXPIRED':
      return 'Thời gian giữ phiên thanh toán đã hết. Bạn có thể quay lại website để khởi tạo giao dịch mới.'
    case 'FAILED':
      return 'Cổng thanh toán không xác nhận được giao dịch. Bạn có thể quay lại website để thử lại.'
    default:
      return 'Hệ thống đã tiếp nhận phản hồi thanh toán. Bạn có thể quay lại website để xem trạng thái mới nhất.'
  }
}

const resolveIcon = (resolvedStatus) => {
  switch (resolvedStatus) {
    case 'PAID':
    case 'SUCCESS':
      return BadgeCheck
    case 'CANCELLED':
    case 'FAILED':
      return CircleAlert
    case 'EXPIRED':
      return Clock3
    default:
      return ReceiptText
  }
}

const PaymentResult = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const orderNo = searchParams.get('orderNo')
  const method = searchParams.get('method') ?? 'VNPAY'
  const transactionRef = searchParams.get('transactionRef')
  const transactionStatus = searchParams.get('transactionStatus')
  const orderPaymentStatus = searchParams.get('orderPaymentStatus')
  const message = searchParams.get('message')

  if (!orderId && !transactionRef) {
    return <Navigate to="/" replace />
  }

  const resolvedStatus = orderPaymentStatus === 'PAID' ? 'PAID' : transactionStatus ?? 'PENDING'
  const StatusIcon = resolveIcon(resolvedStatus)
  const headline = resolveHeadline(resolvedStatus)
  const description = resolveDescription(resolvedStatus, message)

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background px-4 py-14">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2.5rem] border border-border bg-background p-8 shadow-sm md:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Kết quả thanh toán</p>
              <div className="mt-5 flex items-center gap-4">
                <div className={`rounded-full p-4 ${resolvedStatus === 'PAID' || resolvedStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  <StatusIcon size={30} />
                </div>
                <div>
                  <h1 className="font-display text-3xl font-semibold text-foreground">{headline}</h1>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>

            <span className={`self-start rounded-full px-4 py-2 text-sm font-semibold ${getPaymentStatusTone(resolvedStatus)}`}>
              {formatPaymentStatusLabel(resolvedStatus)}
            </span>
          </div>

          <div className="mt-10 grid gap-4 rounded-[2rem] bg-secondary/55 p-5 sm:grid-cols-2">
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
              <p className="mt-2 break-all font-semibold text-foreground">{transactionRef || 'Đang cập nhật'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Trạng thái đơn</p>
              <p className="mt-2 font-semibold text-foreground">{orderPaymentStatus || 'UNPAID'}</p>
            </div>
          </div>

          {/* <div className="mt-8 rounded-[2rem] border border-border bg-secondary/30 p-5 text-sm leading-7 text-muted-foreground">
            <p>Hệ thống đã xử lý phản hồi thanh toán trước khi chuyển bạn tới trang này.</p>
            <p>Nếu tab website chính của bạn vẫn đang mở, trạng thái thanh toán ở đó sẽ tiếp tục được đồng bộ từ hệ thống.</p>
          </div> */}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:-translate-y-0.5"
            >
              <House size={16} />
              Về trang chủ
            </Link>
            <Link
              to={`/payment-status?orderId=${encodeURIComponent(orderId ?? '')}&orderNo=${encodeURIComponent(orderNo ?? '')}&method=${encodeURIComponent(method)}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
            >
              <ArrowRight size={16} />
              Xem trạng thái trên website
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PaymentResult
