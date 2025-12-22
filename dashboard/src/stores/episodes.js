import { defineStore } from 'pinia'
import api from '@/api/axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useEpisodesStore = defineStore('episodes', {
    state: () => ({
        episodes: [],
        currentEpisode: null,
        loading: false,
        error: null,
        uploadProgress: 0,
        uploading: false
    }),

    getters: {
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
        },
        episodesWithAudio() {
            return Array.isArray(this.episodes)
                ? this.episodes.filter(e => e.audioFile?.exists)
                : []
        }
    },

    actions: {
        async fetchEpisodes(filters = {}) {
            this.loading = true
            this.error = null
            try {
                const params = new URLSearchParams()
                if (filters.showId) params.append('showId', filters.showId)
                if (filters.status) params.append('status', filters.status)

                const url = params.toString()
                    ? `${API_URL}/episodes?${params}`
                    : `${API_URL}/episodes`

                const response = await api.get(url)
                this.episodes = response.data
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
                if (this.currentEpisode?._id === id) {
                    this.currentEpisode = response.data
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
                if (this.currentEpisode?._id === id) {
                    this.currentEpisode = null
                }
            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nell\'eliminazione dell\'episodio'
                throw error
            } finally {
                this.loading = false
            }
        },

        // ✅ NUOVE FUNZIONI PER UPLOAD AUDIO

        /**
         * Upload file audio MP3 per un episodio
         * @param {string} episodeId - ID dell'episodio
         * @param {File} audioFile - File MP3 da caricare
         * @param {Function} onProgress - Callback per progress (opzionale)
         */
        async uploadAudio(episodeId, audioFile, onProgress = null) {
            this.uploading = true
            this.uploadProgress = 0
            this.error = null

            try {
                const formData = new FormData()
                formData.append('audio', audioFile)

                const response = await api.post(
                    `${API_URL}/episodes/${episodeId}/upload`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        },
                        onUploadProgress: (progressEvent) => {
                            const progress = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            )
                            this.uploadProgress = progress

                            if (onProgress) {
                                onProgress(progress)
                            }
                        }
                    }
                )

                // Aggiorna l'episodio nella lista
                const index = this.episodes.findIndex(e => e._id === episodeId)
                if (index !== -1) {
                    this.episodes[index] = response.data.episode
                }

                // Aggiorna currentEpisode se corrisponde
                if (this.currentEpisode?._id === episodeId) {
                    this.currentEpisode = response.data.episode
                }

                return response.data

            } catch (error) {
                const errorMsg = error.response?.data?.error || 'Errore nel caricamento del file audio'
                this.error = errorMsg
                throw new Error(errorMsg)
            } finally {
                this.uploading = false
                this.uploadProgress = 0
            }
        },

        /**
         * Elimina il file audio di un episodio
         * @param {string} episodeId - ID dell'episodio
         */
        async deleteAudio(episodeId) {
            this.loading = true
            this.error = null

            try {
                await api.delete(`${API_URL}/episodes/${episodeId}/audio`)

                // Aggiorna l'episodio nella lista
                const index = this.episodes.findIndex(e => e._id === episodeId)
                if (index !== -1) {
                    this.episodes[index].audioFile = undefined
                }

                // Aggiorna currentEpisode se corrisponde
                if (this.currentEpisode?._id === episodeId) {
                    this.currentEpisode.audioFile = undefined
                }

            } catch (error) {
                this.error = error.response?.data?.error || 'Errore nell\'eliminazione del file audio'
                throw error
            } finally {
                this.loading = false
            }
        },

        /**
         * Ottieni URL di streaming per un episodio
         * @param {string} episodeId - ID dell'episodio
         * @param {boolean} isPublic - Se true usa l'endpoint pubblico
         */
        getStreamUrl(episodeId, isPublic = false) {
            if (isPublic) {
                return `${API_URL}/episodes/public/${episodeId}/stream`
            }
            return `${API_URL}/episodes/${episodeId}/stream`
        },

        /**
         * Verifica bitrate di un file audio prima dell'upload
         * Nota: questa funzione è solo indicativa, la validazione reale avviene nel backend
         */
        async validateAudioFile(file) {
            // Validazioni client-side di base
            if (!file) {
                throw new Error('Nessun file selezionato')
            }

            // Verifica tipo MIME
            if (!file.type.includes('audio/mpeg') && !file.type.includes('audio/mp3')) {
                throw new Error('Il file deve essere in formato MP3')
            }

            // Verifica dimensione (max 500MB)
            const maxSize = 500 * 1024 * 1024
            if (file.size > maxSize) {
                throw new Error('Il file è troppo grande (max 500MB)')
            }

            return true
        },

        /**
         * Reset stato upload
         */
        resetUploadState() {
            this.uploading = false
            this.uploadProgress = 0
        },

        /**
         * Clear error
         */
        clearError() {
            this.error = null
        }
    }
})