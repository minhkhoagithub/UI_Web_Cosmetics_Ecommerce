import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import Navbar from './components/Navbar/Navbar'
import Footer from './components/Footer/Footer'
import { AuthProvider } from './context/AuthProvider'
import CartProvider from './context/CartProvider'
import Index from './page/index/Index'
import Login from './page/login/Login'
import NotFound from './page/not_found/NotFound'
import PaymentResult from './page/payment_result/PaymentResult'
import PaymentStatus from './page/payment_status/PaymentStatus'
import Register from './page/register/Register'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Navbar />

          <Routes>
            <Route index element={<Index />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="payment-result" element={<PaymentResult />} />
            <Route path="payment-status" element={<PaymentStatus />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
