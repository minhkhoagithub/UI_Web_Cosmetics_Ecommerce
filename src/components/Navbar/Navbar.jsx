import { motion } from 'framer-motion'
import { Heart, LogOut, Search, ShoppingBag, User } from 'lucide-react'
import { toast } from 'sonner'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'

const Navbar = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setIsCartOpen, totalItems, setIsSearchOpen } = useCart()
  const { isAuthenticated, isLoggingOut, logout, user } = useAuth()
  const isAuthPage = pathname === '/login' || pathname === '/register'

  const desktopAuthLinkClass = ({ isActive }) =>
    `text-sm font-body tracking-wider uppercase transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`

  const registerButtonClass = ({ isActive }) =>
    `hidden rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition-colors sm:inline-flex ${isActive ? 'border-foreground bg-foreground text-primary-foreground' : 'border-border text-foreground hover:border-foreground'}`

  const requireAuthentication = (action) => {
    if (isAuthenticated) {
      action()
      return
    }

    toast.info('Vui lòng đăng nhập để tiếp tục.')
    navigate('/login')
  }

  const handleLogout = async () => {
    await logout()
    toast.success('Đăng xuất thành công.')
    navigate('/login', { replace: true })
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="hidden items-center gap-6 sm:flex">
          {isAuthPage ? (
            <Link to="/" className="text-sm font-body tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground">
              trang chủ
            </Link>
          ) : (
            <a href="#product" className="text-sm font-body tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground">
              mua sắm
            </a>
          )}
        </div>

        <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-foreground">
          E-SHOP
        </Link>

        <div className="flex items-center gap-5">
          {isAuthPage ? (
            <>
              {pathname !== '/login' ? (
                <NavLink to="/login" className={desktopAuthLinkClass}>
                  đăng nhập
                </NavLink>
              ) : null}

              {pathname !== '/register' ? (
                <NavLink to="/register" className={registerButtonClass}>
                  đăng ký
                </NavLink>
              ) : null}

              <Link
                to="/"
                className="text-sm font-body tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground"
              >
                trang chủ
              </Link>
            </>
          ) : (
            <>
              {isAuthenticated ? (
                <>
                  <span className="hidden max-w-48 truncate text-sm text-muted-foreground lg:inline-flex">
                    {user?.email || 'Tài khoản'}
                  </span>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`hidden text-sm font-body tracking-wider uppercase transition-colors md:inline-flex ${
                      isLoggingOut ? 'cursor-not-allowed text-muted-foreground/70' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    đăng xuất
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`cursor-pointer text-muted-foreground transition-colors hover:text-foreground md:hidden ${
                      isLoggingOut ? 'cursor-not-allowed opacity-70' : ''
                    }`}
                    aria-label="Đăng xuất"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className="hidden text-sm font-body tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                  >
                    đăng nhập
                  </NavLink>

                  <NavLink
                    to="/login"
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground sm:hidden"
                    aria-label="Mở trang đăng nhập"
                  >
                    <User size={20} />
                  </NavLink>

                  <NavLink to="/register" className={registerButtonClass}>
                    đăng ký
                  </NavLink>
                </>
              )}

              <button
                type="button"
                onClick={() => requireAuthentication(() => setIsSearchOpen(true))}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search size={20} />
              </button>

              <button
                type="button"
                onClick={() => toast.info('Wishlist chưa được nối backend trong vòng triển khai này.')}
                className="relative cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <Heart size={20} />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-body font-semibold text-destructive-foreground"
                >
                  0
                </motion.span>
              </button>

              <button
                type="button"
                onClick={() => requireAuthentication(() => setIsCartOpen(true))}
                className="relative cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <ShoppingBag size={20} />
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-body font-semibold text-accent-foreground"
                >
                  {totalItems ?? 0}
                </motion.span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
