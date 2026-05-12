import { apiRequest } from './http'

export const addCartItemRequest = async ({ userId, variantId, quantity }) => {
  return apiRequest(
    '/v1/carts/items',
    {
      method: 'POST',
      userId,
      body: {
        variantId,
        quantity,
      },
    },
    'Không thể thêm sản phẩm vào giỏ hàng hệ thống.',
  )
}

export const archiveActiveCartRequest = async ({ userId }) => {
  return apiRequest(
    '/v1/carts/active',
    {
      method: 'DELETE',
      userId,
    },
    'Không thể làm mới giỏ hàng trước khi thanh toán.',
  )
}
