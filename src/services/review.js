import { apiRequest, buildQueryString } from './http'

export const getProductReviewsRequest = async (productId) => {
  return apiRequest(
    `/v1/reviews${buildQueryString({ productId })}`,
    {
      auth: false,
    },
    'Không thể tải danh sách đánh giá cho sản phẩm này.',
  )
}

export const getReviewEligibilityRequest = async (productId) => {
  return apiRequest(
    `/v1/reviews/eligibility${buildQueryString({ productId })}`,
    {},
    'Không thể kiểm tra quyền đánh giá lúc này.',
  )
}

export const createReviewRequest = async ({ userId, productId, orderId, rating, content }) => {
  return apiRequest(
    '/v1/reviews',
    {
      method: 'POST',
      body: {
        userId,
        productId,
        orderId,
        rating: Number(rating),
        content: content?.trim() || null,
      },
    },
    'Không thể gửi đánh giá lúc này. Vui lòng thử lại.',
  )
}

export const deleteReviewRequest = async (reviewId, userId) => {
  return apiRequest(
    `/v1/reviews/${reviewId}${buildQueryString({ userId })}`,
    {
      method: 'DELETE',
    },
    'Không thể xóa đánh giá lúc này.',
  )
}
