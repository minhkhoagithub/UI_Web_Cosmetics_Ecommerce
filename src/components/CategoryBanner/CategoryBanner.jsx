import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";

const categories = [
    {
        title: "Sản phẩm mới",
        desc: "Khám phá những lựa chọn vừa cập nhật",
        icon: Sparkles,
        gradient: "from-accent/10 to-accent/5",
        filterKey: "newest"
    },
    {
        title: "Bán chạy nhất",
        desc: "Những sản phẩm được khách hàng yêu thích",
        icon: TrendingUp,
        gradient: "from-primary/5 to-muted",
        filterKey: "best_seller"
    }
]

const CategoryBanner = ({ onExplore }) => {
    return (
        <section className="container mx-auto px-4 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2">
                {
                    categories?.map((cat, i) => (
                        <motion.button
                            key={cat?.title}
                            type="button"
                            onClick={() => onExplore?.(cat.filterKey)}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -4 }}
                            className={`bg-linear-to-br ${cat?.gradient} border border-border p-8 text-left cursor-pointer group transition-shadow hover:shadow-lg`}
                        >
                            <cat.icon size={28} className="text-accent mb-4 group-hover:scale-110 transition-transform" />
                            <h3 className="font-display text-xl font-semibold text-foreground mb-2">{cat.title}</h3>
                            <p className="font-body text-sm text-muted-foreground">{cat.desc}</p>
                            <span className="mt-4 font-body text-xs tracking-widest uppercase text-foreground border-b border-foreground pb-0.5 group-hover:border-accent group-hover:text-accent transition-colors flex items-center gap-2 max-w-max">
                                Khám phá <ArrowRight size={20} />
                            </span>
                        </motion.button>
                    ))
                }


            </div>
        </section >
    );
};

export default CategoryBanner;
