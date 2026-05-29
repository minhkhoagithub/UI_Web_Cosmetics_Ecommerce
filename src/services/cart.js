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

export const updateCartItemQuantityRequest = async ({ userId, variantId, quantity }) => {
  return apiRequest(
    `/v1/carts/items/${encodeURIComponent(variantId)}`,
    {
      method: 'PATCH',
      userId,
      body: {
        quantity,
      },
    },
    'Không thể cập nhật giỏ hàng trên hệ thống.',
  )
}

export const removeCartItemRequest = async ({ userId, variantId }) => {
  return apiRequest(
    `/v1/carts/items/${encodeURIComponent(variantId)}`,
    {
      method: 'DELETE',
      userId,
    },
    'Không thể xóa sản phẩm khỏi giỏ hàng trên hệ thống.',
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
