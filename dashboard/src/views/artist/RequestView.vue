<template>
  <div class="request-page">
    <div class="request-container">
      <Card class="request-card">
        <template #header>
          <div class="request-header">
            <i class="pi pi-radio-button" style="font-size: 3rem; color: #3b82f6;"></i>
            <h2>Richiedi il tuo Show su BUG Radio</h2>
            <p>Compila tutti i campi per inviare la tua richiesta all'admin</p>
          </div>
        </template>

        <template #content>
          <form @submit.prevent="submitRequest" class="request-form">
            <!-- Informazioni Show -->
            <div class="form-section">
              <h3><i class="pi pi-microphone"></i> Informazioni Show</h3>

              <div class="form-field">
                <ImageUpload
                  label="Immagine Copertina Show *"
                  v-model="formData.image.url"
                />
              </div>

              <div class="form-field">
                <label for="title">Titolo Show *</label>
                <InputText
                  id="title"
                  v-model="formData.title"
                  placeholder="Es. Noise à Noise, Deep Space Radio..."
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="description">Descrizione Show *</label>
                <Textarea
                  id="description"
                  v-model="formData.description"
                  rows="4"
                  placeholder="Descrivi il tuo show: format, contenuti, stile..."
                  required
                  class="w-full"
                />
              </div>
            </div>

            <!-- NUOVA SEZIONE: Audio Show -->
            <div class="form-section">
              <h3><i class="pi pi-volume-up"></i> Audio Show *</h3>
              <p class="section-description">
                Carica un file audio rappresentativo del tuo show (es. mix, demo, episodio pilota)
              </p>

              <div class="audio-upload-section">
                <div class="upload-requirements">
                  <Tag severity="info" icon="pi pi-info-circle">
                    Formati: MP3 | Max 500MB | Min 128kbps | Max 60 minuti
                  </Tag>
                </div>

                <div class="file-upload-wrapper">
                  <input
                    type="file"
                    ref="audioFileInput"
                    accept="audio/mp3,audio/mpeg"
                    @change="onAudioFileChange"
                    class="file-input"
                  />
                  <Button
                    type="button"
                    :label="selectedAudioFile ? 'Cambia file' : 'Seleziona file MP3'"
                    :icon="selectedAudioFile ? 'pi pi-refresh' : 'pi pi-folder-open'"
                    :severity="selectedAudioFile ? 'success' : 'secondary'"
                    outlined
                    @click="triggerFileInput"
                    class="select-file-button"
                  />
                </div>

                <!-- File selezionato -->
                <div v-if="selectedAudioFile" class="selected-audio-card">
                  <div class="audio-file-icon">
                    <i class="pi pi-file-audio"></i>
                  </div>
                  <div class="audio-file-info">
                    <span class="audio-file-name">{{ selectedAudioFile.name }}</span>
                    <span class="audio-file-size">{{ formatFileSize(selectedAudioFile.size) }}</span>
                  </div>
                  <Button
                    type="button"
                    icon="pi pi-times"
                    severity="danger"
                    text
                    rounded
                    @click="clearAudioFile"
                    v-tooltip.top="'Rimuovi'"
                  />
                </div>

                <!-- Messaggio se non selezionato -->
                <Message v-if="!selectedAudioFile && audioError" severity="error" :closable="false">
                  {{ audioError }}
                </Message>
              </div>
            </div>

            <!-- Informazioni Artista -->
            <div class="form-section">
              <h3><i class="pi pi-user"></i> Informazioni Artista</h3>

              <div class="form-field">
                <ImageUpload
                  label="Foto Artista"
                  v-model="formData.artist.photo"
                />
              </div>

              <div class="form-field">
                <label for="artistName">Nome Artista / Collettivo *</label>
                <InputText
                  id="artistName"
                  v-model="formData.artist.name"
                  placeholder="Il tuo nome artistico"
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="artistBio">Bio *</label>
                <Textarea
                  id="artistBio"
                  v-model="formData.artist.bio"
                  rows="3"
                  placeholder="Parlaci di te..."
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="artistEmail">Email di contatto *</label>
                <InputText
                  id="artistEmail"
                  v-model="formData.artist.email"
                  type="email"
                  placeholder="email@example.com"
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label>Social Links</label>
                <div class="social-inputs">
                  <span class="p-input-icon-left w-full">
                    <i class="pi pi-instagram"></i>
                    <InputText
                      v-model="formData.artist.socialLinks.instagram"
                      placeholder="Instagram URL"
                      class="w-full"
                    />
                  </span>
                  <span class="p-input-icon-left w-full">
                    <i class="pi pi-cloud"></i>
                    <InputText
                      v-model="formData.artist.socialLinks.soundcloud"
                      placeholder="SoundCloud URL"
                      class="w-full"
                    />
                  </span>
                  <span class="p-input-icon-left w-full">
                    <i class="pi pi-volume-up"></i>
                    <InputText
                      v-model="formData.artist.socialLinks.mixcloud"
                      placeholder="Mixcloud URL"
                      class="w-full"
                    />
                  </span>
                </div>
              </div>
            </div>

            <!-- Generi e Programmazione -->
            <div class="form-section">
              <h3><i class="pi pi-tags"></i> Generi Musicali e Programmazione</h3>

              <div class="form-field">
                <label for="genres">Generi Musicali *</label>
                <InputText
                  id="genres"
                  v-model="genresInput"
                  placeholder="Ambient, Experimental, Drone, Techno..."
                  required
                  class="w-full"
                />
                <small>Inserisci i generi separati da virgola (almeno uno)</small>
              </div>

              <div class="form-field">
                <label for="tags">Tags</label>
                <InputText
                  id="tags"
                  v-model="tagsInput"
                  placeholder="underground, live, dj-set..."
                  class="w-full"
                />
                <small>Parole chiave per descrivere il tuo show (opzionale)</small>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label for="dayOfWeek">Giorno Preferito *</label>
                  <Dropdown
                    id="dayOfWeek"
                    v-model="formData.schedule.dayOfWeek"
                    :options="dayOptions"
                    placeholder="Seleziona giorno"
                    required
                    class="w-full"
                  />
                </div>

                <div class="form-field">
                  <label for="timeSlot">Fascia Oraria *</label>
                  <InputText
                    id="timeSlot"
                    v-model="formData.schedule.timeSlot"
                    placeholder="Es. 20:00 - 22:00"
                    required
                    class="w-full"
                  />
                </div>
              </div>

              <div class="form-field">
                <label for="frequency">Frequenza</label>
                <Dropdown
                  id="frequency"
                  v-model="formData.schedule.frequency"
                  :options="frequencyOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Seleziona frequenza"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Progress Upload -->
            <div v-if="uploading" class="upload-progress-section">
              <div class="progress-info">
                <i class="pi pi-spin pi-spinner"></i>
                <span>{{ uploadStatus }}</span>
              </div>
              <ProgressBar :value="uploadProgress" />
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <Button
                type="button"
                label="Annulla"
                severity="secondary"
                outlined
                @click="$router.push('/artist/dashboard')"
                :disabled="uploading"
              />
              <Button
                type="submit"
                label="Invia Richiesta"
                icon="pi pi-send"
                :loading="loading"
                :disabled="uploading"
              />
            </div>
          </form>
        </template>
      </Card>
    </div>

    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useArtistStore } from '@/stores/artist'
