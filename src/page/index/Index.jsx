import { useState } from 'react';
import HeroBanner from '../../components/HeroBanner/HeroBanner';
import TrustBanner from '../../components/TrustBanner/TrustBanner';
import CategoryBanner from '../../components/CategoryBanner/CategoryBanner';
import Products from '../../components/Products/Products';
import Testimonial from '../../components/Testimonial/Testimonial';
import Newsletter from '../../components/Newsletter/Newsletter';
import CartSidebar from '../../components/CartSidebar/CartSidebar';
import SearchOverlay from '../../components/SearchOverlay/SearchOverlay';
import ProductDetailsModal from '../../components/ProductDetailsModal/ProductDetailsModal';
import CheckoutDrawer from '../../components/CheckoutDrawer/CheckoutDrawer';


const Index = () => {
    const [selectedProduct, setSelectedProduct] = useState(null); // initial value = null;
    return (
        <div className='bg-background'>
            <HeroBanner />
            <TrustBanner />
            <CategoryBanner />
            <Products setSelectedProduct={setSelectedProduct} />

            {/* PRODUCT MODAL  */}
            {
                selectedProduct && (
                    <ProductDetailsModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                    />
                )
            }

            <Testimonial/>
            <Newsletter/>

            <CartSidebar/>
            <CheckoutDrawer />
            <SearchOverlay onProductClick={setSelectedProduct} />
        </div>
    );
};

export default Index;
