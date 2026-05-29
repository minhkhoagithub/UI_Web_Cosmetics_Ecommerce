import { motion } from "framer-motion"
import { useState } from "react";
import { toast } from "sonner";

const Newsletter = () => {
    const [email, setEmail] = useState(""); // initial value = empty;

    const handleSubmit = (e) => {
        e.preventDefault();
        if(email) {
            toast.success('Đăng ký nhận tin thành công!');
            setEmail("");
        }
    }
    return (
        <section className="bg-foreground py-20">
            <div className="container mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <p className="font-body text-sm tracking-[0.3em] uppercase text-background/50 mb-3">
                        Cập nhật mới nhất
                    </p>
                    <h2 className="font-display text-3xl md:text-4xl font-semibold text-background mb-4">
                        Đăng ký nhận tin
                    </h2>
                    <p className="font-body text-sm text-background/60 mb-8 max-w-md mx-auto">
                        Nhận ưu đãi độc quyền, sản phẩm mới và gợi ý chăm sóc da trực tiếp trong hộp thư của bạn.</p>

                    <form onSubmit={handleSubmit} className=" flex sm:flex-row flex-col gap-4 sm:gap-0 sm:max-w-md w-full sm:mx-auto">
                        <input
                            type="text"
                            placeholder="Nhập email của bạn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="flex-1 bg-background/10 border border-background/20 text-background px-5 py-3.5 font-body text-sm outline-0 focus:border-accent transition-colors placeholder:text-background/40 w-full"
                        />
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-accent text-accent-foreground px-6 py-3.5 font-body text-sm tracking-widest uppercase flex items-center gap-2 hover:bg-accent/90 transition-colors cursor-pointer justify-center"
                        >
                            Đăng ký
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </section>
    );
};

export default Newsletter;