import { useToast } from 'primevue/usetoast'
import ImageUpload from '@/components/ImageUpload.vue'
import api from '@/api/axios'

const API_URL = import.meta.env.VITE_API_URL

const router = useRouter()
const artistStore = useArtistStore()
const toast = useToast()

const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref('')

// Audio file state
const audioFileInput = ref(null)
const selectedAudioFile = ref(null)
const audioError = ref('')

const formData = ref({
  title: '',
  description: '',
  artist: {
    name: '',
    bio: '',
    email: '',
    photo: '',
    socialLinks: {
      instagram: '',
      soundcloud: '',
      mixcloud: '',
      youtube: '',
      bandcamp: '',
      website: ''
    }
  },
  image: {
    url: '',
    alt: ''
  },
  schedule: {
    dayOfWeek: '',
    timeSlot: '',
    frequency: 'weekly'
  }
})

const genresInput = ref('')
const tagsInput = ref('')

const dayOptions = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica'
]

const frequencyOptions = [
  { label: 'Settimanale', value: 'weekly' },
  { label: 'Bisettimanale', value: 'biweekly' },
  { label: 'Mensile', value: 'monthly' },
  { label: 'Una tantum', value: 'onetime' }
]

// Audio file methods
const triggerFileInput = () => {
  if (audioFileInput.value) {
    audioFileInput.value.click()
  }
}

const onAudioFileChange = (event) => {
  const file = event.target.files[0]
  audioError.value = ''

  if (file) {
    // Validazione tipo file
    if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
      audioError.value = 'Seleziona un file MP3 valido'
      toast.add({
        severity: 'error',
        summary: 'Formato non valido',
        detail: 'Seleziona un file MP3',
        life: 3000
      })
      return
    }

    // Validazione dimensione (500MB)
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      audioError.value = 'Il file supera la dimensione massima di 500MB'
      toast.add({
        severity: 'error',
        summary: 'File troppo grande',
        detail: 'La dimensione massima è 500MB',
        life: 3000
      })
      return
    }

    selectedAudioFile.value = file
  }
}

