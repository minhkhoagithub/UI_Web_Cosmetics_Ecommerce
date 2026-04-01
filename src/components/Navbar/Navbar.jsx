import { Heart, Search, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartProvider';
import { Link } from 'react-router-dom';

const Navbar = () => {
    const { setIsCartOpen, items, setIsSearchOpen } = useCart();
    return (
        <nav className='sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border'>
            <div className="container mx-auto flex items-center justify-between h-16 px-4">
                <div className="sm:flex items-center gap-6 hidden">
                    <a href="#product" className='text-sm font-body tracking-wider uppercase text-muted-foreground'>
                        shop
                    </a>
                </div>
                <Link to={'/'} className="font-display text-2xl font-semibold tracking-wide text-foreground">
                    E-SHOP
                </Link>

                <div className="flex items-center gap-5">
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className='text-muted-foreground hover:text-foreground transition-colors cursor-pointer'>
                        <Search size={20} />
                    </button>

                    <button className='relative text-muted-foreground hover:text-foreground transition-colors cursor-pointer'>
                        <Heart size={20} />
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className='absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-body font-semibold'>
                            5
                            {/* WISHLIST LENGTH DISPLAY IN HERE */}
                        </motion.span>
                    </button>

                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <ShoppingBag size={20} />
                        {/* TOTAL CART ITEMS LENGTH SHOW IN HERE */}
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className='absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-body font-semibold'
                        >
                            {items?.length}
                        </motion.span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;