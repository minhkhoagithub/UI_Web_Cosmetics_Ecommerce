import { useState } from "react";
import { products } from "../../data/data";
import ProductCard from "../ProductCard/ProductCard";


const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];

const Products = ({setSelectedProduct}) => {
    const [activeCategory, setActiveCategory] = useState("All"); // initial value = "All";
    
    const filtered = activeCategory === "All"
        ? products
        : products?.filter((p) => p.category === activeCategory);
    return (
        <section id="product" className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
                <p className="font-body text-sm tracking-[0.3em] uppercase text-muted-foreground mb-3">
                    Curated Collection
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                    Featured Products
                </h2>
            </div>

            {/* CATEGORY FILTER  */}
            <div className="flex justify-center gap-2 mb-12 flex-wrap">
                {
                    categories?.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2 font-body text-sm tracking-wider transition-colors duration-300 cursor-pointer ${activeCategory === cat
                                ?
                                "bg-foreground text-background"
                                :

                                "text-muted-foreground hover:text-foreground"
                                }`}>
                            {cat}
                        </button>
                    ))
                }
            </div>

            {/* PRODUCT GRID  */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {
                    filtered?.map((product, index) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            index={index}
                            onProductClick={setSelectedProduct}
                        />
                    ))
                }
            </div>
        </section>
    );
};

export default Products;