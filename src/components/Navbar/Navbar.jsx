import { motion as Motion } from 'framer-motion'
import { ChevronDown, Heart, LogOut, ReceiptText, Search, ShoppingBag, User, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import { useCart } from '../../context/CartProvider'
import { normalizeMediaUrl } from '../../services/media'

const Navbar = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setIsCartOpen, cartItemCount, setIsSearchOpen } = useCart()
  const { isAuthenticated, isLoggingOut, logout, user } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('')
  const userMenuRef = useRef(null)
  const isAuthPage = pathname === '/login' || pathname === '/register'

  const desktopAuthLinkClass = ({ isActive }) =>
    `text-sm font-body tracking-wider uppercase transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`

  const registerButtonClass = ({ isActive }) =>
    `hidden rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition-colors sm:inline-flex ${isActive ? 'border-foreground bg-foreground text-primary-foreground' : 'border-border text-foreground hover:border-foreground'}`

  const displayName = useMemo(() => user?.fullName?.trim() || user?.email || 'Tài khoản', [user?.email, user?.fullName])
  const avatarUrl = normalizeMediaUrl(user?.avatarUrl)

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [isUserMenuOpen])

  const handleLogout = async () => {
    await logout()
    setIsUserMenuOpen(false)
    toast.success('Đăng xuất thành công.')
    navigate('/login', { replace: true })
  }

  const closeUserMenu = () => {
    setIsUserMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="hidden items-center gap-6 sm:flex">
          {isAuthPage ? (
            <Link to="/" className="text-sm font-body tracking-wider uppercase text-muted-foreground transition-colors hover:text-foreground">
              trang chu
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
                trang chu
              </Link>
            </>
          ) : (
            <>
              {isAuthenticated ? (
                <div
                  ref={userMenuRef}
                  className="relative -my-3 py-3"
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((currentValue) => !currentValue)}
                    className="flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 text-sm text-foreground transition-colors hover:border-foreground/40"
                    aria-label="Mở menu tài khoản"
                    aria-expanded={isUserMenuOpen}
                  >
                    <span className="hidden max-w-40 truncate font-medium text-foreground lg:inline-flex">{displayName}</span>
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground">
                      {avatarUrl && avatarUrl !== failedAvatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setFailedAvatarUrl(avatarUrl)}
                        />
                      ) : (
                        <UserRound size={18} />
                      )}
                    </span>
                    <ChevronDown size={16} className={`hidden text-muted-foreground transition-transform lg:inline-flex ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-full w-64 pt-3">
                      <div className="rounded-[1.75rem] border border-border bg-background p-3 shadow-2xl">
                        <div className="border-b border-border px-3 pb-3">
                          <p className="truncate font-semibold text-foreground">{displayName}</p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email || 'Tài khoản khách hàng'}</p>
                        </div>

                        <div className="mt-3 space-y-1">
                          <Link
                            to="/profile"
                            onClick={closeUserMenu}
                            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-foreground transition-colors hover:bg-secondary"
                          >
                            <UserRound size={16} />
                            Chỉnh sửa thông tin
                          </Link>

                          <Link
                            to="/order-history"
                            onClick={closeUserMenu}
                            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-foreground transition-colors hover:bg-secondary"
                          >
                            <ReceiptText size={16} />
                            Lịch sử mua hàng
                          </Link>

                          <button
                            type="button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
                              isLoggingOut
                                ? 'cursor-not-allowed text-muted-foreground'
                                : 'text-foreground hover:bg-secondary'
                            }`}
                          >
                            <LogOut size={16} />
                            {isLoggingOut ? 'Đang xử lý đăng xuất' : 'Đăng xuất'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
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
                onClick={() => setIsSearchOpen(true)}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search size={20} />
              </button>

              <button
                type="button"
                onClick={() => toast.info('Danh sách yêu thích chưa được nối backend trong vòng triển khai này.')}
                className="relative cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <Heart size={20} />
                <Motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-body font-semibold text-destructive-foreground"
                >
                  0
                </Motion.span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
              >
                <ShoppingBag size={20} />
                <Motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-body font-semibold text-accent-foreground"
                >
                  {cartItemCount ?? 0}
                </Motion.span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
