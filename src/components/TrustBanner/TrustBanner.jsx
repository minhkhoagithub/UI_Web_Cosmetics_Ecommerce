import { Headphones, RotateCcw, Shield, Truck } from "lucide-react";
import { motion } from "framer-motion";
const features = [
    {
        icon: Truck,
        title: "Free Shipping",
        desc: "On orders over $200"
    },
    {
        icon: Shield,
        title: "Secure Payment",
        desc: "100% protected checkout"
    },
    {
        icon: RotateCcw,
        title: "Easy Returns",
        desc: "30-day return policy"
    },
    {
        icon: Headphones,
        title: "24/7 Support",
        desc: "Dedicated customer care"
    },
]

const TrustBanner = () => {
    return (
        <section className="border-y border-border bg-secondary/50">
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {
                        features?.map((f, i) => (
                            <motion.div
                                key={f?.title}
                                initial={{opacity: 0, y: 20}}
                                whileInView={{opacity: 1, y: 0}}
                                viewport={{once: true}}
                                transition={{delay: i * 0.1}}
                                className="flex flex-col items-center text-center"
                            >
                                <div className="w-12 h-12 rounded-ful bg-background border border-border flex items-center justify-center mb-3">
                                    <f.icon size={20} className="text-accent" />
                                </div>
                                <h4 className="font-body text-sm text-semibold text-foreground mb-1">{f.title}</h4>
                                <p className="font-body text-xs text-muted-foreground">{f.desc}</p>
                            </motion.div>
                        ))
                    }
                </div>
            </div>
        </section>
    );
};

export default TrustBanner;