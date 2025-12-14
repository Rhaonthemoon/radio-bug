// dashboard/src/api/axios.js
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Crea un'istanza axios condivisa
const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Interceptor per aggiungere il token a TUTTE le richieste
api.interceptors.request.use(
    (config) => {
        // Leggi il token da localStorage (chiave: 'token')
        const token = localStorage.getItem('token')

        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Interceptor per gestire le risposte
api.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        // Gestione errori 401 (token scaduto o non valido)
        if (error.response?.status === 401) {
            console.warn('Token expired or invalid')

            // Rimuovi il token
            localStorage.removeItem('token')

            // Reindirizza al login solo se non siamo già lì
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    }
)

export default api