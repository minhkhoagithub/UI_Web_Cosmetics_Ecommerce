import { apiRequest, buildQueryString } from './http'

export const getCurrentUserProfileRequest = async () => {
  return apiRequest('/v1/users/profile', {}, 'Khong the tai thong tin tai khoan hien tai.')
}

export const getAddressesRequest = async ({ userId }) => {
  return apiRequest(
    '/v1/addresses',
    {
      method: 'GET',
      userId,
    },
    'Khong the tai danh sach dia chi giao hang. Vui long thu lai.',
  )
}

export const updateUserProfileRequest = async ({ email, phone, fullName, avatar }) => {
  return apiRequest(
    '/v1/users/profile',
    {
      method: 'PUT',
      body: {
        email,
        phone,
        full_name: fullName,
        avatar,
      },
    },
    'Khong the cap nhat ho so. Vui long thu lai.',
  )
}

export const confirmOldEmailChangeRequest = async ({ newEmail, otp }) => {
  return apiRequest(
    `/v1/users/confirm/email-change/old${buildQueryString({ newEmail, otp })}`,
    {
      method: 'POST',
    },
    'Khong the xac thuc email cu. Vui long thu lai.',
  )
}

export const verifyNewEmailChangeRequest = async ({ newEmail, otp }) => {
  return apiRequest(
    `/v1/users/confirm/email-change${buildQueryString({ newEmail, otp })}`,
    {
      method: 'POST',
    },
    'Khong the xac thuc email moi. Vui long thu lai.',
  )
}

const buildAddressPayload = ({ receiverName, phone, address, city, district, ward, isDefault }) => ({
  receiver_name: receiverName,
  phone,
  address,
  city,
  district,
  ward,
  is_default: isDefault,
})

export const createAddressRequest = async (payload) => {
  const { userId, ...addressPayload } = payload
  return apiRequest(
    '/v1/addresses',
    {
      method: 'POST',
      userId,
      body: buildAddressPayload(addressPayload),
    },
    'Khong the them dia chi giao hang. Vui long thu lai.',
  )
}

export const updateAddressRequest = async (addressId, payload) => {
  const { userId, ...addressPayload } = payload
  return apiRequest(
    `/v1/addresses/${addressId}`,
    {
      method: 'PUT',
      userId,
      body: buildAddressPayload(addressPayload),
    },
    'Khong the cap nhat dia chi giao hang. Vui long thu lai.',
  )
}

export const deleteAddressRequest = async (addressId, { userId }) => {
  return apiRequest(
    `/v1/addresses/${addressId}`,
    {
      method: 'DELETE',
      userId,
    },
    'Khong the xoa dia chi giao hang. Vui long thu lai.',
  )
}
