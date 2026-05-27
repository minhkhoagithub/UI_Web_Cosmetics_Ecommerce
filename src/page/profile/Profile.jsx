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
    return 'Chua cap nhat'
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
  (message.includes('OTP gui den email cu') || message.includes('Yeu cau doi email da duoc ghi nhan'))

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
      setLoadErrorMessage('Khong the xac dinh tai khoan hien tai.')
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
      toast.error('Khong the xac dinh tai khoan hien tai.')
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
      toast.error('Vui long chon mot tep hinh anh hop le.')
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
      toast.error('Khong the doc tep hinh anh da chon.')
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
      toast.success('Thong tin ca nhan da duoc cap nhat.')

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
      toast.error('Vui long nhap email moi.')
      return
    }

    if (normalizedEmail === profile.email) {
      toast.info('Email moi dang trung voi email hien tai.')
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
      toast.error('Khong tim thay email dang cho xac thuc.')
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
      toast.success(response?.message ?? 'OTP da duoc gui toi email moi.')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsEmailSubmitting(false)
    }
  }

  const handleConfirmNewEmailOtp = async (event) => {
    event.preventDefault()

    if (!pendingEmail) {
      toast.error('Khong tim thay email moi dang cho xac thuc.')
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
      toast.success('Email da duoc cap nhat thanh cong.')
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
      toast.success(editingAddressId ? 'Dia chi giao hang da duoc cap nhat.' : 'Da them dia chi giao hang moi.')
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

      toast.success('Dia chi giao hang da duoc xoa.')
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
      toast.success('Da dat dia chi mac dinh cho giao hang.')
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
                  Profile Studio
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
                      <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Khong gian ca nhan</p>
                      <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
                        {profile.fullName?.trim() || 'Khach hang'}
                      </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">
                        {profile.email || 'Chua co email'}
                      </span>
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          profile.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {profile.isActive ? 'Dang hoat dong' : 'Tam khoa'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  Ban co the cap nhat thong tin ca nhan, doi email theo luong OTP cua backend, chon anh dai dien va quan
                  ly dia chi giao hang ngay trong trang nay.
                </p>
              </div>

              <aside className="rounded-[2.25rem] border border-border bg-secondary/55 p-6">
                <p className={sectionTitleClassName}>Tong quan tai khoan</p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.75rem] bg-background p-5">
                    <p className="text-sm text-muted-foreground">Ma nguoi dung</p>
                    <p className="mt-2 break-all font-semibold text-foreground">{profile.id || 'Chua dong bo'}</p>
                  </div>

                  <div className="rounded-[1.75rem] bg-background p-5">
                    <p className="text-sm text-muted-foreground">Vai tro</p>
                    <p className="mt-2 font-semibold text-foreground">{formatRoleLabel(profile.role)}</p>
                  </div>

                  <div className="rounded-[1.75rem] bg-background p-5">
                    <p className="text-sm text-muted-foreground">Dong bo backend</p>
                    <div className="mt-3 flex items-center gap-3">
                      {isLoading ? (
                        <>
                          <LoaderCircle size={18} className="animate-spin text-foreground" />
                          <span className="text-sm font-medium text-foreground">Dang tai du lieu</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={18} className="text-emerald-600" />
                          <span className="text-sm font-medium text-foreground">
                            {loadErrorMessage ? 'Dang dung du lieu kha dung nhat' : 'Da dong bo thanh cong'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {loadErrorMessage ? (
                    <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
                      Khong the tai day du profile luc nay: {loadErrorMessage}
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <section className={`${cardClassName} space-y-6`}>
              <div>
                <p className={sectionTitleClassName}>Thong tin ca nhan</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Cap nhat ho so co ban</h2>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Ho va ten</span>
                    <input
                      name="fullName"
                      value={profileForm.fullName}
                      onChange={handleProfileFieldChange}
                      className={inputClassName}
                      placeholder="Nhap ho va ten"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">So dien thoai</span>
                    <input
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileFieldChange}
                      className={inputClassName}
                      placeholder="Nhap so dien thoai"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Email hien tai</span>
                    <input value={profile.email} className={`${inputClassName} bg-secondary/60`} disabled />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Lien ket anh dai dien</span>
                    <input
                      name="avatarUrl"
                      value={profileForm.avatarUrl}
                      onChange={handleProfileFieldChange}
                      className={inputClassName}
                      placeholder="Dan URL anh hoac chon anh tu may"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Tai anh tu may</span>
                    <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/45 px-4 py-4 text-sm text-secondary-foreground transition-colors hover:border-foreground/50 hover:bg-secondary">
                      <Camera size={18} />
                      <span>Chon tep hinh anh de tao preview va gui len backend</span>
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
                  {isProfileSaving ? 'Dang luu' : 'Luu thong tin'}
                </button>
              </form>
            </section>

            <section className={`${cardClassName} space-y-6`}>
              <div>
                <p className={sectionTitleClassName}>Doi email</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Bao ve bang OTP hai buoc</h2>
              </div>

              <form onSubmit={handleEmailChangeStart} className="space-y-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Email moi</span>
                  <input
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    className={inputClassName}
                    placeholder="Nhap email moi"
                    type="email"
                    required
                  />
                </label>

                <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Backend hien yeu cau 2 buoc: gui OTP den email cu truoc, sau do xac thuc OTP tai email moi de hoan tat.
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
                  {isEmailSubmitting ? 'Dang xu ly' : 'Bat dau doi email'}
                </button>
              </form>

              {emailFlowStage !== 'idle' ? (
                <div className="space-y-5 rounded-[1.75rem] border border-border bg-secondary/45 p-5">
                  <div className="flex items-start gap-3 text-sm leading-6 text-secondary-foreground">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>
                      Dang doi email sang <span className="font-semibold">{pendingEmail}</span>. Hoan thanh lan luot 2 buoc
                      xac thuc ben duoi.
                    </p>
                  </div>

                  {emailFlowStage === 'verify-old' ? (
                    <form onSubmit={handleConfirmOldEmailOtp} className="space-y-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">OTP gui den email cu</span>
                        <input
                          value={oldEmailOtp}
                          onChange={(event) => setOldEmailOtp(event.target.value)}
                          className={inputClassName}
                          placeholder="Nhap OTP email cu"
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
                          Xac thuc email cu
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEmailFlow}
                          className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                        >
                          Huy
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {emailFlowStage === 'verify-new' ? (
                    <form onSubmit={handleConfirmNewEmailOtp} className="space-y-4">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-foreground">OTP gui den email moi</span>
                        <input
                          value={newEmailOtp}
                          onChange={(event) => setNewEmailOtp(event.target.value)}
                          className={inputClassName}
                          placeholder="Nhap OTP email moi"
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
                          Hoan tat doi email
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEmailFlow}
                          className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                        >
                          Huy
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
                <p className={sectionTitleClassName}>Dia chi giao hang</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-foreground">Quan ly dia chi va mac dinh giao hang</h2>
              </div>

              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                BE hien chua co API GET dia chi, nen danh sach ben duoi duoc cache tren FE sau khi ban them, sua hoac xoa trong phien nay.
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {addresses.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-border bg-secondary/35 p-6 text-sm leading-7 text-muted-foreground">
                    Chua co dia chi giao hang nao duoc dong bo trong trinh duyet nay. Sau khi ban them moi, danh sach se hien o day
                    va co the tiep tuc sua, xoa hoac dat lam mac dinh.
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
                                Mac dinh
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
                              Dat mac dinh
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleEditAddress(address)}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                          >
                            <Pencil size={14} />
                            Sua
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(address.id)}
                            disabled={isAddressSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 transition hover:border-rose-400"
                          >
                            <Trash2 size={14} />
                            Xoa
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={handleAddressSubmit} className="space-y-5 rounded-[1.9rem] border border-border bg-background p-5">
                <div>
                  <p className={sectionTitleClassName}>{editingAddressId ? 'Cap nhat dia chi' : 'Them dia chi moi'}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-foreground">
                    {editingAddressId ? 'Chinh sua dia chi giao hang' : 'Nhap dia chi giao hang'}
                  </h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Nguoi nhan</span>
                    <input
                      name="receiverName"
                      value={addressForm.receiverName}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhap ten nguoi nhan"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">So dien thoai</span>
                    <input
                      name="phone"
                      value={addressForm.phone}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhap so dien thoai"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Tinh / Thanh pho</span>
                    <input
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhap tinh / thanh pho"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Quan / Huyen</span>
                    <input
                      name="district"
                      value={addressForm.district}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhap quan / huyen"
                      required
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Phuong / Xa</span>
                    <input
                      name="ward"
                      value={addressForm.ward}
                      onChange={handleAddressFieldChange}
                      className={inputClassName}
                      placeholder="Nhap phuong / xa"
                      required
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-foreground">Dia chi cu the</span>
                    <textarea
                      name="address"
                      value={addressForm.address}
                      onChange={handleAddressFieldChange}
                      className={`${inputClassName} min-h-28 resize-none`}
                      placeholder="So nha, ten duong, toa nha..."
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
                  Dat dia chi nay lam mac dinh de dung cho giao hang ve sau.
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
                    {editingAddressId ? 'Luu dia chi' : 'Them dia chi'}
                  </button>

                  {editingAddressId ? (
                    <button
                      type="button"
                      onClick={() => resetAddressEditor()}
                      className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-foreground transition hover:border-foreground"
                    >
                      Huy sua
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
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Ho va ten</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{profile.fullName || 'Chua cap nhat'}</p>
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
                  <p className="mt-2 text-lg font-semibold text-foreground">{profile.email || 'Chua cap nhat'}</p>
                </div>
              </div>
            </article>

            <article className={cardClassName}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">So dien thoai</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{profile.phone || 'Chua cap nhat'}</p>
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
