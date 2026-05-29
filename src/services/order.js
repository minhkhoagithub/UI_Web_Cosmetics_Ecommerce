import { apiRequest } from './http'

export const getMyOrderHistoryRequest = async () => {
  return apiRequest(
    '/v1/orders/history',
    {},
    'Không thể tải lịch sử đơn hàng lúc này.',
  )
}

export const getMyOrderDetailRequest = async (orderId) => {
  return apiRequest(
    `/v1/orders/${orderId}`,
    {},
    'Không thể tải chi tiết đơn hàng lúc này.',
  )
}

export const placeOrderRequest = async (payload) => {
  return apiRequest(
    '/v1/orders',
    {
      method: 'POST',
      body: payload,
    },
    'Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.',
  )
}
