import { Clock3, LoaderCircle, PackageSearch, ReceiptText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { getMyOrderHistoryRequest } from '../../services/order'
import { readOrderHistory } from '../../services/orderHistory'
import { formatCurrency } from '../../utils/format'

const mergeOrderHistory = (serverEntries = [], localEntries = []) => {
  const entryMap = new Map()

  ;[...serverEntries, ...localEntries].forEach((entry) => {
    if (!entry?.orderId) {
      return
    }

    const currentEntry = entryMap.get(entry.orderId)
    if (!currentEntry || currentEntry.createdAt === undefined) {
      entryMap.set(entry.orderId, entry)
      return
    }

    if (entry.createdAt && new Date(entry.createdAt).getTime() >= new Date(currentEntry.createdAt).getTime()) {
      entryMap.set(entry.orderId, {
        ...currentEntry,
        ...entry,
      })
    }
  })

  return [...entryMap.values()].sort(
    (left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(),
  )
}

const formatOrderDate = (value) => {
  if (!value) {
    return 'Đang cập nhật'
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? 'Đang cập nhật' : parsedDate.toLocaleString('vi-VN')
}

const OrderHistory = () => {
  const { isAuthenticated, user } = useAuth()
  const [orderHistory, setOrderHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return undefined
    }

    let isCancelled = false

    const loadOrderHistory = async () => {
      setIsLoading(true)

      try {
        const response = await getMyOrderHistoryRequest()
        if (isCancelled) {
          return
        }

        setOrderHistory(mergeOrderHistory(response ?? [], readOrderHistory(user?.userId)))
      } catch (error) {
        if (isCancelled) {
          return
        }

        setOrderHistory(mergeOrderHistory([], readOrderHistory(user?.userId)))
        toast.error(error.message)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadOrderHistory()

    return () => {
      isCancelled = true
    }
  }, [isAuthenticated, user?.userId])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2.5rem] border border-border bg-background p-8 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Lịch sử đơn hàng</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">Lịch sử mua hàng</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Danh sách này được đồng bộ theo tài khoản bạn đang đăng nhập để bạn có thể theo dõi đơn hàng ở mọi thiết bị.
          </p>

          {isLoading ? (
            <div className="mt-8 flex min-h-64 items-center justify-center">
              <LoaderCircle size={28} className="animate-spin text-foreground" />
            </div>
          ) : orderHistory.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-dashed border-border px-8 py-12 text-center">
              <PackageSearch size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">Chưa có đơn hàng nào</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sau khi đặt hàng thành công, thông tin đơn sẽ xuất hiện ở đây.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:-translate-y-0.5"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {orderHistory.map((order) => (
                <article key={order.orderId} className="rounded-[2rem] border border-border bg-secondary/35 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mã đơn</p>
                      <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
                        {order.orderNo || order.orderId}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 size={14} />
                          {formatOrderDate(order.createdAt)}
                        </span>
                        <span>{order.paymentMethod ?? 'COD'}</span>
                        <span>{order.receiverName ?? 'Đang cập nhật người nhận'}</span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tổng tiền</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(order.totalAmount ?? 0)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={`/order-history/${encodeURIComponent(order.orderId)}`}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:-translate-y-0.5"
                    >
                      <ReceiptText size={16} />
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default OrderHistory
