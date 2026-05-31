import { apiRequest } from './http'

export const getCustomerActiveRoomRequest = ({ userId }) => {
  return apiRequest(
    '/v1/chat/customer/rooms/active',
    { userId },
    'Không tải được phòng chat. Vui lòng thử lại.',
  )
}

export const createCustomerRoomRequest = ({ userId }) => {
  return apiRequest(
    '/v1/chat/customer/rooms',
    { method: 'POST', userId },
    'Không tạo được phòng chat. Vui lòng thử lại.',
  )
}

export const getRoomMessagesRequest = ({ roomId, userId }) => {
  return apiRequest(
    `/v1/chat/rooms/${roomId}/messages`,
    { userId },
    'Không tải được tin nhắn. Vui lòng thử lại.',
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
    'Không upload được tệp đính kèm. Vui lòng thử lại.',
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
    'Không gửi được tin nhắn. Vui lòng thử lại.',
  )
}