const clearAudioFile = () => {
  selectedAudioFile.value = null
  audioError.value = ''
  if (audioFileInput.value) {
    audioFileInput.value.value = ''
  }
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

// Submit request
const submitRequest = async () => {
  // Validazione campi obbligatori
  if (!formData.value.title || !formData.value.description) {
    toast.add({
      severity: 'warn',
      summary: 'Campi mancanti',
      detail: 'Compila titolo e descrizione dello show',
      life: 3000
    })
    return
  }

  if (!formData.value.artist.name || !formData.value.artist.bio || !formData.value.artist.email) {
    toast.add({
      severity: 'warn',
      summary: 'Campi mancanti',
      detail: 'Compila tutti i campi dell\'artista',
      life: 3000
    })
    return
  }

  if (!genresInput.value) {
    toast.add({
      severity: 'warn',
      summary: 'Campi mancanti',
      detail: 'Inserisci almeno un genere musicale',
      life: 3000
    })
    return
  }

  if (!formData.value.schedule.dayOfWeek || !formData.value.schedule.timeSlot) {
    toast.add({
      severity: 'warn',
      summary: 'Campi mancanti',
      detail: 'Seleziona giorno e fascia oraria',
      life: 3000
    })
    return
  }

  // ⚠️ VALIDAZIONE AUDIO OBBLIGATORIO
  if (!selectedAudioFile.value) {
    audioError.value = 'Il file audio è obbligatorio per inviare la richiesta'
    toast.add({
      severity: 'error',
      summary: 'Audio mancante',
      detail: 'Devi caricare un file audio per il tuo show',
      life: 4000
    })
    return
  }

  loading.value = true
  uploading.value = true

  try {
    // STEP 1: Crea lo show (stato pending)
    uploadStatus.value = 'Creazione richiesta show...'
    uploadProgress.value = 10

    const requestData = {
      title: formData.value.title,
      description: formData.value.description,
      artist: {
        name: formData.value.artist.name,
        bio: formData.value.artist.bio,
        email: formData.value.artist.email,
        photo: formData.value.artist.photo || '',
        socialLinks: formData.value.artist.socialLinks
      },
      image: {
        url: formData.value.image.url || '',
        alt: formData.value.title
      },
      schedule: {
        dayOfWeek: formData.value.schedule.dayOfWeek,
        timeSlot: formData.value.schedule.timeSlot,
        frequency: formData.value.schedule.frequency || 'weekly'
      },
      genres: genresInput.value.split(',').map(g => g.trim()).filter(g => g),
      tags: tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : []
    }

    const showResponse = await artistStore.createRequest(requestData)
    const showId = showResponse._id || showResponse.data?._id

    if (!showId) {
      throw new Error('Impossibile ottenere ID dello show creato')
    }

    uploadProgress.value = 40

    // STEP 2: Upload audio
    uploadStatus.value = 'Caricamento audio in corso...'

    const audioFormData = new FormData()
    audioFormData.append('audio', selectedAudioFile.value)

    await api.post(
      `${API_URL}/shows/${showId}/audio`,
      audioFormData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            40 + (progressEvent.loaded * 50) / progressEvent.total
          )
          uploadProgress.value = percentCompleted
        }
      }
    )

    uploadProgress.value = 100
    uploadStatus.value = 'Completato!'

    toast.add({
      severity: 'success',
      summary: 'Richiesta Inviata! 🎉',
      detail: 'La tua richiesta è stata inviata all\'admin per l\'approvazione',
      life: 5000
    })

    setTimeout(() => {
      router.push('/artist/dashboard')
    }, 2000)

  } catch (error) {
    console.error('Errore invio richiesta:', error)

    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: error.response?.data?.error || artistStore.error || 'Errore nell\'invio della richiesta',
      life: 4000
    })
  } finally {
    loading.value = false
    uploading.value = false
    uploadProgress.value = 0
    uploadStatus.value = ''
  }
}
</script>

<style scoped>
.request-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.request-container {
  width: 100%;
  max-width: 900px;
}

.request-card {
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.request-header {
  text-align: center;
  padding: 2rem 2rem 1rem;
}

.request-header h2 {
  margin: 1rem 0 0.5rem;
  color: #1f2937;
  font-size: 1.75rem;
}

.request-header p {
  color: #6b7280;
  margin: 0;
}

.request-form {
  padding: 0 1rem 1rem;
}

.form-section {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin: 0 0 0.5rem;
  color: #1f2937;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.section-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 1.5rem;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.form-field small {
  display: block;
  margin-top: 0.4rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Audio Upload Section */
.audio-upload-section {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px dashed #d1d5db;
}

.upload-requirements {
  margin-bottom: 1rem;
  text-align: center;
}

.file-upload-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.file-input {
  display: none;
}

.select-file-button {
  min-width: 200px;
}

.selected-audio-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-top: 1rem;
}

.audio-file-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-file-icon i {
  font-size: 1.5rem;
  color: white;
}

.audio-file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.audio-file-name {
  font-weight: 600;
  color: #1f2937;
  word-break: break-all;
}

.audio-file-size {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Social inputs */
.social-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Upload progress */
.upload-progress-section {
  background: #eff6ff;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #1e40af;
  font-weight: 500;
}

.progress-info i {
  font-size: 1.25rem;
}

/* Form actions */
.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e5e7eb;
}

.w-full {
  width: 100%;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .request-page {
    padding: 1rem;
  }
}
</style>
