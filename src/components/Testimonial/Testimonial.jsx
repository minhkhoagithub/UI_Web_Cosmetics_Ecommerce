import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { searchProducts } from '../../services/catalog';
import { getProductReviewsRequest } from '../../services/review';

const fallbackTestimonials = [
    {
        name: "Sarah Mitchell",
        role: "Beauty Blogger",
        text: "Bộ sưu tập của LUXORA rất chỉn chu. Chất lượng sản phẩm luôn vượt kỳ vọng và là lựa chọn yêu thích của tôi.",
        rating: 5,
        avatar: "SM",
    },
    {
        name: "James Rodriguez",
        role: "Giám đốc sáng tạo",
        text: "Tôi đã mua sắm ở đây hơn một năm. Từng sản phẩm đều được chăm chút từ bao bì đến chất lượng.",
        rating: 5,
        avatar: "JR",
    },
    {
        name: "Emily Chen",
        role: "Chuyên gia làm đẹp",
        text: "Từ dịch vụ khách hàng đến chất lượng sản phẩm, LUXORA mang lại cảm giác rất cao cấp và đáng tin cậy.",
        rating: 5,
        avatar: "EC",
    },
]

const initialsOf = (name = '') => {
    const words = String(name || 'Khách hàng').trim().split(/\s+/).filter(Boolean)
    return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'KH'
}

const normalizeReview = (review, productName = '') => {
    const name = review?.reviewerName || review?.userFullName || review?.fullName || review?.userName || 'Khách hàng'
    return {
        id: review?.id || `${name}-${review?.createdAt || productName}`,
        name,
        role: productName ? `Đã đánh giá ${productName}` : 'Khách hàng',
        text: review?.content?.trim() || 'Tôi hài lòng với trải nghiệm mua sắm và chất lượng sản phẩm.',
        rating: Math.max(1, Math.min(5, Number(review?.rating || 5))),
        avatar: initialsOf(name),
        createdAt: review?.createdAt || review?.reviewCreatedAt || review?.updatedAt || '',
    }
}

const Testimonial = () => {
    const [testimonials, setTestimonials] = useState(fallbackTestimonials)

    useEffect(() => {
        let isMounted = true

        const loadLatestReviews = async () => {
            try {
                const productsResponse = await searchProducts({ size: 50, sort: 'newest' })
                const products = Array.isArray(productsResponse?.items) ? productsResponse.items : []
                const productsWithReviews = products.filter((product) => Number(product?.reviewCount || 0) > 0)

                const reviewResults = await Promise.allSettled(
                    productsWithReviews.map(async (product) => {
                        const reviews = await getProductReviewsRequest(product.productId)
                        return (Array.isArray(reviews) ? reviews : []).map((review) => normalizeReview(review, product.productName))
                    })
                )

                const latestReviews = reviewResults
                    .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
                    .filter((review) => review.text?.trim())
                    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
                    .slice(0, 3)

                if (isMounted && latestReviews.length > 0) {
                    setTestimonials(latestReviews)
                }
            } catch {
                if (isMounted) {
                    setTestimonials(fallbackTestimonials)
                }
            }
        }

        loadLatestReviews()

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <section className="bg-secondary/30 py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-14">
                    <p className="font-body text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">Khách hàng nói gì</p>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Được nhiều khách hàng tin chọn</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {
                        testimonials?.map((t, i) => (
                            <motion.div
                                key={t.id || t.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className='bg-background border border-border p-8 relative hover:border-accent transition-all duration-300 hover:rounded-xl'
                            >
                                <Quote size={32} className='text-accent/20 absolute top-6 right-6' />
                                <div className="flex text-accent mb-4">
                                    {
                                        Array.from({ length: Math.max(1, Math.min(5, Math.round(Number(t.rating || 5)))) })?.map((_, i) => (
                                            <Star key={i} size={14} fill='currentColor' />
                                        ))
                                    }
                                </div>
                                <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">
                                    "{t.text}"
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                                        <span className="font-body text-xs font-semibold text-accent">
                                            {t.avatar}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-body text-sm font-medium text-foreground">
                                            {t.name}
                                        </p>
                                        <p className="font-body text-xs text-muted-foreground">
                                            {t.role}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    }
                </div>
            </div>
        </section>
    );
};

export default Testimonial;
