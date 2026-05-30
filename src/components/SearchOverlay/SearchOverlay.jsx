import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, SearchIcon, X } from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useCart } from '../../context/CartProvider'
import { getProductDetail, getProductSuggestions, mapSearchItemToCard, searchProducts, searchProductsByImage } from '../../services/catalog'
import { getActiveProductPromotionsRequest } from '../../services/promotion'
import { formatCurrency } from '../../utils/format'

const SearchOverlay = ({ onProductClick }) => {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery } = useCart()
  const inputRef = useRef(null)
  const imageInputRef = useRef(null)
  const deferredQuery = useDeferredValue(searchQuery)
  const [suggestions, setSuggestions] = useState([])
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImageName, setSelectedImageName] = useState('')

  useEffect(() => {
    if (isSearchOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setSuggestions([])
      setResults([])
      setSelectedImageName('')
    }
  }, [isSearchOpen, setSearchQuery])

  const handleImageSearch = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setSelectedImageName(file.name)
    setIsLoading(true)
    setSuggestions([])

    try {
      const searchResponse = await searchProductsByImage({ file, size: 6 })
      const payload = searchResponse?.result ?? searchResponse
      const extractedQuery = searchResponse?.extractedQuery ?? ''
      const items = Array.isArray(payload?.items) ? payload.items : []

      if (extractedQuery) {
        setSearchQuery(extractedQuery)
      }

      setResults(items.map((item) => mapSearchItemToCard(item)))

      const [activePromotions, details] = await Promise.all([
        getActiveProductPromotionsRequest().catch(() => []),
        Promise.allSettled(items.map((item) => getProductDetail(item.productId))),
      ])

      const detailById = new Map()
      details.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          detailById.set(items[index].productId, result.value)
        }
      })

      setResults(items.map((item) => mapSearchItemToCard(item, detailById.get(item.productId), activePromotions)))
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isSearchOpen) {
      return
    }

    if (!deferredQuery.trim()) {
      setSuggestions([])
      setResults([])
      return
    }

    let isSubscribed = true

    const loadSearchData = async () => {
      setIsLoading(true)

      try {
        const [suggestionResponse, searchResponse] = await Promise.all([
          getProductSuggestions(deferredQuery.trim()),
          searchProducts({ q: deferredQuery.trim(), size: 6 }),
        ])

        if (!isSubscribed) {
          return
        }

        setSuggestions(suggestionResponse)
        setResults(searchResponse.items.map((item) => mapSearchItemToCard(item)))

        const [activePromotions, details] = await Promise.all([
          getActiveProductPromotionsRequest().catch(() => []),
          Promise.allSettled(searchResponse.items.map((item) => getProductDetail(item.productId))),
        ])

        if (!isSubscribed) {
          return
        }

        const detailById = new Map()
        details.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            detailById.set(searchResponse.items[index].productId, result.value)
          }
        })

        setResults(searchResponse.items.map((item) => mapSearchItemToCard(item, detailById.get(item.productId), activePromotions)))
      } catch {
        if (isSubscribed) {
          setSuggestions([])
          setResults([])
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    loadSearchData()

    return () => {
      isSubscribed = false
    }
  }, [deferredQuery, isSearchOpen])

  return (
    <AnimatePresence>
      {isSearchOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overlay-backdrop"
            onClick={() => setIsSearchOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 right-0 top-0 z-50 bg-background shadow-2xl"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="mb-6 flex items-center gap-4">
                <SearchIcon size={22} className="shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  value={searchQuery}
                  type="text"
                  placeholder="Tìm theo tên, dòng sản phẩm hoặc nhu cầu chăm sóc da..."
                  className="flex-1 bg-transparent font-body text-lg text-foreground outline-none placeholder:text-muted-foreground"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSearch}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
                  title="Tìm bằng hình ảnh"
                >
                  <ImagePlus size={20} className="text-foreground" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
                >
                  <X size={20} className="text-foreground" />
                </button>
              </div>

              {searchQuery.trim() || selectedImageName ? (
                <div className="max-h-[60vh] overflow-auto border-t border-border pt-4">
                  {selectedImageName ? (
                    <p className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      Ảnh đã chọn: {selectedImageName}
                    </p>
                  ) : null}
                  {suggestions.length > 0 ? (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.source}-${suggestion.text}`}
                          type="button"
                          onClick={() => setSearchQuery(suggestion.text)}
                          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:border-foreground hover:text-foreground"
                        >
                          {suggestion.text}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {isLoading ? (
                    <p className="py-8 text-center text-muted-foreground">Đang tìm sản phẩm phù hợp...</p>
                  ) : results.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Không tìm thấy sản phẩm phù hợp với "{searchQuery}"</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">{results.length} kết quả</p>

                      {results.map((product) => (
                        <motion.button
                          key={product.productId}
                          type="button"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex w-full items-center gap-4 rounded-sm p-3 text-left transition-colors hover:bg-muted"
                          onClick={() => {
                            onProductClick(product)
                            setIsSearchOpen(false)
                          }}
                        >
                          <div className="flex h-16 w-16 items-center justify-center bg-secondary text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            Sản phẩm
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</p>
                            <h4 className="truncate font-display text-base font-medium text-foreground">{product.name}</h4>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className={product.onPromotion ? 'text-sm font-semibold text-rose-700' : 'text-sm font-semibold text-foreground'}>
                                {formatCurrency(product.price)}
                              </p>
                              {product.onPromotion ? (
                                <>
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                                    {product.promotionLabel || 'Khuyến mãi'}
                                  </span>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(product.originalPrice)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
                  Bắt đầu nhập từ khóa để gọi endpoint tìm kiếm và gợi ý từ backend.
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

export default SearchOverlay
