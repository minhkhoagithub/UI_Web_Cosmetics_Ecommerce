import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import CartProvider  from './context/CartProvider'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import Index from './page/index'
import NotFound from './page/not_found/NotFound'

function App() {
  return (
    <>
      <CartProvider>
        <Toaster />
        <BrowserRouter>
          {/* NAVBAR  */}
          <Navbar />

          <Routes>
            <Route index element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* FOOTER  */}
          <Footer />
        </BrowserRouter>
      </CartProvider>
    </>
  )
}

export default App
