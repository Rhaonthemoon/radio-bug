import { defineStore } from 'pinia'
import api from '@/api/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useEpisodesStore = defineStore('episodes', {
    state: () => ({
        episodes: [],  // ✅ CRITICO: deve essere array vuoto
        currentEpisode: null,
        loading: false,
        error: null
    }),

    getters: {
        // ✅ Aggiungi getter sicuri
        publishedEpisodes() {
            return Array.isArray(this.episodes)
                ? this.episodes.filter(e => e.status === 'published')
                : []
        },
        draftEpisodes() {
            return Array.isArray(this.episodes)
                ? this.episodes.filter(e => e.status === 'draft')
                : []
        },
        featuredEpisodes() {
            return Array.isArray(this.episodes)
                ? this.episodes.filter(e => e.featured)
                : []
        }
    },


    actions: {
        async fetchEpisodes(filters = {}) {
            this.loading = true
            this.error = null
            console.log('Filters:', filters)
            try {
                const params = new URLSearchParams(filters)
                console.log('Params:', params)
                const response = await api.get(`${API_URL}/episodes/${params}`)
                this.episodes = response.data
                console.log(response)
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nel caricamento degli episodi'
                throw error
            } finally {
                this.loading = false
            }
        },

        async fetchEpisodeById(id) {
            this.loading = true
            this.error = null
            try {
                const response = await api.get(`${API_URL}/episodes/${id}`)
                this.currentEpisode = response.data
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nel caricamento dell\'episodio'
                throw error
            } finally {
                this.loading = false
            }
        },

        async createEpisode(episodeData) {
            this.loading = true
            this.error = null
            try {
                const response = await api.post(`${API_URL}/episodes`, episodeData)
                this.episodes.unshift(response.data)
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nella creazione dell\'episodio'
                throw error
            } finally {
                this.loading = false
            }
        },

        async updateEpisode(id, episodeData) {
            this.loading = true
            this.error = null
            try {
                const response = await api.put(`${API_URL}/episodes/${id}`, episodeData)
                const index = this.episodes.findIndex(e => e._id === id)
                if (index !== -1) {
                    this.episodes[index] = response.data
                }
                return response.data
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nell\'aggiornamento dell\'episodio'
                throw error
            } finally {
                this.loading = false
            }
        },

        async deleteEpisode(id) {
            this.loading = true
            this.error = null
            try {
                await api.delete(`${API_URL}/episodes/${id}`)
                this.episodes = this.episodes.filter(e => e._id !== id)
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nell\'eliminazione dell\'episodio'
                throw error
            } finally {
                this.loading = false
            }
        }
    }
})
