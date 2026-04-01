import { createContext, useCallback, useContext, useState } from "react";


const CartContext = createContext(null);

const CartProvider = ({ children }) => {
    const [isCartOpen, setIsCartOpen] = useState(false); // initial value = false;
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false); // initial value = false;
    const [isSearchOpen, setIsSearchOpen] = useState(false); // initial value = false
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState(""); // initial value = empty string;


    const addToCart = useCallback((product, quantity, size, color) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.product.id === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
                );
            }
            return [...prev, { product, quantity: quantity, selectedSize: size, selectedColor: color }];
        });
        setIsCartOpen(true);
    }, []);

    const removeFromCart = useCallback((productId) => {
        setItems((prev) => (
            prev.filter(i => i.product.id !== productId)
        ))
    }, []);

    const updateQuantity = useCallback((productId, quantity) => {
        if (quantity <= 0) {
            setItems((prev) => prev.filter(i => i.product.id !== productId));
        }
        setItems((prev) => (
            prev.map(i => i.product.id === productId ? { ...i, quantity } : i)
        ));
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const totalPrice = items?.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{
            isCartOpen,
            setIsCartOpen,
            isCheckoutOpen,
            setIsCheckoutOpen,
            isSearchOpen,
            setIsSearchOpen,
            addToCart,
            items,
            removeFromCart,
            updateQuantity,
            clearCart,
            totalPrice,
            searchQuery,
            setSearchQuery,
        }}>
            {children}
        </CartContext.Provider>
    )
};

export default CartProvider;

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must me used within CartProvider");
    return ctx;
}