import { apiRequest, buildQueryString } from './http'

export const PROMOTION_TYPES = Object.freeze({
  ORDER_DISCOUNT: 'ORDER_DISCOUNT',
  PRODUCT_DISCOUNT: 'PRODUCT_DISCOUNT',
  BUY_X_GET_Y: 'BUY_X_GET_Y',
})

const PROMOTION_TYPE_VALUES = Object.values(PROMOTION_TYPES)

const requireText = (value, fieldName) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} không hợp lệ.`)
  }

  return value.trim()
}

const toFiniteNumber = (value, fieldName) => {
  const nextValue = Number(value)

  if (!Number.isFinite(nextValue)) {
    throw new Error(`${fieldName} không hợp lệ.`)
  }

  return nextValue
}

const toPositiveInteger = (value, fieldName) => {
  const nextValue = Number(value)

  if (!Number.isInteger(nextValue) || nextValue < 1) {
    throw new Error(`${fieldName} phai la so nguyen duong.`)
  }

  return nextValue
}

const normalizeIdList = (values, fieldName) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${fieldName} không được để trống.`)
  }

  const normalizedValues = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)

  if (normalizedValues.length === 0) {
    throw new Error(`${fieldName} không được để trống.`)
  }

  return normalizedValues
}

const toLocalDateTimeString = (value) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error('Thời gian khuyến mãi không hợp lệ.')
  }

  const pad = (part) => String(part).padStart(2, '0')

  // Backend dung LocalDateTime, nen frontend gui chuoi local thay vi ISO UTC.
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
}

const buildDiscountShape = ({ discountPercent, discountAmount }) => {
  const hasDiscountPercent = discountPercent !== undefined && discountPercent !== null && discountPercent !== ''
  const hasDiscountAmount = discountAmount !== undefined && discountAmount !== null && discountAmount !== ''

  if (hasDiscountPercent === hasDiscountAmount) {
    throw new Error('Chỉ được truyền một trong hai giá trị discountPercent hoặc discountAmount.')
  }

  if (hasDiscountPercent) {
    return {
      discountPercent: toFiniteNumber(discountPercent, 'discountPercent'),
    }
  }

  return {
    discountAmount: toFiniteNumber(discountAmount, 'discountAmount'),
  }
}

export const buildPromotionConfig = (type, config = {}) => {
  switch (type) {
    case PROMOTION_TYPES.ORDER_DISCOUNT:
      {
        const orderConfig = {
          ...buildDiscountShape(config),
          minOrderValue: toFiniteNumber(config.minOrderValue ?? 0, 'minOrderValue'),
        }

        if (config.maxDiscountAmount !== undefined && config.maxDiscountAmount !== null && config.maxDiscountAmount !== '') {
          orderConfig.maxDiscountAmount = toFiniteNumber(config.maxDiscountAmount, 'maxDiscountAmount')
        }
        orderConfig.targetCustomerIds = normalizeIdList(config.targetCustomerIds, 'targetCustomerIds')
        return orderConfig
      }
    case PROMOTION_TYPES.PRODUCT_DISCOUNT:
      return {
        ...buildDiscountShape(config),
        variantIds: normalizeIdList(config.variantIds, 'variantIds'),
      }
    case PROMOTION_TYPES.BUY_X_GET_Y:
      return {
        buyVariantId: requireText(config.buyVariantId, 'buyVariantId'),
        getVariantId: requireText(config.getVariantId, 'getVariantId'),
        buyQuantity: toPositiveInteger(config.buyQuantity, 'buyQuantity'),
        getQuantity: toPositiveInteger(config.getQuantity, 'getQuantity'),
      }
    default:
      throw new Error('Loại khuyến mãi không hợp lệ.')
  }
}

export const buildPromotionPayload = ({
  code,
  name,
  type,
  config,
  startDate,
  endDate,
  usageLimit,
  active = true,
}) => {
  const normalizedType = requireText(type, 'Loại khuyến mãi')

  if (!PROMOTION_TYPE_VALUES.includes(normalizedType)) {
    throw new Error('Loại khuyến mãi không hợp lệ.')
  }

  return {
    code: requireText(code, 'Mã khuyến mãi').toUpperCase(),
    name: requireText(name, 'Tên khuyến mãi'),
    type: normalizedType,
    config: buildPromotionConfig(normalizedType, config),
    startDate: toLocalDateTimeString(startDate),
    endDate: toLocalDateTimeString(endDate),
    usageLimit:
      usageLimit === undefined || usageLimit === null || usageLimit === ''
        ? null
        : toPositiveInteger(usageLimit, 'usageLimit'),
    active: Boolean(active),
  }
}

export const createPromotionRequest = async (payload) => {
  return apiRequest(
    '/v1/promotions',
    {
      method: 'POST',
      body: buildPromotionPayload(payload),
    },
    'Không thể tạo khuyến mãi. Vui lòng kiểm tra lại thông tin.',
  )
}

export const getActiveProductPromotionsRequest = async () => {
  return apiRequest(
    `/v1/promotions/active${buildQueryString({ type: PROMOTION_TYPES.PRODUCT_DISCOUNT })}`,
    { auth: false },
    'Không thể tải khuyến mãi sản phẩm lúc này.',
  )
}

export const getMyOrderVouchersRequest = async () => {
  return apiRequest(
    '/v1/promotions/my-vouchers',
    {},
    'Không thể tải voucher của tài khoản lúc này.',
  )
}

export const validatePromotionCodeRequest = async ({ promotionCode, subtotal, items }) => {
  return apiRequest(
    '/v1/promotions/validate',
    {
      method: 'POST',
      body: {
        promotionCode,
        subtotal,
        items,
      },
    },
    'Mã khuyến mãi không hợp lệ hoặc không áp dụng được cho đơn hàng này.',
  )
}

export const updatePromotionRequest = async (promotionId, payload) => {
  return apiRequest(
    `/v1/promotions/${promotionId}`,
    {
      method: 'PUT',
      body: buildPromotionPayload(payload),
    },
    'Không thể cập nhật khuyến mãi. Vui lòng kiểm tra lại thông tin.',
  )
}

export const deactivatePromotionRequest = async (promotionId) => {
  return apiRequest(
    `/v1/promotions/${promotionId}/deactivate`,
    {
      method: 'POST',
    },
    'Không thể ngừng kích hoạt khuyến mãi này.',
  )
}

export const deletePromotionRequest = async (promotionId) => {
  return apiRequest(
    `/v1/promotions/${promotionId}`,
    {
      method: 'DELETE',
    },
    'Không thể xóa khuyến mãi này.',
  )
}
