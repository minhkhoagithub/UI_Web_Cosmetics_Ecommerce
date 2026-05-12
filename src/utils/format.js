export const formatCurrency = (value) => {
  const amount = Number(value ?? 0)

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export const formatRating = (value) => {
  const rating = Number(value ?? 0)
  return Number.isFinite(rating) ? rating.toFixed(1) : '0.0'
}

export const formatPaymentStatusLabel = (status) => {
  switch (status) {
    case 'SUCCESS':
      return 'Thanh toán thành công'
    case 'FAILED':
      return 'Thanh toán thất bại'
    case 'CANCELLED':
      return 'Đã huỷ giao dịch'
    case 'EXPIRED':
      return 'Giao dịch hết hạn'
    case 'PENDING':
      return 'Đang chờ thanh toán'
    case 'PAID':
      return 'Đã thanh toán'
    case 'UNPAID':
      return 'Chưa thanh toán'
    default:
      return status ?? 'Không xác định'
  }
}

export const getPaymentStatusTone = (status) => {
  switch (status) {
    case 'SUCCESS':
    case 'PAID':
      return 'bg-emerald-100 text-emerald-700'
    case 'FAILED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'bg-rose-100 text-rose-700'
    case 'PENDING':
    case 'UNPAID':
    default:
      return 'bg-amber-100 text-amber-700'
  }
}
