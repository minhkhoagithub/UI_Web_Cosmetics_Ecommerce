import { Clock3, PackageSearch, ReceiptText } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { readOrderHistory } from '../../services/orderHistory'
import { formatCurrency } from '../../utils/format'

const OrderHistory = () => {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const orderHistory = readOrderHistory(user?.userId)

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2.5rem] border border-border bg-background p-8 shadow-sm md:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Order Archive</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">Lich su mua hang</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Danh sach nay hien duoc luu tren trinh duyet nay tu nhung don hang ban da dat.
          </p>

          {orderHistory.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-dashed border-border px-8 py-12 text-center">
              <PackageSearch size={32} className="mx-auto text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold text-foreground">Chua co don hang nao</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sau khi dat hang thanh cong, thong tin don se xuat hien o day.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:-translate-y-0.5"
              >
                Tiep tuc mua sam
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {orderHistory.map((order) => (
                <article key={order.orderId} className="rounded-[2rem] border border-border bg-secondary/35 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ma don</p>
                      <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">
                        {order.orderNo || order.orderId}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 size={14} />
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                        <span>{order.paymentMethod}</span>
                        <span>{order.receiverName}</span>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tong tien</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(order.totalAmount ?? 0)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      to={`/payment-status?orderId=${encodeURIComponent(order.orderId)}&orderNo=${encodeURIComponent(order.orderNo ?? '')}&method=${encodeURIComponent(order.paymentMethod ?? 'COD')}`}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary-foreground transition hover:-translate-y-0.5"
                    >
                      <ReceiptText size={16} />
                      Xem chi tiet
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
