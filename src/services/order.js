import { apiRequest } from './http'

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
