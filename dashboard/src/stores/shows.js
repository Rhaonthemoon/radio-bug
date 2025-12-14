import { defineStore } from 'pinia'
import api from '@/api/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useShowsStore = defineStore('shows', {
    state: () => ({
        shows: [],
        currentShow: null,
        loading: false,
        error: null
    }),

    getters: {
        activeShows: (state) => state.shows.filter(s => s.status === 'active'),
        inactiveShows: (state) => state.shows.filter(s => s.status === 'inactive'),
        featuredShows: (state) => state.shows.filter(s => s.featured),
        archivedShows: (state) => state.shows.filter(s => s.status === 'archived'),

        showsCount: (state) => state.shows.length,
        activeCount: (state) => state.shows.filter(s => s.status === 'active').length,
        featuredCount: (state) => state.shows.filter(s => s.featured).length
    },

    actions: {
        async fetchShows(filters = {}) {
            this.loading = true
            this.error = null
            try {
                const params = new URLSearchParams(filters)
                const response = await api.get(`${API_URL}/shows?${params}`)
                this.shows = response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nel caricamento degli show'
                throw error
            } finally {
                this.loading = false
            }
        },

        async fetchShowById(id) {
            this.loading = true
            this.error = null
            try {
                const response = await api.get(`${API_URL}/shows/${id}`)
                this.currentShow = response.data
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nel caricamento dello show'
                throw error
            } finally {
                this.loading = false
            }
        },

        async createShow(showData) {
            this.loading = true
            this.error = null
            try {
                const response = await api.post(`${API_URL}/shows`, showData)
                this.shows.unshift(response.data)
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nella creazione dello show'
                throw error
            } finally {
                this.loading = false
            }
        },

        async updateShow(id, showData) {
            this.loading = true
            this.error = null
            try {
                const response = await api.put(`${API_URL}/shows/${id}`, showData)
                const index = this.shows.findIndex(s => s._id === id)
                if (index !== -1) {
                    this.shows[index] = response.data
                }
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nell\'aggiornamento dello show'
                throw error
            } finally {
                this.loading = false
            }
        },

        async deleteShow(id) {
            this.loading = true
            this.error = null
            try {
                await api.delete(`${API_URL}/shows/${id}`)
                this.shows = this.shows.filter(s => s._id !== id)
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nell\'eliminazione dello show'
                throw error
            } finally {
                this.loading = false
            }
        }
    }
})