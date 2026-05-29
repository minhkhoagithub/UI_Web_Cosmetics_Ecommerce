import {  Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";


const Footer = () => {
    return (
        <footer className="border-t border-border bg-background">
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                    {/* BRAND OR LOGO  */}
                    <div className="md:col-span-1">
                        <h3 className="font-display text-2xl font-semibold text-foreground mb-4 uppercase">E-Shop</h3>
                        <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">
                            Tuyển chọn mỹ phẩm chất lượng cho thói quen chăm sóc da hằng ngày. Tinh tế, an toàn và đáng tin cậy trong từng sản phẩm.
                        </p>
                        {/* <div className="flex gap-3">
                            {
                                [Instagram, Twitter, Facebook]?.map((Icon) => (
                                    <button key={Icon} className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-accent hover:text-accent hover:border-accent transition-colors cursor-pointer">
                                        <Icon size={16} />
                                    </button>
                                ))
                            }
                        </div> */}
                    </div>

                    {/* QUICK LINKS  */}
                    <div>
                        <h4 className="font-body text-xs tracking-widest uppercase text-foreground font-semibold mb-4">Liên kết nhanh</h4>
                        <ul className="space-y-3">
                            {
                                ['Sản phẩm mới', 'Bán chạy', 'Khuyến mãi', 'Thẻ quà tặng', 'Hướng dẫn chọn']?.map((link) => (
                                    <li key={link}>
                                        <Link to={'#'} className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</Link>
                                    </li>
                                ))
                            }
                        </ul>
                    </div>
                    {/* COMPANY  */}
                    <div>
                        <h4 className="font-body text-xs tracking-widest uppercase text-foreground font-semibold mb-4">Công ty</h4>
                        <ul className="space-y-3">
                            {
                                ['Về chúng tôi', 'Tuyển dụng', 'Tin tức', 'Phát triển bền vững', 'Đối tác liên kết']?.map((link) => (
                                    <li key={link}>
                                        <Link to={'#'} className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</Link>
                                    </li>
                                ))
                            }
                        </ul>
                    </div>

                    {/* CONTACT  */}
                    <div>
                        <h4 className="font-body text-xs tracking-widest uppercase text-foreground font-semibold mb-4">Liên hệ</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2">
                                <MapPin size={14} className="text-accent shrink-0" />
                                <span className="font-body text-sm text-muted-foreground">123 Đại lộ E-SHOP, TP. Hồ Chí Minh</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone size={14} className="text-accent shrink-0" />
                                <span className="font-body text-sm text-muted-foreground">+1 (555) 000-1234</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail size={14} className="text-accent shrink-0" />
                                <span className="font-body text-sm text-muted-foreground">hello@e-shop.com</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
