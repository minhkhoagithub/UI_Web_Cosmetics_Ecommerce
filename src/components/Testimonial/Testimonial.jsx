import { motion } from 'framer-motion'
import { Quote, Star } from 'lucide-react';
const testimonials = [
    {
        name: "Sarah Mitchell",
        role: "Fashion Blogger",
        text: "LUXORA's collection is absolutely stunning. The quality of their products exceeds expectations every single time. My go-to for luxury accessories.",
        rating: 5,
        avatar: "SM",
    },
    {
        name: "James Rodriguez",
        role: "Creative Director",
        text: "I've been shopping here for over a year. The attention to detail in every product, from packaging to quality, is simply unmatched.",
        rating: 5,
        avatar: "JR",
    },
    {
        name: "Emily Chen",
        role: "Interior Designer",
        text: "From their customer service to product quality, everything about LUXORA screams premium. Highly recommended for anyone who values quality.",
        rating: 5,
        avatar: "EC",
    },
]

const Testimonial = () => {
    return (
        <section className="bg-secondary/30 py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-14">
                    <p className="font-body text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">What Our Clients Say</p>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">Trusted by Thousands</h2>
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