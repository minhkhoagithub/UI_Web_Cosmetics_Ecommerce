import { Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail } from 'lucide-react'
import { toast } from 'sonner'
import AuthPageLayout from '../../components/Auth/AuthPageLayout'
import { useAuth } from '../../context/AuthProvider'

const inputClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'

const Login = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isAuthenticating, login } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const identifier = formData.get('identifier')?.toString().trim()
    const password = formData.get('password')?.toString()
    const remember = formData.get('remember') === 'on'

    try {
      await login({ identifier, password, remember })
      toast.success('Đăng nhập thành công.')
      event.currentTarget.reset()
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <AuthPageLayout
      badge="Đăng nhập thành viên"
      title="Chào mừng bạn quay lại với không gian làm đẹp của mình."
      description="Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và tiếp tục routine chăm sóc da đang dở của bạn."
      submitLabel="Đăng nhập"
      helperText="Chưa có tài khoản?"
      helperLink="/register"
      helperLabel="Tạo tài khoản mới"
      onSubmit={handleSubmit}
      isSubmitting={isAuthenticating}
    >
      <div className="space-y-2">
        <label htmlFor="login-identifier" className="text-sm font-medium text-foreground">
          Email hoặc số điện thoại
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            id="login-identifier"
            name="identifier"
            type="text"
            placeholder="Nhập email hoặc số điện thoại"
            className={`${inputClassName} pl-11`}
            autoComplete="username"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium text-foreground">
          Mật khẩu
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="Nhập mật khẩu của bạn"
            className={`${inputClassName} pl-11`}
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="remember" className="h-4 w-4 rounded border-border accent-foreground" />
          Ghi nhớ tài khoản trên thiết bị này
        </label>

        <button
          type="button"
          onClick={() => toast.info('Chức năng quên mật khẩu chưa được kết nối trong màn hình này.')}
          className="text-left font-semibold text-foreground transition-colors hover:text-accent"
        >
          Quên mật khẩu?
        </button>
      </div>
    </AuthPageLayout>
  )
}

export default Login
