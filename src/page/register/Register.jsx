import { Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LockKeyhole, Mail, Phone, User } from 'lucide-react'
import { toast } from 'sonner'
import AuthPageLayout from '../../components/Auth/AuthPageLayout'
import { useAuth } from '../../context/AuthProvider'

const inputClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'

const EMAIL_ALREADY_USED_MESSAGE = 'Email này đã được sử dụng. Vui lòng nhập email khác.'

const normalizeErrorText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const getRegistrationErrorMessage = (error) => {
  const message = error?.message ?? ''
  const normalizedMessage = normalizeErrorText(message)
  const isDuplicateEmailError =
    normalizedMessage.includes('email') &&
    (normalizedMessage.includes('ton tai') ||
      normalizedMessage.includes('su dung') ||
      normalizedMessage.includes('already') ||
      normalizedMessage.includes('exists') ||
      normalizedMessage.includes('duplicate') ||
      normalizedMessage.includes('conflict'))

  return isDuplicateEmailError ? EMAIL_ALREADY_USED_MESSAGE : message || 'Đăng ký thất bại. Vui lòng thử lại.'
}

const Register = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isAuthenticating, registerUser, verifyRegistrationOtp } = useAuth()
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [registrationMessage, setRegistrationMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const hasPasswordMismatch = Boolean(confirmPassword) && password !== confirmPassword

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const resetVerificationState = () => {
    setPendingVerificationEmail('')
    setOtpCode('')
    setRegistrationMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)
    const fullName = formData.get('fullName')?.toString().trim()
    const phone = formData.get('phone')?.toString().trim()
    const email = formData.get('email')?.toString().trim()

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận phải trùng với mật khẩu.')
      return
    }

    try {
      await registerUser({ fullName, phone, email, password })
      setPendingVerificationEmail(email)
      setOtpCode('')
      setRegistrationMessage(`Tài khoản đã được tạo. Mã OTP kích hoạt đã được gửi tới ${email}.`)
      toast.success('Đăng ký thành công. Vui lòng nhập OTP từ email để kích hoạt tài khoản.')
      form.reset()
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(getRegistrationErrorMessage(error))
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast.error('Vui lòng nhập mã OTP đã gửi về email của bạn.')
      return
    }

    try {
      const response = await verifyRegistrationOtp({
        email: pendingVerificationEmail,
        otp: otpCode.trim(),
      })

      toast.success(response?.message ?? 'Xác thực OTP thành công.')
      resetVerificationState()
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <AuthPageLayout
      badge="Tạo tài khoản"
      title="Tạo tài khoản để bắt đầu trải nghiệm mua sắm được cá nhân hóa."
      description="Đăng ký nhanh để lưu wishlist, nhận ưu đãi độc quyền và xây dựng hành trình chăm sóc da phù hợp với bạn."
      submitLabel={pendingVerificationEmail ? 'Đã gửi OTP' : 'Đăng ký'}
      helperText="Đã có tài khoản?"
      helperLink="/login"
      helperLabel="Đăng nhập ngay"
      onSubmit={handleSubmit}
      isSubmitting={isAuthenticating}
      submitDisabled={Boolean(pendingVerificationEmail) || hasPasswordMismatch}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="register-fullname" className="text-sm font-medium text-foreground">
            Họ và tên
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="register-fullname"
              name="fullName"
              type="text"
              placeholder="Nguyễn Minh Anh"
              className={`${inputClassName} pl-11`}
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="register-phone" className="text-sm font-medium text-foreground">
            Số điện thoại
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="register-phone"
              name="phone"
              type="tel"
              placeholder="0901 234 567"
              className={`${inputClassName} pl-11`}
              autoComplete="tel"
              required
            />
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor="register-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="ban@email.com"
              className={`${inputClassName} pl-11`}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="text-sm font-medium text-foreground">
            Mật khẩu
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="register-password"
              name="password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              className={`${inputClassName} pl-11`}
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="register-confirm-password" className="text-sm font-medium text-foreground">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              id="register-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu"
              className={`${inputClassName} pl-11 ${hasPasswordMismatch ? 'border-red-500 focus:border-red-500' : ''}`}
              minLength={6}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={hasPasswordMismatch}
              required
            />
          </div>
          {hasPasswordMismatch ? (
            <p className="text-xs font-medium text-red-600">Mật khẩu xác nhận phải trùng với mật khẩu.</p>
          ) : null}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-3xl bg-secondary px-4 py-3 text-sm leading-6 text-secondary-foreground">
        <input type="checkbox" name="terms" className="mt-1 h-4 w-4 rounded border-border accent-foreground" required />
        <span>
          Tôi đồng ý với điều khoản sử dụng, chính sách bảo mật và muốn nhận thông tin ưu đãi từ thương hiệu.
        </span>
      </label>

      {registrationMessage ? (
        <div className="space-y-4 rounded-3xl border border-border bg-secondary/60 px-4 py-4 text-sm text-secondary-foreground">
          <p className="leading-6">{registrationMessage}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="otp"
              type="text"
              inputMode="numeric"
              placeholder="Nhập mã OTP"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              className={inputClassName}
            />

            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isAuthenticating}
              className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                isAuthenticating
                  ? 'cursor-not-allowed bg-foreground/60 text-primary-foreground'
                  : 'bg-foreground text-primary-foreground hover:-translate-y-0.5'
              }`}
            >
              Xác thực OTP
            </button>

            <button
              type="button"
              onClick={resetVerificationState}
              disabled={isAuthenticating}
              className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                isAuthenticating
                  ? 'cursor-not-allowed border-border/60 text-muted-foreground/70'
                  : 'border-border text-foreground hover:border-foreground'
              }`}
            >
              Đổi email
            </button>
          </div>
        </div>
      ) : null}
    </AuthPageLayout>
  )
}

export default Register
