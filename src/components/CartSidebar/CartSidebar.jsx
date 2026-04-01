import { AnimatePresence, motion } from 'framer-motion';
import { useCart } from '../../context/CartProvider';
import { ArrowRight, Minus, Plus, Trash2, X } from 'lucide-react';
const CartSidebar = () => {
    const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, totalPrice, setIsCheckoutOpen } = useCart();
    return (
        <AnimatePresence>
            {
                isCartOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className='overlay-backdrop'
                            onClick={() => setIsCartOpen(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className='fixed top-0 right-0 h-full w-full sm:w-105 bg-background z-50 shadow-2xl flex flex-col'
                        >
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h2 className="font-display text-xl font-semibold text-foreground">
                                    Shopping Bag ({items?.length})
                                </h2>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-2 hover:bg-muted  rounded-full transition-colors cursor-pointer">
                                    <X size={20} className='text-foreground' />
                                </button>
                            </div>


                            {/* ITEMS  */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {
                                    items?.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <p className="font-body text-muted-foreground mb-2">Your bag is empty</p>
                                            <p className="font-body text-sm text-muted-foreground">Add items to get started</p>

                                        </div>
                                    )
                                        :
                                        (

                                            <AnimatePresence>
                                                {
                                                    items?.map((item) => (
                                                        <motion.div key={item?.id}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            layout
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 20 }}
                                                            className='flex gap-4'
                                                        >
                                                            <div className="w-20 h-20 bg-secondary shrink-0">
                                                                <img
                                                                    src={item?.product?.image}
                                                                    alt={item?.product?.name}
                                                                    className='w-full h-full object-cover'
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-body text-sm font-medium text-foreground truncate">
                                                                    {item?.product?.name}
                                                                </h3>
                                                                {
                                                                    (item?.selectedSize || item.selectedColor) && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            {

                                                                                [
                                                                                    item.selectedSize,
                                                                                    item?.selectedColor
                                                                                ]?.filter(Boolean).join(" . ")
                                                                            }
                                                                        </p>
                                                                    )
                                                                }

                                                                <p className="font-body text-sm font-semibold text-foreground mt-1">
                                                                    ${item?.product?.price}
                                                                </p>

                                                                <div className="flex items-center gap-3 mt-2">
                                                                    <div className="flex items-center border border-border">
                                                                        <button
                                                                        onClick={() => updateQuantity(item?.product.id, item?.quantity - 1)}
                                                                            className="p-1.5 hover:bg-muted transition-colors cursor-pointer">
                                                                            <Minus size={12} />
                                                                        </button>
                                                                        <span className="px-3 text-xs font-body">{item?.quantity}</span>
                                                                        <button
                                                                        onClick={() => updateQuantity(item?.product.id, item?.quantity + 1)}
                                                                            className="p-1.5 hover:bg-muted transition-colors cursor-pointer">
                                                                            <Plus size={12} />
                                                                        </button>
                                                                    </div>
                                                                    <button 
                                                                    onClick={() => removeFromCart(item?.product.id)}
                                                                    className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))
                                                }
                                            </AnimatePresence>
                                        )
                                }
                            </div>

                            {/* FOOTER  */}
                            {
                                items?.length > 0 && (
                                    <div className='border-t border-border p-6 space-y-4'>
                                        <div className="flex justify-between font-body">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span className="font-semibold text-foreground">
                                                {
                                                    totalPrice.toFixed(2)
                                                }
                                            </span>
                                        </div>
                                        <motion.div
                                        whileHover={{scale: 1.02}}
                                        whileTap={{scale: 0.98}}
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            setIsCheckoutOpen(true);
                                        }}
                                        className='w-full bg-foreground text-background font-body text-sm tracking-widest uppercase py-4 flex items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors duration-300 cursor-pointer'
                                        >
                                            Checkout
                                            <ArrowRight size={16}  />
                                        </motion.div>
                                    </div>
                                )
                            }

                        </motion.div>
                    </>
                )
            }

        </AnimatePresence>
    );
};

export default CartSidebar;