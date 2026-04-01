import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "../../context/CartProvider";
import { SearchIcon, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { products } from "../../data/data";
import { div } from "framer-motion/client";

const SearchOverlay = ({ onProductClick }) => {
    const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery } = useCart();
    const inputRef = useRef(null);

    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => inputRef.current.focus(), 100);
        } else {
            setSearchQuery("");
        }

    }, [isSearchOpen, setSearchQuery]);

    const filtered = searchQuery.trim()
        ? products.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
            ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase())
            ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];
    return (
        <AnimatePresence>

            {
                isSearchOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="overlay-backdrop"
                            onClick={() => setIsSearchOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -40 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed top-0 left-0 right-0 z-50 bg-background shadow-2xl"
                        >
                            <div className="container mx-auto px-4 py-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <SearchIcon size={22} className="text-muted-foreground shrink-0" />
                                    <input
                                        ref={inputRef}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        value={searchQuery}
                                        type="text"
                                        className="flex-1 bg-transparent text-foreground font-body text-lg outline-none placeholder:text-muted-foreground"
                                    />

                                    <button
                                        onClick={() => setIsSearchOpen(false)}
                                        className="p-2 hover:bg-muted rounded-full transition-colors cursor-pointer">
                                        <X size={20} className="text-foreground" />
                                    </button>
                                </div>


                                {
                                    searchQuery.trim() && (
                                        <div className="border-t border-border pt-4 mx-h-[60vh] overflow-auto">
                                            {
                                                filtered?.length === 0 ? (
                                                    <p className="text-center font-body text-muted-foreground py-8">
                                                        No products found for "{searchQuery}"
                                                    </p>
                                                )

                                                    :
                                                    (
                                                        <div className="space-y-3">
                                                            <p className="font-body text-xs text-muted-foreground tracking-widest uppercase">
                                                                {filtered?.length} result {filtered?.length !== 1 ? "s" : ""}
                                                            </p>
                                                            {
                                                                filtered?.map((product) => (
                                                                    <motion.div
                                                                        key={product.id}
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="flex items-center gap-4 p-3 hover:bg-muted cursor-pointer transition-colors rounded-sm"
                                                                        onClick={() => {
                                                                            onProductClick(product);
                                                                            setIsSearchOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className="w-16 h-16 bg-secondary shrink-0">
                                                                            <img
                                                                                src={product?.image}
                                                                                alt={product?.name}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="font-body text-xs text-muted-foreground tracking-widest uppercase">
                                                                                {product?.category}
                                                                            </p>
                                                                            <h4 className="font-display text-base font-medium text-foreground truncate">
                                                                                {product?.name}
                                                                            </h4>
                                                                            <p className="font-body text-sm font-semibold text-foreground">
                                                                                {product?.price}
                                                                            </p>
                                                                        </div>
                                                                    </motion.div>
                                                                ))
                                                            }
                                                        </div>
                                                    )
                                            }
                                        </div>
                                    )
                                }
                            </div>
                        </motion.div>
                    </>
                )
            }

        </AnimatePresence>
    );
};

export default SearchOverlay;