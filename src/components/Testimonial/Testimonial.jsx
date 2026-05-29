import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react';
const testimonials = [
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

const Testimonial = () => {
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
                                key={t.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className='bg-background border border-border p-8 relative hover:border-accent transition-all duration-300 hover:rounded-xl'
                            >
                                <Quote size={32} className='text-accent/20 absolute top-6 right-6' />
                                <div className="flex text-accent mb-4">
                                    {
                                        Array.from({ length: t.rating })?.map((_, i) => (
                                            <Star key={i} size={14} fill='currentColor' />
                                        ))
                                    }
                                </div>
                                <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">
                                    "{t.text}"
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-ful bg-accent/10 flex items-center justify-center">
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
