import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Link as LinkIcon, MessageCircle, Minus, Send, ShoppingBag, UserRound, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import {
  createCustomerRoomRequest,
  getCustomerActiveRoomRequest,
  getRoomMessagesRequest,
  sendCustomerMessageRequest,
  uploadChatAttachmentRequest,
} from '../../services/chat'
import { getProductDetail, getRecentProducts, mapProductDetailToSelection } from '../../services/catalog'

const toTime = (value) => {
  if (!value) return '--:--'

  try {
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

const asList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.data)) return data.data
  return []
}

const messageText = (message) => {
  return message?.content || message?.text || message?.message || message?.linkUrl || message?.imageUrl || message?.videoUrl || '[Không có nội dung]'
}

const messageTime = (message) => {
  return message?.sentAt || message?.createdAt || message?.timestamp
}

const messageSenderId = (message) => {
  return message?.senderId || message?.userId || message?.customerId || message?.staffId || ''
}

const emptyAttachmentDraft = () => ({
  imageUrl: '',
  videoUrl: '',
  linkUrl: '',
  productId: '',
  variantId: '',
  productName: '',
  productImageUrl: '',
  productPrice: '',
})

const formatPrice = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (Number.isNaN(number)) return String(value)
  return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

const canSendPayload = (type, content, draft, file) => {
  if (type === 'TEXT') return Boolean(content.trim())
  if (type === 'IMAGE') return Boolean(file || draft.imageUrl.trim())
  if (type === 'VIDEO') return Boolean(file || draft.videoUrl.trim())
  if (type === 'PRODUCT_LINK') return Boolean(draft.linkUrl.trim() && draft.productName.trim())
  return false
}

const buildPayload = (type, content, draft) => {
  const trimmedContent = content.trim()
  const payload = { type }
  if (trimmedContent) payload.content = trimmedContent
  if (type === 'IMAGE') payload.imageUrl = draft.imageUrl.trim()
  if (type === 'VIDEO') payload.videoUrl = draft.videoUrl.trim()
  if (type === 'PRODUCT_LINK') {
    payload.linkUrl = draft.linkUrl.trim()
    if (draft.productId) payload.productId = draft.productId
    if (draft.variantId) payload.variantId = draft.variantId
    payload.productName = draft.productName.trim()
    if (draft.productImageUrl.trim()) payload.productImageUrl = draft.productImageUrl.trim()
    if (draft.productPrice !== '') payload.productPrice = Number(draft.productPrice)
  }
  return payload
}

