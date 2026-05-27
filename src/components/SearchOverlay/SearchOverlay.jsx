import { AnimatePresence, motion } from 'framer-motion'
import { SearchIcon, X } from 'lucide-react'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { useCart } from '../../context/CartProvider'
import { getProductSuggestions, mapSearchItemToCard, searchProducts } from '../../services/catalog'
import { formatCurrency } from '../../utils/format'

const SearchOverlay = ({ onProductClick }) => {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery } = useCart()
  const inputRef = useRef(null)
  const deferredQuery = useDeferredValue(searchQuery)
  const [suggestions, setSuggestions] = useState([])
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isSearchOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setSuggestions([])
      setResults([])
    }
  }, [isSearchOpen, setSearchQuery])

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
                  placeholder="Tim theo ten, dong san pham hoac insight cham soc da..."
                  className="flex-1 bg-transparent font-body text-lg text-foreground outline-none placeholder:text-muted-foreground"
                />

                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="cursor-pointer rounded-full p-2 transition-colors hover:bg-muted"
                >
                  <X size={20} className="text-foreground" />
                </button>
              </div>

              {searchQuery.trim() ? (
                <div className="max-h-[60vh] overflow-auto border-t border-border pt-4">
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
                    <p className="py-8 text-center text-muted-foreground">Dang tim san pham phu hop...</p>
                  ) : results.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Khong tim thay san pham phu hop voi "{searchQuery}"</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">{results.length} ket qua</p>

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
                            Item
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</p>
                            <h4 className="truncate font-display text-base font-medium text-foreground">{product.name}</h4>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(product.price)}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
                  Bat dau nhap tu khoa de goi endpoint tim kiem va goi y tu backend.
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
