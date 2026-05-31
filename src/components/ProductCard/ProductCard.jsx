import { motion as Motion } from 'framer-motion'
import { Heart, ShoppingBag, Star } from 'lucide-react'
import { formatCurrency, formatRating } from '../../utils/format'

const ProductCard = ({ product, index, onProductClick }) => {
  const salePriceLabel =
    Number(product.priceMax ?? product.price) > Number(product.price)
      ? `${formatCurrency(product.price)} - ${formatCurrency(product.priceMax)}`
      : formatCurrency(product.price)
  const originalPriceLabel =
    Number(product.originalPriceMax ?? product.originalPrice) > Number(product.originalPrice)
      ? `${formatCurrency(product.originalPrice)} - ${formatCurrency(product.originalPriceMax)}`
      : formatCurrency(product.originalPrice ?? product.price)

  return (
    <Motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group cursor-pointer"
      onClick={() => onProductClick(product)}
    >
      <div className="relative mb-4 aspect-square overflow-hidden bg-secondary">
        {product?.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-sm uppercase tracking-[0.28em] text-muted-foreground">
            Chưa có ảnh
          </div>
        )}

        {product?.onPromotion ? (
          <span className="absolute left-3 top-3 bg-rose-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            {product.promotionLabel || 'Khuyến mãi'}
          </span>
        ) : null}

        {!product?.inStock ? (
          <span className="absolute bottom-3 left-3 bg-foreground px-3 py-1 text-xs font-semibold uppercase tracking-wide text-background">
            Hết hàng
          </span>
        ) : null}

        <button
          type="button"
          className="absolute right-3 top-3 rounded-full bg-background/90 p-3 backdrop-blur-sm transition-all duration-300"
        >
          <Heart size={16} fill="currentColor" />
        </button>

        <Motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-3 right-3 rounded-full bg-background/90 p-3 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100"
        >
          <ShoppingBag size={18} className="text-foreground" />
        </Motion.button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</p>
        <h3 className="font-display text-lg font-medium text-foreground transition-colors duration-300 group-hover:text-accent">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 text-accent">
          <Star size={12} fill="currentColor" />
          <span className="text-xs text-muted-foreground">{formatRating(product.rating)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product?.onPromotion ? (
            <>
              <span className="font-semibold text-rose-700">{salePriceLabel}</span>
              <span className="text-xs text-muted-foreground line-through">{originalPriceLabel}</span>
            </>
          ) : (
            <span className="font-semibold text-foreground">{salePriceLabel}</span>
          )}
        </div>
      </div>
    </Motion.article>
  )
}

export default ProductCard
