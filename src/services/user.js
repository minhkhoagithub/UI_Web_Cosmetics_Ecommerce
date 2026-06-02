import { apiRequest, buildQueryString } from './http'
import { normalizeMediaUrl } from './media'

const normalizeUserProfile = (profile) => (
  profile
    ? {
        ...profile,
        avatarUrl: normalizeMediaUrl(profile.avatarUrl),
      }
    : profile
)

export const getCurrentUserProfileRequest = async () => {
  const profile = await apiRequest('/v1/users/profile', {}, 'Không thể tải thông tin tài khoản hiện tại.')
  return normalizeUserProfile(profile)
}

export const getAddressesRequest = async ({ userId }) => {
  return apiRequest(
    '/v1/addresses',
    {
      method: 'GET',
      userId,
    },
    'Không thể tải danh sách địa chỉ giao hàng. Vui lòng thử lại.',
  )
}

// export const updateUserProfileRequest = async ({ email, phone, fullName, avatar }) => {
//   return apiRequest(
//     '/v1/users/profile',
//     {
//       method: 'PUT',
//       body: {
//         email,
//         phone,
//         full_name: fullName,
//         avatar,
//       },
//     },
//     'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
//   )
// }

export const updateUserProfileRequest = async ({
  email,
  phone,
  fullName,
  avatar,
  avatarFile,
}) => {
  const formData = new FormData()

  formData.append('email', email)
  formData.append('phone', phone)
  formData.append('fullName', fullName)

  if (avatar) {
    formData.append('avatar', avatar)
  }

  if (avatarFile) {
    formData.append('avatarFile', avatarFile)
  }

  const profile = await apiRequest(
    '/v1/users/profile',
    {
      method: 'PUT',
      body: formData,
      headers: {}, // để browser tự set multipart/form-data
    },
    'Không thể cập nhật hồ sơ. Vui lòng thử lại.',
  )

  return normalizeUserProfile(profile)
}



export const confirmOldEmailChangeRequest = async ({ newEmail, otp }) => {
  return apiRequest(
    `/v1/users/confirm/email-change/old${buildQueryString({ newEmail, otp })}`,
    {
      method: 'POST',
    },
    'Không thể xác thực email cũ. Vui lòng thử lại.',
  )
}

export const verifyNewEmailChangeRequest = async ({ newEmail, otp }) => {
  return apiRequest(
    `/v1/users/confirm/email-change${buildQueryString({ newEmail, otp })}`,
    {
      method: 'POST',
    },
    'Không thể xác thực email mới. Vui lòng thử lại.',
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
    'Không thể thêm địa chỉ giao hàng. Vui lòng thử lại.',
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
    'Không thể cập nhật địa chỉ giao hàng. Vui lòng thử lại.',
  )
}

export const deleteAddressRequest = async (addressId, { userId }) => {
  return apiRequest(
    `/v1/addresses/${addressId}`,
    {
      method: 'DELETE',
      userId,
    },
    'Không thể xóa địa chỉ giao hàng. Vui lòng thử lại.',
  )
}
