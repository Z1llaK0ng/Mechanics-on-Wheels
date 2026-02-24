import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Mechanic } from '../../domain/types'

interface AuthState {
    token: string | null
    mechanic: Mechanic | null
    isAuthenticated: boolean
    login: (token: string, mechanic: Mechanic) => void
    logout: () => void
    setMechanic: (mechanic: Mechanic) => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            mechanic: null,
            isAuthenticated: false,

            login: (token, mechanic) =>
                set({ token, mechanic, isAuthenticated: true }),

            logout: () =>
                set({ token: null, mechanic: null, isAuthenticated: false }),

            setMechanic: (mechanic) => set({ mechanic })
        }),
        {
            name: 'mow-auth', // localStorage key
            partialize: (state) => ({ token: state.token, mechanic: state.mechanic })
        }
    )
)
