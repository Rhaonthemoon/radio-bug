import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null
    }),

    getters: {
        isAuthenticated: (state) => !!state.token,
        isAdmin: (state) => state.user?.role === 'admin',
        isArtist: (state) => state.user?.role === 'artist',
        userName: (state) => state.user?.name || 'User',
        userAvatar: (state) => state.user?.avatar || null
    },

    actions: {
        // Login tradizionale
        async login(credentials) {
            this.loading = true
            this.error = null

            try {
                const response = await axios.post(`${API_URL}/auth/login`, credentials)

                this.token = response.data.token
                this.user = response.data.user

                localStorage.setItem('token', this.token)
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`

                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Login failed'
                throw error
            } finally {
                this.loading = false
            }
        },

        // Registrazione
        async register(formData) {
            this.loading = true
            this.error = null

            try {
                const response = await axios.post(`${API_URL}/auth/register`, formData)

                this.token = response.data.token
                this.user = response.data.user

                localStorage.setItem('token', this.token)
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`

                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Registration failed'
                throw error
            } finally {
                this.loading = false
            }
        },

        // Login con token (per OAuth callback)
        async loginWithToken(token) {
            this.loading = true
            this.error = null

            try {
                // Salva il token
                this.token = token
                localStorage.setItem('token', token)
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

                // Recupera i dati utente
                const apiUrl = import.meta.env.VITE_API_URL || 'https://radio-bug-api.onrender.com'
                const response = await axios.get(`${apiUrl}/auth/me`)
                this.user = response.data

                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Authentication failed'
                this.logout()
                throw error
            } finally {
                this.loading = false
            }
        },

        // Inizializza auth all'avvio
        async initAuth() {
            if (!this.token) return

            try {
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
                const response = await axios.get(`${API_URL}auth/me`)
                this.user = response.data
            } catch (error) {
                console.error('Auth init failed:', error)
                this.logout()
            }
        },

        // Logout
        logout() {
            this.user = null
            this.token = null
            this.error = null

            localStorage.removeItem('token')
            delete axios.defaults.headers.common['Authorization']
        }
    }
})