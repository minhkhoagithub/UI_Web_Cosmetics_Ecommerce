import { useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import { sendAgentMessage } from '../../services/agentService'
import { getProductDetail, mapProductDetailToSelection } from '../../services/catalog'
import { getActiveProductPromotionsRequest } from '../../services/promotion'

const INITIAL_BOT_MESSAGE = {
  id: 'bot-welcome',
  sender: 'BOT',
  text: 'Xin chào! Mình là AI tư vấn mỹ phẩm. Bạn có thể hỏi mình về sản phẩm, chi tiết sản phẩm hoặc yêu cầu thêm sản phẩm vào giỏ hàng.',
  createdAt: new Date(),
}

const QUICK_SUGGESTIONS = [
  'Tìm kem chống nắng cho da dầu dưới 300k',
  'Cho tôi xem chi tiết serum Vitamin C',
  'Thêm 2 chai serum Vitamin C vào giỏ hàng',
]

const createMessage = (sender, text) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  sender,
  text,
  createdAt: new Date(),
})

const formatTime = (value) => {
  try {
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function ChatAgent () {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([INITIAL_BOT_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const isSendingRef = useRef(false)

  const userId = user?.userId || user?.id || null

  const syncCartFromAgentResult = async (agentResponse) => {
    if (agentResponse?.action !== 'ADD_TO_CART') {
      return
    }

    const result = agentResponse.toolResult
    if (!result?.success) {
      return
    }

    const productId = result.productId
    const variantId = result.variantId
    if (!productId || !variantId) {
      throw new Error('AI Agent đã thêm sản phẩm nhưng thiếu dữ liệu để đồng bộ giỏ hàng UI.')
    }

    const [detail, activePromotions] = await Promise.all([
      getProductDetail(productId),
      getActiveProductPromotionsRequest().catch(() => []),
    ])
    const product = mapProductDetailToSelection(detail, {
      productId,
      name: result.productName,
      price: result.unitPrice,
    }, activePromotions)
    const variant = product.variants.find((item) => item.id === variantId)
      || product.variants.find((item) => item.sku === result.sku)
      || product.variants[0]

    if (!variant) {
      throw new Error('Không tìm thấy biến thể sản phẩm để đồng bộ giỏ hàng UI.')
    }

    addToCart(product, variant, Number(result.quantity ?? 1))
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isLoading, isOpen])

  const sendMessage = async (messageText = input) => {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage || isSendingRef.current) {
      return
    }

    isSendingRef.current = true
    setInput('')
    setIsLoading(true)
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('USER', trimmedMessage),
    ])

    try {
      const response = await sendAgentMessage({
        userId,
        message: trimmedMessage,
      })

      try {
        await syncCartFromAgentResult(response)
      } catch (syncError) {
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage('BOT', syncError.message || 'Sản phẩm đã được thêm trên hệ thống nhưng UI chưa đồng bộ được giỏ hàng. Bạn vui lòng tải lại trang rồi kiểm tra lại.'),
        ])
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('BOT', response.reply),
      ])
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('BOT', 'Xin lỗi, hiện tại mình chưa thể kết nối với AI Agent. Bạn vui lòng thử lại sau.'),
      ])
    } finally {
      isSendingRef.current = false
      setIsLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[9998] inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 sm:right-6"
        aria-label="Mở AI tư vấn mỹ phẩm"
      >
        <MessageCircle className="h-5 w-5" />
        AI tư vấn
      </button>
    )
  }

  return (
    <section className="fixed bottom-24 right-4 z-[9998] flex h-[min(520px,calc(100vh-120px))] w-[min(384px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xl sm:right-6">
      <header className="flex items-center justify-between bg-rose-600 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">AI tư vấn mỹ phẩm</h2>
            <p className="text-xs text-white/75">Tìm sản phẩm, xem chi tiết, hỗ trợ giỏ hàng</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Đóng AI tư vấn mỹ phẩm"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="border-b border-rose-100 bg-rose-50/80 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
          <Sparkles className="h-3.5 w-3.5" />
          Gợi ý nhanh
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => sendMessage(suggestion)}
              disabled={isLoading}
              className="shrink-0 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
        {messages.map((message) => {
          const isUserMessage = message.sender === 'USER'
          return (
            <div key={message.id} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  isUserMessage
                    ? 'rounded-br-md bg-rose-600 text-white'
                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap break-words leading-5">{message.text}</p>
                <p className={`mt-1 text-[10px] ${isUserMessage ? 'text-white/70' : 'text-slate-400'}`}>
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          )
        })}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
              AI đang trả lời...
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Nhập câu hỏi..."
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            aria-label="Gửi tin nhắn cho AI tư vấn"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  )
}
