import { apiRequest } from './http'

export const getCustomerActiveRoomRequest = ({ userId }) => {
  return apiRequest(
    '/v1/chat/customer/rooms/active',
    { userId },
    'Khong tai duoc phong chat. Vui long thu lai.',
  )
}

export const createCustomerRoomRequest = ({ userId }) => {
  return apiRequest(
    '/v1/chat/customer/rooms',
    { method: 'POST', userId },
    'Khong tao duoc phong chat. Vui long thu lai.',
  )
}

export const getRoomMessagesRequest = ({ roomId, userId }) => {
  return apiRequest(
    `/v1/chat/rooms/${roomId}/messages`,
    { userId },
    'Khong tai duoc tin nhan. Vui long thu lai.',
  )
}

export const uploadChatAttachmentRequest = ({ userId, file }) => {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest(
    '/v1/chat/attachments',
    {
      method: 'POST',
      userId,
      body: formData,
    },
    'Khong upload duoc tep dinh kem. Vui long thu lai.',
  )
}

export const sendCustomerMessageRequest = ({ userId, roomId, payload }) => {
  return apiRequest(
    '/v1/chat/customer/messages',
    {
      method: 'POST',
      userId,
      body: {
        roomId,
        ...payload,
      },
    },
    'Khong gui duoc tin nhan. Vui long thu lai.',
  )
}
