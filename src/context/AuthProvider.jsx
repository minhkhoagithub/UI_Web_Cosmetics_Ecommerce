import { createContext, useContext, useEffect, useState } from 'react'
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  loginRequest,
  logoutRequest,
  replaceStoredAuthSession,
  registerRequest,
  storeAuthSession,
  verifyRegistrationOtpRequest,
} from '../services/auth'
import { getCurrentUserProfileRequest } from '../services/user'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => getStoredAuthSession())
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const login = async ({ identifier, password, remember }) => {
    setIsAuthenticating(true)

    try {
      const nextSession = await loginRequest({ identifier, password })
      storeAuthSession(nextSession, remember)
      setSession(getStoredAuthSession())
      return nextSession
    } finally {
      setIsAuthenticating(false)
    }
  }

  const registerUser = async ({ email, password, fullName, phone }) => {
    setIsAuthenticating(true)

    try {
      return await registerRequest({ email, password, fullName, phone })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const verifyRegistrationOtp = async ({ email, otp }) => {
    setIsAuthenticating(true)

    try {
      return await verifyRegistrationOtpRequest({ email, otp })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const logout = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)

    try {
      await logoutRequest(session?.accessToken)
    } catch {
      // Always clear the local session, even if the backend logout request fails.
    } finally {
      clearStoredAuthSession()
      setSession(null)
      setIsLoggingOut(false)
    }
  }

  const syncUser = (userPatch) => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession
      }

      const nextSession = {
        ...currentSession,
        user: {
          ...currentSession.user,
          ...userPatch,
        },
      }

      replaceStoredAuthSession(nextSession)
      return nextSession
    })
  }

  useEffect(() => {
    if (!session?.accessToken || session?.user?.fullName?.trim()) {
      return
    }

    let isSubscribed = true

    const hydrateCurrentUser = async () => {
      try {
        const profile = await getCurrentUserProfileRequest()
        if (!isSubscribed) {
          return
        }

        const nextSession = {
          ...session,
          user: {
            ...session.user,
            email: profile?.email ?? session.user?.email ?? '',
            userId: profile?.id ?? session.user?.userId ?? '',
            role: profile?.role ?? session.user?.role ?? '',
            fullName: profile?.fullName ?? '',
            phone: profile?.phone ?? '',
            avatarUrl: profile?.avatarUrl ?? '',
          },
        }

        replaceStoredAuthSession(nextSession)
        setSession(nextSession)
      } catch {
        // Keep the current session as-is if hydration fails.
      }
    }

    hydrateCurrentUser()

    return () => {
      isSubscribed = false
    }
  }, [session])

  return (
    <AuthContext.Provider
      value={{
        session,
        token: session?.accessToken ?? null,
        user: session?.user ?? null,
        isAuthenticated: Boolean(session?.accessToken),
        isAuthenticating,
        isLoggingOut,
        login,
        registerUser,
        verifyRegistrationOtp,
        logout,
        syncUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