function MessageContent ({ message, mine, onAddProduct }) {
  const content = message?.content || message?.text || message?.message || ''

  if (message?.type === 'IMAGE' || message?.imageUrl) {
    return (
      <div className="space-y-2">
        <img src={message.imageUrl} alt={content || 'Ảnh chat'} className="max-h-56 w-full rounded-xl object-cover" />
        {content ? <p className="whitespace-pre-wrap break-words">{content}</p> : null}
      </div>
    )
  }

  if (message?.type === 'VIDEO' || message?.videoUrl) {
    return (
      <div className="space-y-2">
        <video src={message.videoUrl} controls className="max-h-56 w-full rounded-xl bg-black" />
        {content ? <p className="whitespace-pre-wrap break-words">{content}</p> : null}
      </div>
    )
  }

  if (message?.type === 'PRODUCT_LINK' || message?.linkUrl) {
    return (
      <div className={`space-y-2 rounded-xl p-2 ${mine ? 'bg-background/10' : 'bg-muted/60'}`}>
        {message.productImageUrl ? <img src={message.productImageUrl} alt={message.productName || 'Sản phẩm'} className="max-h-40 w-full rounded-lg object-cover" /> : null}
        <p className="font-semibold">{message.productName || 'Sản phẩm'}</p>
        {message.productPrice !== null && message.productPrice !== undefined ? <p className={mine ? 'text-background/70' : 'text-muted-foreground'}>{formatPrice(message.productPrice)}</p> : null}
        {content ? <p className="whitespace-pre-wrap break-words">{content}</p> : null}
        <button type="button" onClick={() => onAddProduct(message)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${mine ? 'bg-background text-foreground hover:bg-background/90' : 'bg-foreground text-background hover:bg-foreground/90'}`}>
          <ShoppingBag className="h-3 w-3" />
          Thêm vào giỏ
        </button>
      </div>
    )
  }

  return <p className="whitespace-pre-wrap break-words">{messageText(message)}</p>
}

export default function CustomerChatWidget () {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { addToCart } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [messageType, setMessageType] = useState('TEXT')
  const [attachmentDraft, setAttachmentDraft] = useState(emptyAttachmentDraft)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('')
  const [recentProducts, setRecentProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const userId = user?.userId || ''
  const roomId = room?.id || room?.roomId || ''
  const isClosed = Boolean(room?.isClosed ?? room?.closed)
  const hasMessages = messages.length > 0
  const title = useMemo(() => {
  if (!isAuthenticated) return 'Chat với người bán'
  if (isClosed) return 'Phòng chat đã đóng'
  return room?.staffId ? 'Đang chat với nhân viên' : 'Cần hỗ trợ?'
}, [isAuthenticated, isClosed, room?.staffId])
  const loadMessages = useCallback(async (nextRoomId, { silent = false } = {}) => {
    if (!nextRoomId || !userId) {
      setMessages([])
      return
    }

    try {
      if (!silent) setLoading(true)
      const data = await getRoomMessagesRequest({ roomId: nextRoomId, userId })
      setMessages(asList(data))
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [userId])

  const ensureRoom = useCallback(async ({ silent = false } = {}) => {
    if (!userId) return null

    try {
      if (!silent) setLoading(true)
      setError('')
      const nextRoom = await getCustomerActiveRoomRequest({ userId })
      setRoom(nextRoom)
      if (nextRoom?.id) {
        await loadMessages(nextRoom.id, { silent: true })
      }
      return nextRoom
    } catch (err) {
      try {
        const nextRoom = await createCustomerRoomRequest({ userId })
        setRoom(nextRoom)
        return nextRoom
      } catch (createErr) {
        setError(createErr.message || err.message)
        return null
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [loadMessages, userId])

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return
    setRecentProducts(getRecentProducts())
    ensureRoom()
  }, [ensureRoom, isAuthenticated, isOpen])

  useEffect(() => {
    return () => {
      if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
    }
  }, [attachmentPreviewUrl])

  useEffect(() => {
    if (!isOpen || !roomId || !userId) return

    const timer = window.setInterval(() => {
      loadMessages(roomId, { silent: true })
    }, 5000)

    return () => window.clearInterval(timer)
  }, [isOpen, loadMessages, roomId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, isOpen])

  const openChat = () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để chat với người bán.')
      navigate('/login')
      return
    }

    setIsOpen(true)
  }

  const resetAttachment = () => {
    if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
    setAttachmentDraft(emptyAttachmentDraft())
    setAttachmentFile(null)
    setAttachmentPreviewUrl('')
  }

  const selectMessageType = (type) => {
    setMessageType(type)
    resetAttachment()
    if (type === 'PRODUCT_LINK') setRecentProducts(getRecentProducts())
  }

  const handleAttachmentFileChange = (event) => {
    const file = event.target.files?.[0] || null
    if (attachmentPreviewUrl) window.URL.revokeObjectURL(attachmentPreviewUrl)
    setAttachmentFile(file)
    setAttachmentPreviewUrl(file ? window.URL.createObjectURL(file) : '')
  }

  const selectRecentProduct = (product) => {
    setAttachmentDraft({
      imageUrl: '',
      videoUrl: '',
      linkUrl: product.linkUrl || '',
      productId: product.productId || '',
      variantId: product.variantId || '',
      productName: product.productName || '',
      productImageUrl: product.productImageUrl || '',
      productPrice: product.productPrice ?? '',
    })
  }

  const addProductFromMessage = async (message) => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.')
      navigate('/login')
      return
    }

    try {
      const productId = message?.productId
      if (!productId) {
        toast.error('Tin nhắn thiếu mã sản phẩm')
        return
      }

      const detail = await getProductDetail(productId)
      const product = mapProductDetailToSelection(detail, {
        productId,
        name: message.productName,
        image: message.productImageUrl,
        price: message.productPrice,
      })
      const variant = product.variants.find((item) => item.id === message.variantId) || product.variants[0]

      if (!variant) {
        toast.error('Sản phẩm này chưa có biến thể để thêm vào giỏ')
        return
      }

      addToCart(product, variant, 1)
      toast.success('Đã thêm sản phẩm vào giỏ hàng.')
    } catch (err) {
      toast.error(err.message || 'Không thêm được sản phẩm vào giỏ hàng.')
    }
  }

  const sendMessage = async () => {
    if (!canSendPayload(messageType, input, attachmentDraft, attachmentFile) || sending || isClosed) return

    const content = input.trim()
    const activeRoom = room || await ensureRoom()
    const activeRoomId = activeRoom?.id || activeRoom?.roomId

    if (!activeRoomId) {
      setError('Không tìm thấy phòng chat.')
      return
    }

    let payload
    let pendingMessage

    try {
      setSending(true)
      setError('')
      let resolvedDraft = attachmentDraft
      if ((messageType === 'IMAGE' || messageType === 'VIDEO') && attachmentFile) {
        const uploaded = await uploadChatAttachmentRequest({ userId, file: attachmentFile })
        resolvedDraft = {
          ...attachmentDraft,
          imageUrl: messageType === 'IMAGE' ? uploaded.url : attachmentDraft.imageUrl,
          videoUrl: messageType === 'VIDEO' ? uploaded.url : attachmentDraft.videoUrl,
        }
      }
      payload = buildPayload(messageType, content, resolvedDraft)
      pendingMessage = {
        id: `local-${Date.now()}`,
        roomId: activeRoomId,
        senderId: userId,
        ...payload,
        sentAt: new Date().toISOString(),
        pending: true,
      }
      setInput('')
      resetAttachment()
      setMessages((prev) => [...prev, pendingMessage])
      await sendCustomerMessageRequest({ userId, roomId: activeRoomId, payload })
      await loadMessages(activeRoomId, { silent: true })
    } catch (err) {
      if (pendingMessage) setMessages((prev) => prev.filter((message) => message.id !== pendingMessage.id))
      setInput(content)
      if (payload) {
        setAttachmentDraft({
          imageUrl: payload.imageUrl || '',
          videoUrl: payload.videoUrl || '',
          linkUrl: payload.linkUrl || '',
          productId: payload.productId || '',
          variantId: payload.variantId || '',
          productName: payload.productName || '',
          productImageUrl: payload.productImageUrl || '',
          productPrice: payload.productPrice ?? '',
        })
      }
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={openChat}
        className="fixed bottom-6 right-6 z-[9999] inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-2xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Mở chat với người bán"
      >
        <MessageCircle className="h-5 w-5" />
        Chat với nhân viên
      </button>
    )
  }

  return (
    <section className="fixed bottom-6 right-6 z-[9999] flex h-[min(580px,calc(100vh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <header className="flex items-center justify-between border-b border-border bg-foreground px-4 py-3 text-background">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/15">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {/* <p className="text-xs text-background/70">{roomId ? `Phòng #${roomId.slice(0, 8)}` : 'Kết nối với nhân viên tư vấn'}</p> */}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full p-2 text-background/80 transition-colors hover:bg-background/10 hover:text-background"
          aria-label="Thu nhỏ chat"
        >
          <Minus className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/40 px-4 py-4">
        {loading ? <p className="text-sm text-muted-foreground">Đang tải cuộc trò chuyện...</p> : null}
        {error ? <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div> : null}
        {!loading && !hasMessages ? (
          <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
            Gửi lời nhắn đầu tiên, nhân viên sẽ trả lời bạn ngay khi nhận được.
          </div>
        ) : null}

        <div className="space-y-3">
          {messages.map((message, index) => {
            const mine = String(messageSenderId(message)) === String(userId)
            return (
              <div key={message.id || `${messageTime(message)}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-foreground text-background' : 'border border-border bg-background text-foreground'}`}>
                  <MessageContent message={message} mine={mine} onAddProduct={addProductFromMessage} />
                  <p className={`mt-1 text-[10px] ${mine ? 'text-background/65' : 'text-muted-foreground'}`}>
                    {message.pending ? 'Đang gửi' : toTime(messageTime(message))}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="border-t border-border bg-background p-3">
        {isClosed ? <p className="mb-2 text-xs text-muted-foreground">Phòng chat đã đóng</p> : null}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => selectMessageType('TEXT')} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${messageType === 'TEXT' ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            <MessageCircle className="h-3 w-3" />
            Tin nhắn
          </button>
          <button type="button" onClick={() => selectMessageType('IMAGE')} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${messageType === 'IMAGE' ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            <ImageIcon className="h-3 w-3" />
            Ảnh
          </button>
          <button type="button" onClick={() => selectMessageType('VIDEO')} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${messageType === 'VIDEO' ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            <Video className="h-3 w-3" />
            Video
          </button>
          <button type="button" onClick={() => selectMessageType('PRODUCT_LINK')} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${messageType === 'PRODUCT_LINK' ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            <LinkIcon className="h-3 w-3" />
            Sản phẩm
          </button>
        </div>
        {messageType === 'IMAGE' ? (
          <div className="mb-2 space-y-2">
            <input type="file" accept="image/*" onChange={handleAttachmentFileChange} disabled={sending || isClosed} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-3 file:py-1 file:text-xs file:text-background focus:border-foreground disabled:bg-muted" />
            {attachmentPreviewUrl ? <img src={attachmentPreviewUrl} alt="Xem trước" className="max-h-32 w-full rounded-xl object-cover" /> : null}
          </div>
        ) : null}
        {messageType === 'VIDEO' ? (
          <div className="mb-2 space-y-2">
            <input type="file" accept="video/*" onChange={handleAttachmentFileChange} disabled={sending || isClosed} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-foreground file:px-3 file:py-1 file:text-xs file:text-background focus:border-foreground disabled:bg-muted" />
            {attachmentPreviewUrl ? <video src={attachmentPreviewUrl} controls className="max-h-32 w-full rounded-xl bg-black" /> : null}
          </div>
        ) : null}
        {messageType === 'PRODUCT_LINK' ? (
          <div className="mb-2 space-y-2">
            <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-border p-2">
              {recentProducts.map((product) => (
                <button key={product.productId} type="button" onClick={() => selectRecentProduct(product)} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${attachmentDraft.productId === product.productId ? 'bg-muted' : 'hover:bg-muted/70'}`}>
                  {product.productImageUrl ? <img src={product.productImageUrl} alt={product.productName} className="h-12 w-12 rounded-lg object-cover" /> : <div className="h-12 w-12 rounded-lg bg-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{product.productName}</span>
                    <span className="block text-xs text-muted-foreground">{formatPrice(product.productPrice)}</span>
                  </span>
                </button>
              ))}
              {!recentProducts.length ? <p className="px-2 py-3 text-xs text-muted-foreground">Chưa có sản phẩm đã xem gần đây</p> : null}
            </div>
            {attachmentDraft.productName ? <p className="text-xs text-muted-foreground">Sản phẩm: {attachmentDraft.productName}</p> : null}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            disabled={sending || isClosed}
            placeholder={isClosed ? 'Phòng chat đã đóng' : 'Nhập tin nhắn...'}
            className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-foreground disabled:bg-muted"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!canSendPayload(messageType, input, attachmentDraft, attachmentFile) || sending || isClosed}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  )
}
