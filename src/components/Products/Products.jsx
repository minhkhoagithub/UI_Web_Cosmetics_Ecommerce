import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { getProductDetail, mapSearchItemToCard, searchProducts } from '../../services/catalog'
import { getActiveProductPromotionsRequest } from '../../services/promotion'
import ProductCard from '../ProductCard/ProductCard'

const FEATURE_FILTERS = [
  {
    key: 'all',
    label: 'Tất cả',
    sort: 'relevance',
    eyebrow: 'Bộ sưu tập chọn lọc',
    title: 'Sản phẩm nổi bật',
  },
  {
    key: 'newest',
    label: 'Sản phẩm mới',
    sort: 'newest',
    eyebrow: 'Vừa cập nhật',
    title: 'Sản phẩm mới',
  },
  {
    key: 'best_seller',
    label: 'Bán chạy nhất',
    sort: 'best_seller',
    eyebrow: 'Được yêu thích',
    title: 'Sản phẩm bán chạy nhất',
  },
]

const categoryFilterKey = (category) => `category:${category}`

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const hasBestSellerTag = (product) =>
  (product?.tags ?? []).some((tag) => {
    const normalizedValues = [tag?.id, tag?.code, tag?.name].map(normalizeText)
    return normalizedValues.some((value) => ['tag_ban_chay', 'ban-chay', 'ban chay'].includes(value))
  })

const hasNewProductTag = (product) =>
  (product?.tags ?? []).some((tag) => {
    const normalizedValues = [tag?.id, tag?.code, tag?.name].map(normalizeText)
    return normalizedValues.some((value) => ['tag_san_pham_moi', 'san-pham-moi', 'san pham moi'].includes(value))
  })

const Products = ({ setSelectedProduct, activeFilter = 'all', onFilterChange }) => {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const activeFeatureFilter = FEATURE_FILTERS.find((filter) => filter.key === activeFilter)
  const activeSort = activeFeatureFilter?.sort ?? 'relevance'

  useEffect(() => {
    let isSubscribed = true

    const loadProducts = async () => {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const [response, activePromotions] = await Promise.all([
          searchProducts({ size: 50, sort: activeSort }),
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
  }, [activeSort])

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))),
    [products],
  )

  const filterOptions = useMemo(
    () => [
      ...FEATURE_FILTERS,
      ...categories.map((category) => ({
        key: categoryFilterKey(category),
        label: category,
      })),
    ],
    [categories],
  )

  const activeCategory = activeFilter.startsWith('category:') ? activeFilter.slice('category:'.length) : ''
  const activeFilterMeta =
    filterOptions.find((filter) => filter.key === activeFilter) ??
    FEATURE_FILTERS[0]

  const filteredProducts = useMemo(() => {
    if (activeFilter === 'newest') {
      return products.filter(hasNewProductTag)
    }

    if (activeFilter === 'best_seller') {
      return products.filter(hasBestSellerTag)
    }

    if (!activeCategory) {
      return products
    }

    return products.filter((product) => product.category === activeCategory)
  }, [activeCategory, activeFilter, products])

  useEffect(() => {
    if (!filterOptions.some((filter) => filter.key === activeFilter)) {
      onFilterChange?.('all')
    }
  }, [activeFilter, filterOptions, onFilterChange])

  const handleFilterChange = (nextFilter) => {
    onFilterChange?.(nextFilter)
  }

  return (
    <section id="product" className="container mx-auto px-4 py-16">
      <div className="mb-12 text-center">
        <p className="mb-3 font-body text-sm uppercase tracking-[0.3em] text-muted-foreground">
          {activeFilterMeta.eyebrow ?? 'Danh mục sản phẩm'}
        </p>
        <h2 className="font-display text-3xl font-semibold text-foreground md:text-4xl">
          {activeFilterMeta.title ?? activeFilterMeta.label}
        </h2>
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
            {filterOptions.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => handleFilterChange(filter.key)}
                className={`cursor-pointer px-5 py-2 text-sm tracking-wider transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter.label}
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
