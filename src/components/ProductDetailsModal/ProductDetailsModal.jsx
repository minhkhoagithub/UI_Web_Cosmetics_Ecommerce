import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Minus, Plus, ShoppingBag, Star, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '../../context/CartProvider';
import { toast } from 'sonner';

const ProductDetailsModal = ({ product, onClose }) => {
    const [selectedSize, setSelectedSize] = useState(); // initial value = undefined;
    const [selectedColor, setSelectedColor] = useState(); // initial value = undefined;
    const [quantity, setQuantity] = useState(1);
    const { addToCart } = useCart();

    const handleAdd = () => {
        addToCart(product, quantity, selectedSize, selectedColor);
        toast.success('Add to cart successfully!');
        setQuantity(1);
        onClose();
    }
    return (
        <AnimatePresence

        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='overlay-backdrop'
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-4 md:inset-auto md:bottom-0 md:left-1/2  md:w-225 md:max-h-[85vh] h-full bg-background z-50 overflow-hidden shadow-2xl flex flex-col md:flex-row p-8 hover:rounded-tl-2xl hover:rounded-tr-2xl transition-all duration-100"
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 hover:bg-muted rounded-full transition-colors cursor-pointer">
                    <X size={20} className="text-foreground" />
                </button>
                <div className="md:w-1/2 bg-secondary relative">
                    <img
                        src={product.image}
                        alt={product.name}
                        className='w-full h-64 md:h-full object-contain'
                    />
                    {/* WISHLIST BUTTON  */}
                    <button className={`absolute top-4 left-4 rounded-full transition-all cursor-pointer`}>
                        <Heart size={18} fill='currentColor' />
                    </button>

                </div>
                <div className="md:w-1/2 p-6 md:p-8 overflow-y-auto flex flex-col">
                    <p className="text-xs font-body text-muted-foreground tracking-widest uppercase mb-2">{product.category}</p>
                    <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-3">
                        {product.name}
                    </h2>

                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex text-accent">
                            {
                                Array.from({ length: 5 })?.map((_, i) => (
                                    <Star key={i} size={14} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} />
                                ))
                            }
                        </div>
                        <span className="text-sm font-body text-muted-foreground">
                            {product.rating} - {product.reviews}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <span className="font-display text-3xl font-semibold text-foreground">{product.price}</span>
                        {
                            product.originalPrice && (
                                <span className="font-body text-lg text-muted-foreground line-through">{product.originalPrice}</span>
                            )
                        }
                    </div>

                    <p className="font-body text-sm text-muted-foreground leading-relaxed mb-6">{product.description}</p>

                    {/* SIZES  */}
                    {
                        product.sizes && (
                            <div className="mb-5">
                                <p className="font-body text-xs tracking widest uppercase text-muted-foreground mb-2">
                                    Size
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {
                                        product.sizes?.map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size === selectedSize ? undefined : size)}
                                                className={`px-4 py-2 border text-sm font-body transition-colors cursor-pointer ${selectedSize === size ?
                                                    "border-foreground bg-foreground text-background"
                                                    :
                                                    "border-border text-foreground hover:border-foreground"
                                                    }`}>{size}</button>
                                        ))
                                    }
                                </div>
                            </div>
                        )
                    }

                    {/* PRODUCT COLORS  */}
                    {
                        product.colors && (
                            <div className="mb-6">
                                <p className="font-body text-xs tracking widest uppercase text-muted-foreground mb-2">
                                    Color
                                </p>
                                {
                                    product.colors?.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color === selectedColor ? undefined : color)}
                                            className={`px-4 py-2 border text-sm font-body transition-colors cursor-pointer ${selectedColor === color ?
                                                "border-foreground bg-foreground text-background"
                                                :
                                                "border-border text-foreground hover:border-foreground"
                                                }`}>{color}</button>
                                    ))
                                }
                            </div>
                        )
                    }

                    <div className="mt-auto flex items-center gap-3">
                        <div className="flex items-center border border-border">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-4 hover:bg-muted transition-colors cursor-pointer">
                                <Minus size={14} />
                            </button>
                            <span className="px-4 font-body text-sm">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="p-4 hover:bg-muted transition-colors cursor-pointer">
                                <Plus size={14} />
                            </button>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleAdd}
                            className='flex-1 bg-foreground text-background font-body text-sm tracking-widest uppercase py-4 flex items-center justify-center gap-2 hover:bg-accent cursor-pointer hover:text-accent-foreground transition-colors duration-300'
                        >
                            <ShoppingBag size={16} />
                            Add to cart
                        </motion.button>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProductDetailsModal;