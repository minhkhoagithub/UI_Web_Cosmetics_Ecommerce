import {
  AlertCircle,
  Camera,
  Check,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthProvider'
import {
  confirmOldEmailChangeRequest,
  createAddressRequest,
  deleteAddressRequest,
  getAddressesRequest,
  updateAddressRequest,
  updateUserProfileRequest,
  verifyNewEmailChangeRequest,
} from '../../services/user'

const inputClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring'

const cardClassName = 'rounded-[2rem] border border-border bg-background p-6 shadow-sm'
const sectionTitleClassName = 'text-xs uppercase tracking-[0.24em] text-muted-foreground'

const ADDRESS_CACHE_KEY_PREFIX = 'cosmetics-shop.profile-addresses'
const isBrowser = typeof window !== 'undefined'

const buildProfileState = (user, response = null) => ({
  id: response?.id ?? user?.userId ?? '',
  email: response?.email ?? user?.email ?? '',
  phone: response?.phone ?? user?.phone ?? '',
  fullName: response?.fullName ?? user?.fullName ?? '',
  avatarUrl: response?.avatarUrl ?? user?.avatarUrl ?? '',
  role: response?.role ?? user?.role ?? '',
  isActive: response?.isActive ?? true,
})

const buildProfileForm = (profile) => ({
  fullName: profile?.fullName ?? '',
  phone: profile?.phone ?? '',
  avatarUrl: profile?.avatarUrl ?? '',
})

const buildEmptyAddressForm = (profile) => ({
  receiverName: profile?.fullName ?? '',
  phone: profile?.phone ?? '',
  address: '',
  city: 'TP. Ho Chi Minh',
  district: '',
  ward: '',
  isDefault: false,
})

const formatRoleLabel = (role) => {
  if (!role) {
    return 'Chưa cập nhật'
  }

  return role
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const getAddressCacheKey = (userId) => `${ADDRESS_CACHE_KEY_PREFIX}.${userId}`

const readAddressCache = (userId) => {
  if (!isBrowser || !userId) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(getAddressCacheKey(userId))

    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const writeAddressCache = (userId, addresses) => {
  if (!isBrowser || !userId) {
    return
  }

  window.localStorage.setItem(getAddressCacheKey(userId), JSON.stringify(addresses))
}

const sortAddresses = (addresses) =>
  [...addresses].sort((left, right) => {
    if (left.isDefault === right.isDefault) {
      return 0
    }

    return left.isDefault ? -1 : 1
  })

const upsertAddress = (addresses, nextAddress) => {
  const hasAddress = addresses.some((address) => address.id === nextAddress.id)
  const mergedAddresses = hasAddress
    ? addresses.map((address) => (address.id === nextAddress.id ? nextAddress : address))
    : [...addresses, nextAddress]

  const normalizedAddresses = nextAddress.isDefault
    ? mergedAddresses.map((address) => ({
        ...address,
        isDefault: address.id === nextAddress.id,
      }))
    : mergedAddresses

  return sortAddresses(normalizedAddresses)
}

const mapAddressToForm = (address) => ({
  receiverName: address.fullName ?? '',
  phone: address.phone ?? '',
  address: address.address ?? '',
  city: address.city ?? '',
  district: address.district ?? '',
  ward: address.ward ?? '',
  isDefault: Boolean(address.isDefault),
})

const isExpectedEmailOtpMessage = (message) =>
  typeof message === 'string' &&
  (message.includes('OTP gửi đến email cũ') || message.includes('Yêu cầu đổi email đã được ghi nhận'))

const Profile = () => {
  const { isAuthenticated, user, syncUser } = useAuth()
  const [profile, setProfile] = useState(() => buildProfileState(user))
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(buildProfileState(user)))
  const [isLoading, setIsLoading] = useState(true)
  const [loadErrorMessage, setLoadErrorMessage] = useState('')
  const [isProfileSaving, setIsProfileSaving] = useState(false)
  const [emailDraft, setEmailDraft] = useState(user?.email ?? '')
  const [emailFlowStage, setEmailFlowStage] = useState('idle')
  const [pendingEmail, setPendingEmail] = useState('')
  const [oldEmailOtp, setOldEmailOtp] = useState('')
  const [newEmailOtp, setNewEmailOtp] = useState('')
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(() => buildEmptyAddressForm(buildProfileState(user)))
  const [isAddressSubmitting, setIsAddressSubmitting] = useState(false)

  useEffect(() => {
    setAddresses(readAddressCache(user?.userId))
  }, [user?.userId])

  useEffect(() => {
    writeAddressCache(user?.userId, addresses)
  }, [addresses, user?.userId])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const nextProfile = buildProfileState(user)

    setProfile(nextProfile)
    setProfileForm(buildProfileForm(nextProfile))
    setAddressForm((currentForm) => ({
      ...currentForm,
      receiverName: currentForm.receiverName || nextProfile.fullName || '',
      phone: currentForm.phone || nextProfile.phone || '',
    }))
    setEmailDraft(nextProfile.email)

    const nextUserId = user?.userId

    if (!nextUserId) {
      setLoadErrorMessage('Không thể xác định tài khoản hiện tại.')
      setIsLoading(false)
      return
    }

    let isCancelled = false
    const cachedAddresses = sortAddresses(readAddressCache(nextUserId))

    const loadAddresses = async () => {
      setIsLoading(true)
      setLoadErrorMessage('')

      if (cachedAddresses.length > 0) {
        setAddresses(cachedAddresses)
      }

      try {
        const response = await getAddressesRequest({ userId: nextUserId })

        if (isCancelled) {
          return
        }

        setAddresses(sortAddresses(response ?? []))
      } catch (error) {
        if (isCancelled) {
          return
        }

        setLoadErrorMessage(error.message)

        if (cachedAddresses.length === 0) {
          setAddresses([])
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadAddresses()

    return () => {
      isCancelled = true
    }
  }, [isAuthenticated, user?.avatarUrl, user?.email, user?.fullName, user?.phone, user?.role, user?.userId])

  const avatarLabel = useMemo(() => {
    const source = profile.fullName?.trim() || profile.email?.trim() || 'U'
    return source.charAt(0).toUpperCase()
  }, [profile.email, profile.fullName])

  const activeUserId = user?.userId ?? profile.id

  const resetAddressEditor = (nextProfile = profile) => {
    setEditingAddressId(null)
    setAddressForm(buildEmptyAddressForm(nextProfile))
  }

  const ensureActiveUserId = () => {
    if (!activeUserId) {
      toast.error('Không thể xác định tài khoản hiện tại.')
      return null
    }

    return activeUserId
  }

  const applyProfileResponse = (response, fallbackEmail = null) => {
    const nextProfile = buildProfileState(user, {
      ...response,
      email: response?.email ?? fallbackEmail ?? profile.email,
    })

    setProfile(nextProfile)
    setProfileForm(buildProfileForm(nextProfile))
    setEmailDraft(nextProfile.email)
    syncUser({
      email: nextProfile.email,
      userId: nextProfile.id,
      role: nextProfile.role,
      fullName: nextProfile.fullName,
      phone: nextProfile.phone,
      avatarUrl: nextProfile.avatarUrl,
    })

    if (!editingAddressId) {
      setAddressForm((currentForm) => ({
        ...currentForm,
        receiverName: currentForm.receiverName || nextProfile.fullName || '',
        phone: currentForm.phone || nextProfile.phone || '',
      }))
    }

    return nextProfile
  }

  const handleProfileFieldChange = (event) => {
    const { name, value } = event.target
    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleAvatarFileChange = (event) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileForm((currentForm) => ({
          ...currentForm,
          avatarUrl: reader.result,
        }))
      }
    }

    reader.onerror = () => {
      toast.error('Không thể đọc tệp hình ảnh đã chọn.')
    }

    reader.readAsDataURL(selectedFile)
    event.target.value = ''
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setIsProfileSaving(true)

    try {
      const response = await updateUserProfileRequest({
        email: profile.email,
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim(),
        avatar: profileForm.avatarUrl.trim(),
      })

      const nextProfile = applyProfileResponse(response)
      toast.success('Thông tin cá nhân đã được cập nhật.')

      if (!editingAddressId) {
        setAddressForm((currentForm) => ({
          ...currentForm,
          receiverName: currentForm.receiverName || nextProfile.fullName || '',
          phone: currentForm.phone || nextProfile.phone || '',
        }))
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsProfileSaving(false)
    }
  }

  const handleEmailChangeStart = async (event) => {
    event.preventDefault()

    const normalizedEmail = emailDraft.trim()

    if (!normalizedEmail) {
      toast.error('Vui lòng nhập email mới.')
      return
    }

    if (normalizedEmail === profile.email) {
      toast.info('Email mới đang trùng với email hiện tại.')
      return
    }

    setIsEmailSubmitting(true)

    try {
      await updateUserProfileRequest({
        email: normalizedEmail,
        fullName: profile.fullName,
        phone: profile.phone,
        avatar: profile.avatarUrl,
      })
    } catch (error) {
      if (isExpectedEmailOtpMessage(error.message)) {
        setPendingEmail(normalizedEmail)
        setEmailFlowStage('verify-old')
        setOldEmailOtp('')
        setNewEmailOtp('')
        toast.success(error.message)
        setIsEmailSubmitting(false)
        return
      }

      toast.error(error.message)
      setIsEmailSubmitting(false)
      return
    }

    setIsEmailSubmitting(false)
  }

  const handleConfirmOldEmailOtp = async (event) => {
    event.preventDefault()

    if (!pendingEmail) {
      toast.error('Không tìm thấy email đang chờ xác thực.')
      return
    }

    setIsEmailSubmitting(true)

    try {
      const response = await confirmOldEmailChangeRequest({
        newEmail: pendingEmail,
        otp: oldEmailOtp.trim(),
      })

      setEmailFlowStage('verify-new')
      setOldEmailOtp('')
      toast.success(response?.message ?? 'OTP đã được gửi tới email mới.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsEmailSubmitting(false)
    }
  }

  const handleConfirmNewEmailOtp = async (event) => {
    event.preventDefault()

    if (!pendingEmail) {
      toast.error('Không tìm thấy email mới đang chờ xác thực.')
      return
    }

    setIsEmailSubmitting(true)

    try {
      const response = await verifyNewEmailChangeRequest({
        newEmail: pendingEmail,
        otp: newEmailOtp.trim(),
      })

      applyProfileResponse(response, pendingEmail)
      setPendingEmail('')
      setOldEmailOtp('')
      setNewEmailOtp('')
      setEmailFlowStage('idle')
      toast.success('Email đã được cập nhật thành công.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsEmailSubmitting(false)
    }
  }

  const handleCancelEmailFlow = () => {
    setEmailFlowStage('idle')
    setPendingEmail('')
    setOldEmailOtp('')
    setNewEmailOtp('')
    setEmailDraft(profile.email)
  }

  const handleAddressFieldChange = (event) => {
    const { name, value, type, checked } = event.target
    setAddressForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleAddressSubmit = async (event) => {
    event.preventDefault()
    const currentUserId = ensureActiveUserId()

    if (!currentUserId) {
      return
    }

    setIsAddressSubmitting(true)

    const payload = {
      userId: currentUserId,
      receiverName: addressForm.receiverName.trim(),
      phone: addressForm.phone.trim(),
      address: addressForm.address.trim(),
      city: addressForm.city.trim(),
      district: addressForm.district.trim(),
      ward: addressForm.ward.trim(),
      isDefault: addressForm.isDefault,
    }

    try {
      const response = editingAddressId
        ? await updateAddressRequest(editingAddressId, payload)
        : await createAddressRequest(payload)

      setAddresses((currentAddresses) => upsertAddress(currentAddresses, response))
      resetAddressEditor()
      toast.success(editingAddressId ? 'Địa chỉ giao hàng đã được cập nhật.' : 'Đã thêm địa chỉ giao hàng mới.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsAddressSubmitting(false)
    }
  }

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id)
    setAddressForm(mapAddressToForm(address))
  }

  const handleDeleteAddress = async (addressId) => {
    const currentUserId = ensureActiveUserId()

    if (!currentUserId) {
      return
    }

    setIsAddressSubmitting(true)

    try {
      await deleteAddressRequest(addressId, { userId: currentUserId })
      setAddresses((currentAddresses) => currentAddresses.filter((address) => address.id !== addressId))

      if (editingAddressId === addressId) {
        resetAddressEditor()
      }

      toast.success('Địa chỉ giao hàng đã được xóa.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsAddressSubmitting(false)
    }
  }

  const handleSetDefaultAddress = async (address) => {
    const currentUserId = ensureActiveUserId()

    if (!currentUserId) {
      return
    }

    setIsAddressSubmitting(true)

    try {
      const response = await updateAddressRequest(address.id, {
        userId: currentUserId,
        receiverName: address.fullName,
        phone: address.phone,
        address: address.address,
        city: address.city,
        district: address.district,
        ward: address.ward,
        isDefault: true,
      })

      setAddresses((currentAddresses) => upsertAddress(currentAddresses, response))
      toast.success('Đã đặt địa chỉ mặc định cho giao hàng.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsAddressSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(248,244,239,0.95)_0%,rgba(255,255,255,1)_32%,rgba(245,239,231,0.85)_100%)]">
      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[2.75rem] border border-border bg-background/90 shadow-sm">
            <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(221,168,83,0.28),transparent_58%),radial-gradient(circle_at_top_right,rgba(115,147,179,0.18),transparent_46%)]" />

            <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-border bg-secondary/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-secondary-foreground">
                  Hồ sơ cá nhân
                </div>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] bg-foreground text-3xl font-display font-semibold text-primary-foreground">
                    {profileForm.avatarUrl ? (
                      <img src={profileForm.avatarUrl} alt={profile.fullName || profile.email} className="h-full w-full object-cover" />
                    ) : (
                      avatarLabel
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Không gian cá nhân</p>
                      <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
                        {profile.fullName?.trim() || 'Khách hàng'}
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">
                        {profile.email || 'Chưa có email'}
                      </span>
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          profile.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {profile.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="rounded-[2.25rem] border border-border bg-secondary/55 p-6">
                <p className={sectionTitleClassName}>Tổng quan tài khoản</p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.75rem] bg-background p-5">
                    <p className="text-sm text-muted-foreground">Mã người dùng</p>
                    <p className="mt-2 break-all font-semibold text-foreground">{profile.id || 'Chưa đồng bộ'}</p>
                  </div>

                  <div className="rounded-[1.75rem] bg-background p-5">
                    <p className="text-sm text-muted-foreground">Vai trò</p>
                    <p className="mt-2 font-semibold text-foreground">{formatRoleLabel(profile.role)}</p>
                  </div>

                  <div className="rounded-[1.75rem] bg-background p-5">
                    <p className="text-sm text-muted-foreground">Đồng bộ dữ liệu</p>
                    <div className="mt-3 flex items-center gap-3">
                      {isLoading ? (
                        <>
                          <LoaderCircle size={18} className="animate-spin text-foreground" />
                          <span className="text-sm font-medium text-foreground">Đang tải dữ liệu</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} className="text-emerald-600" />
                          <span className="text-sm font-medium text-foreground">
                            {loadErrorMessage ? 'Đang dùng dữ liệu khả dụng nhất' : 'Đã đồng bộ thành công'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {loadErrorMessage ? (
                    <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                      Không thể tải đầy đủ profile lúc này: {loadErrorMessage}
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <section className={`${cardClassName} space-y-6`}>
              <div>
                <p className={sectionTitleClassName}>Thông tin cá nhân</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Cập nhật hồ sơ</h2>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Họ và tên</span>
                    <input
                      name="fullName"
                      value={profileForm.fullName}
                      onChange={handleProfileFieldChange}
                      className={inputClassName}
                      placeholder="Nhập họ và tên"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Số điện thoại</span>
                    <input
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileFieldChange}
                      className={inputClassName}
                      placeholder="Nhập số điện thoại"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Email hiện tại</span>
                    <input value={profile.email} className={`${inputClassName} bg-secondary/60`} disabled />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Liên kết ảnh đại diện</span>
                    <input
                      name="avatarUrl"
                      value={profileForm.avatarUrl}
                      onChange={handleProfileFieldChange}
                      className={inputClassName}
                      placeholder="Dán URL ảnh hoặc chọn ảnh từ máy"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Tải ảnh từ máy</span>
                    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/45 px-4 py-4 text-sm text-secondary-foreground transition-colors hover:border-foreground/50 hover:bg-secondary">
                      <Camera size={18} />
                      <span>Chọn tệp hình ảnh để tải lên</span>
                      <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                    </label>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                    isProfileSaving
                      ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                      : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {isProfileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                  {isProfileSaving ? 'Đang lưu' : 'Lưu thông tin'}
                </button>
              </form>
            </section>

            <section className={`${cardClassName} space-y-6`}>
              <div>
                <p className={sectionTitleClassName}>Đổi email</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Bảo vệ bằng OTP hai bước</h2>
              </div>

              <form onSubmit={handleEmailChangeStart} className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Email mới</span>
                  <input
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    className={inputClassName}
                    placeholder="Nhập email mới"
                    type="email"
                    required
                  />
                </label>

                <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Hệ thống hiện yêu cầu 2 bước: gửi OTP đến email cũ trước, sau đó xác thực OTP tại email mới để hoàn tất.
                </div>

                <button
                  type="submit"
                  disabled={isEmailSubmitting}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                    isEmailSubmitting
                      ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                      : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {isEmailSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
                  {isEmailSubmitting ? 'Đang xử lý' : 'Bắt đầu đổi email'}
                </button>
              </form>

              {emailFlowStage !== 'idle' ? (
                <div className="space-y-5 rounded-[1.75rem] border border-border bg-secondary/45 p-5">
                  <div className="flex items-start gap-3 text-sm leading-6 text-secondary-foreground">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>
                      Đang đổi email sang <span className="font-semibold">{pendingEmail}</span>. Hoàn thành lần lượt 2 bước
                      xác thực bên dưới.
                    </p>
                  </div>

                  {emailFlowStage === 'verify-old' ? (
                    <form onSubmit={handleConfirmOldEmailOtp} className="space-y-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">OTP gửi đến email cũ</span>
                        <input
                          value={oldEmailOtp}
                          onChange={(event) => setOldEmailOtp(event.target.value)}
                          className={inputClassName}
                          placeholder="Nhập OTP email cũ"
                          required
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={isEmailSubmitting}
                          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                            isEmailSubmitting
                              ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                              : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          {isEmailSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                          Xác thực email cũ
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEmailFlow}
                          className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {emailFlowStage === 'verify-new' ? (
                    <form onSubmit={handleConfirmNewEmailOtp} className="space-y-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">OTP gửi đến email mới</span>
                        <input
                          value={newEmailOtp}
                          onChange={(event) => setNewEmailOtp(event.target.value)}
                          className={inputClassName}
                          placeholder="Nhập OTP email mới"
                          required
                        />
                      </label>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={isEmailSubmitting}
                          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                            isEmailSubmitting
                              ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                              : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          {isEmailSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                          Hoàn tất đổi email
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEmailFlow}
                          className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <section className={`${cardClassName} mt-8 space-y-6`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className={sectionTitleClassName}>Địa chỉ giao hàng</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Quản lý địa chỉ và mặc định giao hàng</h2>
              </div>

              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                BE hiện chưa có API GET địa chỉ, nên danh sách bên dưới được cache trên FE sau khi bạn thêm, sửa hoặc xóa trong phiên này.
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {addresses.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-border bg-secondary/35 p-6 text-sm leading-7 text-muted-foreground">
                    Chưa có địa chỉ giao hàng nào được đồng bộ trong trình duyệt này. Sau khi bạn thêm mới, danh sách sẽ hiện ở đây
                    và có thể tiếp tục sửa, xóa hoặc đặt làm mặc định.
                  </div>
                ) : (
                  addresses.map((address) => (
                    <article key={address.id} className="rounded-[1.75rem] border border-border bg-secondary/40 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{address.fullName}</h3>
                            {address.isDefault ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                Mặc định
                              </span>
                            ) : null}
                          </div>

                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {address.address}, {address.ward}, {address.district}, {address.city}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!address.isDefault ? (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(address)}
                              disabled={isAddressSubmitting}
                              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                            >
                              Đặt mặc định
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleEditAddress(address)}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                          >
                            <Pencil size={14} />
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(address.id)}
                            disabled={isAddressSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 transition hover:border-rose-400"
                          >
                            <Trash2 size={14} />
                            Xóa
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={handleAddressSubmit} className="space-y-5 rounded-[1.9rem] border border-border bg-background p-5">
                <div>
                  <p className={sectionTitleClassName}>{editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
                    {editingAddressId ? 'Chỉnh sửa địa chỉ giao hàng' : 'Nhập địa chỉ giao hàng'}
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Người nhận</span>
                    <input
                      name="receiverName"
                      value={addressForm.receiverName}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhập tên người nhận"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Số điện thoại</span>
                    <input
                      name="phone"
                      value={addressForm.phone}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhập số điện thoại"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Tỉnh / Thành phố</span>
                    <input
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhập tỉnh / thành phố"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Quận / Huyện</span>
                    <input
                      name="district"
                      value={addressForm.district}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhập quận / huyện"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Phường / Xã</span>
                    <input
                      name="ward"
                      value={addressForm.ward}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhập phường / xã"
                      required
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Địa chỉ cụ thể</span>
                    <textarea
                      name="address"
                      value={addressForm.address}
                      onChange={handleAddressFieldChange}
                      className={`${inputClassName} min-h-28 resize-none`}
                      placeholder="Số nhà, tên đường, tòa nhà..."
                      required
                    />
                  </label>
                </div>

                <label className="inline-flex items-start gap-3 rounded-[1.5rem] bg-secondary/60 px-4 py-3 text-sm leading-6 text-secondary-foreground">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={addressForm.isDefault}
                    onChange={handleAddressFieldChange}
                    className="mt-1 h-4 w-4 rounded border-border accent-foreground"
                  />
                  Đặt địa chỉ này làm mặc định để dùng cho giao hàng về sau.
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isAddressSubmitting}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] transition ${
                      isAddressSubmitting
                        ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                        : 'bg-foreground text-primary-foreground hover:-translate-y-0.5 hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {isAddressSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <MapPin size={16} />}
                    {editingAddressId ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}
                  </button>

                  {editingAddressId ? (
                    <button
                      type="button"
                      onClick={() => resetAddressEditor()}
                      className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                    >
                      Hủy sửa
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </section>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <article className={cardClassName}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <UserRound size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Họ và tên</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{profile.fullName || 'Chưa cập nhật'}</p>
                </div>
              </div>
            </article>

            <article className={cardClassName}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Email</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{profile.email || 'Chưa cập nhật'}</p>
                </div>
              </div>
            </article>

            <article className={cardClassName}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Số điện thoại</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{profile.phone || 'Chưa cập nhật'}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Profile
