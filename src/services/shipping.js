import { apiRequest } from './http'

export const quoteShippingFeeRequest = async ({
  shippingProvider,
  shipAddress,
  shipCity,
  shipDistrict,
  shipWard,
  orderValue,
  itemQuantity,
}) => {
  return apiRequest(
    '/v1/orders/shipping-fee/quote',
    {
      method: 'POST',
      auth: false,
      body: {
        shippingProvider,
        shipAddress: shipAddress?.trim() || null,
        shipCity: shipCity?.trim() || '',
        shipDistrict: shipDistrict?.trim() || '',
        shipWard: shipWard?.trim() || null,
        orderValue: Number(orderValue || 0),
        itemQuantity: Number(itemQuantity || 0),
      },
    },
    'Không thể tính phí vận chuyển từ GHTK lúc này.',
  )
}
