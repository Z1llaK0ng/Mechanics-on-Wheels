import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../infrastructure/api/client'
import { useAuthStore } from '../../infrastructure/store/authStore'
import type { Token, Mechanic } from '../../domain/types'

interface LoginPayload {
    username: string // OAuth2 form requires "username" field
    password: string
}

export function useAuth() {
    const { login, logout, mechanic, isAuthenticated } = useAuthStore()
    const navigate = useNavigate()

    const loginMutation = useMutation({
        mutationFn: async (data: LoginPayload) => {
            // OAuth2PasswordRequestForm requires form-urlencoded
            const form = new URLSearchParams()
            form.append('username', data.username)
            form.append('password', data.password)

            const tokenRes = await apiClient.post<Token>('/auth/login', form, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })

            // Fetch mechanic profile with the new token
            const profileRes = await apiClient.get<Mechanic>('/auth/me', {
                headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
            })

            login(tokenRes.data.access_token, profileRes.data)
            navigate('/dashboard')
        }
    })

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return { loginMutation, handleLogout, mechanic, isAuthenticated }
}
