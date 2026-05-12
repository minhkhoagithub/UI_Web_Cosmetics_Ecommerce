import { createContext, useContext, useState } from 'react'
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  loginRequest,
  logoutRequest,
  registerRequest,
  storeAuthSession,
  verifyRegistrationOtpRequest,
} from '../services/auth'

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
