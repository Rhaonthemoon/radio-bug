import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useArtistStore = defineStore('artist', {
    state: () => ({
        myRequests: [],
        loading: false,
        error: null
    }),

    getters: {
        pendingRequests: (state) => state.myRequests.filter(r => r.requestStatus === 'pending'),
        approvedRequests: (state) => state.myRequests.filter(r => r.requestStatus === 'approved'),
        rejectedRequests: (state) => state.myRequests.filter(r => r.requestStatus === 'rejected'),

        pendingCount: (state) => state.myRequests.filter(r => r.requestStatus === 'pending').length,
        approvedCount: (state) => state.myRequests.filter(r => r.requestStatus === 'approved').length
    },

    actions: {
        async fetchMyRequests() {
            this.loading = true
            this.error = null
            try {
                const response = await axios.get(`${API_URL}/shows`)
                this.myRequests = response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nel caricamento delle richieste'
                throw error
            } finally {
                this.loading = false
            }
        },

        async createRequest(showData) {
            this.loading = true
            this.error = null
            try {
                const response = await axios.post(`${API_URL}/shows/artist/request`, showData)
                this.myRequests.unshift(response.data)
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nella creazione della richiesta'
                throw error
            } finally {
                this.loading = false
            }
        }
    }
})