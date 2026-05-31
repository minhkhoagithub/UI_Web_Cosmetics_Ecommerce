import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { getProductDetail, mapSearchItemToCard, searchProducts } from '../../services/catalog'
import { getActiveProductPromotionsRequest } from '../../services/promotion'
import ProductCard from '../ProductCard/ProductCard'

const Products = ({ setSelectedProduct }) => {
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isSubscribed = true

    const loadProducts = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [response, activePromotions] = await Promise.all([
          searchProducts({ size: 50 }),
          getActiveProductPromotionsRequest().catch(() => []),
        ])
        if (!isSubscribed) {
          return
        }

        const baseCards = response.items.map((item) => mapSearchItemToCard(item))
        setProducts(baseCards)

        const details = await Promise.allSettled(response.items.map((item) => getProductDetail(item.productId)))
        if (!isSubscribed) {
          return
        }

        const detailById = new Map()
        details.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            detailById.set(response.items[index].productId, result.value)
          }
        })

        setProducts(response.items.map((item) => mapSearchItemToCard(item, detailById.get(item.productId), activePromotions)))
      } catch (error) {
        if (isSubscribed) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isSubscribed = false
    }
  }, [])

  const categories = useMemo(
    () => ['Tất cả', ...Array.from(new Set(products.map((product) => product.category).filter(Boolean)))],
    [products],
  )

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'Tất cả') {
      return products
    }

    return products.filter((product) => product.category === activeCategory)
  }, [activeCategory, products])

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('Tất cả')
    }
  }, [activeCategory, categories])

  return (
    <section id="product" className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <p className="mb-3 font-body text-sm uppercase tracking-[0.3em] text-muted-foreground">Bộ sưu tập chọn lọc</p>
        <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">Sản phẩm nổi bật</h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <LoaderCircle className="animate-spin text-foreground" size={28} />
        </div>
      ) : errorMessage ? (
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-8 text-center text-rose-700">
          {errorMessage}
        </div>
      ) : (
        <>
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`cursor-pointer px-5 py-2 text-sm tracking-wider transition-colors ${
                  activeCategory === category
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-[2rem] border border-border px-6 py-10 text-center text-muted-foreground">
              Không có sản phẩm phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.productId} product={product} index={index} onProductClick={setSelectedProduct} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default Products
