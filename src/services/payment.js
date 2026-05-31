import { apiRequest } from './http'

export const getPaymentByOrderRequest = async (orderId) => {
  return apiRequest(`/v1/payments/order/${orderId}`, {}, 'Không thể tải trạng thái thanh toán.')
}

export const getPaymentByTransactionRequest = async (transactionId) => {
  return apiRequest(`/v1/payments/${transactionId}`, {}, 'Không thể tải giao dịch thanh toán.')
}

export const createPaymentRequest = async (orderId) => {
  return apiRequest(
    '/v1/payments/create',
    {
      method: 'POST',
      body: {
        orderId,
      },
    },
    'Không thể khởi tạo lại giao dịch thanh toán.',
  )
}
