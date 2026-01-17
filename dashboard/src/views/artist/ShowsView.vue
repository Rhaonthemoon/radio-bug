<template>
  <DashboardLayout page-title="Gestione Shows">
    <template #topbar-actions>
      <!-- Pulsante per creare show solo per admin -->
      <Button
        v-if="!isArtist"
        label="Nuovo Show"
        icon="pi pi-plus"
        @click="openDialog()"
      />
      <!-- Messaggio per artisti -->
      <Message v-else severity="info" :closable="false" style="margin: 0;">
        Shows are managed by admin. You can only view them.
      </Message>
    </template>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters">
          <Button
            :label="`Richieste Pending (${pendingRequestsCount})`"
            :severity="currentFilter === 'pending' ? 'warning' : 'secondary'"
            :outlined="currentFilter !== 'pending'"
            @click="currentFilter = 'pending'"
            icon="pi pi-clock"
          />
          <Button
            :label="`Attivi (${activeShowsCount})`"
            :severity="currentFilter === 'active' ? 'success' : 'secondary'"
            :outlined="currentFilter !== 'active'"
            @click="currentFilter = 'active'"
            icon="pi pi-check-circle"
          />
          <Button
            :label="`Inattivi (${inactiveShowsCount})`"
            :severity="currentFilter === 'inactive' ? 'info' : 'secondary'"
            :outlined="currentFilter !== 'inactive'"
            @click="currentFilter = 'inactive'"
            icon="pi pi-pause"
          />
          <Button
            :label="`Rifiutati (${rejectedRequestsCount})`"
            :severity="currentFilter === 'rejected' ? 'danger' : 'secondary'"
            :outlined="currentFilter !== 'rejected'"
            @click="currentFilter = 'rejected'"
            icon="pi pi-times"
          />
          <Button
            label="Tutti"
            :severity="currentFilter === 'all' ? 'contrast' : 'secondary'"
            :outlined="currentFilter !== 'all'"
            @click="currentFilter = 'all'"
            icon="pi pi-list"
          />
        </div>
      </template>
    </Card>

    <!-- Shows Table -->
    <Card>
      <template #content>
        <DataTable
          :value="filteredShows"
          :loading="showsStore.loading"
          paginator
          :rows="10"
          stripedRows
          sortField="updatedAt"
          :sortOrder="-1"
        >
          <template #empty>
            <div class="empty-state">
              <i class="pi pi-microphone" style="font-size: 3rem; color: #cbd5e1;"></i>
              <p>Nessuno show {{ getFilterLabel() }}</p>
              <Button
                v-if="!isArtist"
                label="Crea il primo show"
                icon="pi pi-plus"
                @click="openDialog()"
              />
            </div>
          </template>

          <Column field="title" header="Titolo" sortable style="min-width: 200px;"></Column>
          <Column field="artist.name" header="Artista" sortable></Column>
          <Column field="artist.email" header="Email" sortable></Column>
          <Column field="genres" header="Generi">
            <template #body="slotProps">
              <div class="genres-tags">
                <Tag
                  v-for="genre in slotProps.data.genres?.slice(0, 2)"
                  :key="genre"
                  :value="genre"
                  severity="info"
                  class="genre-tag"
                />
                <span v-if="slotProps.data.genres?.length > 2" class="more-genres">
                  +{{ slotProps.data.genres.length - 2 }}
                </span>
              </div>
            </template>
          </Column>
          <!-- Audio Column -->
          <Column header="Audio" style="width: 120px;">
            <template #body="slotProps">
              <div class="audio-status">
                <Tag
                  v-if="slotProps.data.audio?.filename"
                  value="Audio"
                  severity="success"
                  icon="pi pi-volume-up"
                />
                <Tag
                  v-else
                  value="No Audio"
                  severity="secondary"
                  icon="pi pi-volume-off"
                />
              </div>
            </template>
          </Column>
          <Column field="requestStatus" header="Status Richiesta" sortable>
            <template #body="slotProps">
              <Tag
                :value="getRequestStatusLabel(slotProps.data.requestStatus)"
                :severity="getRequestStatusSeverity(slotProps.data.requestStatus)"
              />
            </template>
          </Column>
          <Column field="status" header="Status Show" sortable>
            <template #body="slotProps">
              <Tag
                :value="getStatusLabel(slotProps.data.status)"
                :severity="getStatusSeverity(slotProps.data.status)"
              />
            </template>
          </Column>
          <Column field="featured" header="Featured" sortable>
            <template #body="slotProps">
              <i
                :class="slotProps.data.featured ? 'pi pi-star-fill' : 'pi pi-star'"
                :style="{ color: slotProps.data.featured ? '#f59e0b' : '#cbd5e1' }"
              ></i>
            </template>
          </Column>

          <!-- Azioni per ADMIN -->
          <Column v-if="!isArtist" header="Azioni" style="width: 300px;">
            <template #body="slotProps">
              <div class="action-buttons">
                <!-- Azioni per richieste pending -->
                <Button
                  v-if="slotProps.data.requestStatus === 'pending'"
                  icon="pi pi-check"
                  rounded
                  severity="success"
                  @click="approveRequest(slotProps.data)"
                  v-tooltip.top="'Approva Richiesta'"
                />
                <Button
                  v-if="slotProps.data.requestStatus === 'pending'"
                  icon="pi pi-times"
                  rounded
                  severity="danger"
                  @click="rejectRequest(slotProps.data)"
                  v-tooltip.top="'Rifiuta Richiesta'"
                />

                <!-- Audio button -->
                <Button
                  icon="pi pi-volume-up"
                  rounded
                  outlined
                  :severity="slotProps.data.audio?.filename ? 'success' : 'secondary'"
                  @click="openAudioDialog(slotProps.data)"
                  v-tooltip.top="'Gestisci Audio'"
                />

                <!-- Azioni standard -->
                <Button
                  icon="pi pi-eye"
                  rounded
                  outlined
                  severity="info"
                  @click="viewShow(slotProps.data)"
                  v-tooltip.top="'Dettagli'"
                />
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  severity="secondary"
                  @click="openDialog(slotProps.data)"
                  v-tooltip.top="'Modifica'"
                />
                <Button
                  icon="pi pi-trash"
                  rounded
                  outlined
                  severity="danger"
                  @click="confirmDelete(slotProps.data)"
                  v-tooltip.top="'Elimina'"
                />
              </div>
            </template>
          </Column>

          <!-- Azioni per ARTISTI -->
          <Column v-else header="Azioni" style="width: 150px;">
            <template #body="slotProps">
              <div class="action-buttons">
                <!-- Audio button - solo per show approvati -->
                <Button
                  v-if="slotProps.data.requestStatus === 'approved'"
                  icon="pi pi-volume-up"
                  rounded
                  outlined
                  :severity="slotProps.data.audio?.filename ? 'success' : 'secondary'"
                  @click="openAudioDialog(slotProps.data)"
                  v-tooltip.top="'Gestisci Audio'"
                />
                <Button
                  icon="pi pi-eye"
                  rounded
                  outlined
                  severity="info"
                  @click="viewShow(slotProps.data)"
                  v-tooltip.top="'Dettagli'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Dialog Gestione Audio Show -->
    <Dialog
      v-model:visible="audioDialogVisible"
      header="Gestione Audio Show"
      :modal="true"
      :style="{ width: '550px' }"
    >
      <div class="audio-dialog-content" v-if="selectedShowForAudio">
        <div class="show-info-header">
          <h4>{{ selectedShowForAudio.title }}</h4>
          <p class="artist-name">{{ selectedShowForAudio.artist?.name }}</p>
        </div>

        <!-- Avviso per artisti se lo show non è approvato -->
        <Message
          v-if="isArtist && selectedShowForAudio.requestStatus !== 'approved'"
          severity="warn"
          :closable="false"
          class="approval-warning"
        >
          Puoi caricare audio solo per show approvati. Questo show è in stato: {{ getRequestStatusLabel(selectedShowForAudio.requestStatus) }}
        </Message>

        <!-- Se c'è già un audio -->
        <div v-if="selectedShowForAudio.audio?.filename" class="current-audio-section">
          <div class="audio-info-card">
            <div class="audio-icon">
              <i class="pi pi-file-audio"></i>
            </div>
            <div class="audio-details">
              <span class="audio-filename">{{ selectedShowForAudio.audio.originalName || selectedShowForAudio.audio.filename }}</span>
              <div class="audio-meta">
                <span v-if="selectedShowForAudio.audio.duration">
                  <i class="pi pi-clock"></i> {{ formatDuration(selectedShowForAudio.audio.duration) }}
                </span>
                <span v-if="selectedShowForAudio.audio.bitrate">
                  <i class="pi pi-chart-bar"></i> {{ selectedShowForAudio.audio.bitrate }} kbps
                </span>
              </div>
            </div>
          </div>

          <!-- Audio Player -->
          <div class="audio-player-wrapper">
            <audio
              ref="audioPlayerRef"
              :src="getAudioUrl(selectedShowForAudio)"
              controls
              class="audio-player"
              @play="isPlaying = true"
              @pause="isPlaying = false"
              @ended="isPlaying = false"
              @error="handleAudioError"
            ></audio>
          </div>

          <!-- Azioni Audio -->
          <div class="audio-actions">
            <Button
              label="Play"
              icon="pi pi-play"
              severity="success"
              @click="playAudio"
              :disabled="isPlaying"
            />
            <Button
              label="Pause"
              icon="pi pi-pause"
              severity="secondary"
              @click="pauseAudio"
              :disabled="!isPlaying"
            />
            <Button
              label="Download"
              icon="pi pi-download"
              severity="info"
              @click="downloadAudio"
            />
            <Button
              v-if="canManageAudio"
              label="Elimina"
              icon="pi pi-trash"
              severity="danger"
              outlined
              @click="confirmDeleteAudio"
            />
          </div>
        </div>

        <!-- Se non c'è audio -->
        <div v-else class="no-audio-section">
          <div class="no-audio-icon">
            <i class="pi pi-volume-off"></i>
          </div>
          <p>Nessun audio caricato per questo show</p>
        </div>

        <!-- Upload Section - solo se può gestire l'audio -->
        <template v-if="canManageAudio">
          <Divider />

          <div class="upload-section">
            <h5>{{ selectedShowForAudio.audio?.filename ? 'Sostituisci Audio' : 'Carica Audio' }}</h5>
            <p class="upload-hint">
              Formati accettati: MP3 | Max 500MB | Min 128kbps | Max 60 minuti
            </p>

            <div class="file-upload-wrapper">
              <input
                type="file"
                ref="audioFileInput"
                accept="audio/mp3,audio/mpeg"
                @change="onAudioFileChange"
                :disabled="audioUploading"
                class="file-input"
              />
              <Button
                label="Seleziona file MP3"
                icon="pi pi-folder-open"
                severity="secondary"
                outlined
                @click="triggerFileInput"
                :disabled="audioUploading"
                class="select-file-button"
              />
            </div>

            <div v-if="selectedAudioFile" class="selected-file-info">
              <i class="pi pi-file"></i>
              <span>{{ selectedAudioFile.name }}</span>
              <span class="file-size">({{ formatFileSize(selectedAudioFile.size) }})</span>
              <Button
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                size="small"
                @click="clearSelectedFile"
                v-tooltip.top="'Rimuovi'"
              />
            </div>

            <Button
              v-if="selectedAudioFile"
              label="Carica Audio"
              icon="pi pi-upload"
              @click="uploadAudio"
              :loading="audioUploading"
              class="upload-button"
            />
          </div>

          <!-- Progress durante upload -->
          <div v-if="audioUploading" class="upload-progress">
            <ProgressBar :value="uploadProgress" />
            <p>Caricamento in corso...</p>
          </div>
        </template>

        <!-- Messaggio se artista non può gestire -->
        <div v-else-if="isArtist && selectedShowForAudio.requestStatus !== 'approved'" class="no-upload-message">
          <p>Potrai caricare l'audio una volta che lo show sarà approvato.</p>
        </div>
      </div>
    </Dialog>

    <!-- Dialog Crea/Modifica Show (SOLO ADMIN) -->
    <Dialog
      v-if="!isArtist"
      v-model:visible="dialogVisible"
      :header="editingShow ? 'Modifica Show' : 'Nuovo Show'"
      :modal="true"
      :style="{ width: '800px' }"
      :maximizable="true"
    >
      <div class="dialog-content">
        <div class="form-section">
          <h3>Informazioni Show</h3>

          <div class="form-field">
            <ImageUpload
              label="Immagine Copertina Show"
              v-model="formData.image.url"
            />
          </div>

          <div class="form-field">
            <label for="title">Titolo Show *</label>
            <InputText
              id="title"
              v-model="formData.title"
              placeholder="Es. Noise à Noise"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="description">Descrizione *</label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="5"
              placeholder="Descrivi lo show..."
              class="w-full"
            />
          </div>
        </div>

        <div class="form-section">
          <h3>Informazioni Artista</h3>

          <div class="form-field">
            <ImageUpload
              label="Foto Artista"
              v-model="formData.artist.photo"
            />
          </div>

          <div class="form-field">
            <label for="artistName">Nome Artista *</label>
            <InputText
              id="artistName"
              v-model="formData.artist.name"
              placeholder="Nome curatore/artista"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="artistBio">Bio Artista</label>
            <Textarea
              id="artistBio"
              v-model="formData.artist.bio"
              rows="3"
              placeholder="Biografia dell'artista..."
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="artistEmail">Email Artista</label>
            <InputText
              id="artistEmail"
              v-model="formData.artist.email"
              type="email"
              placeholder="email@example.com"
              class="w-full"
            />
          </div>
        </div>

        <div class="form-section">
          <h3>Generi e Tags</h3>

          <div class="form-field">
            <label for="genres">Generi (separati da virgola)</label>
            <InputText
              id="genres"
              v-model="genresInput"
              placeholder="Ambient, Experimental, Drone"
              class="w-full"
            />
            <small>Inserisci i generi separati da virgola</small>
          </div>

          <div class="form-field">
            <label for="tags">Tags (separati da virgola)</label>
            <InputText
              id="tags"
              v-model="tagsInput"
              placeholder="underground, electronic, live"
              class="w-full"
            />
          </div>
        </div>

        <div class="form-section">
          <h3>Impostazioni</h3>

          <div class="form-row">
            <div class="form-field">
              <label for="requestStatus">Status Richiesta</label>
              <Dropdown
                id="requestStatus"
                v-model="formData.requestStatus"
                :options="requestStatusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleziona status"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="status">Status Show</label>
              <Dropdown
                id="status"
                v-model="formData.status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleziona status"
                class="w-full"
              />
            </div>
          </div>

          <div class="checkbox-field">
            <Checkbox v-model="formData.featured" inputId="featured" :binary="true" />
            <label for="featured">Show in evidenza (Featured)</label>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Annulla" @click="dialogVisible = false" text />
        <Button
          :label="editingShow ? 'Aggiorna' : 'Crea'"
          @click="saveShow"
          :loading="showsStore.loading"
        />
      </template>
    </Dialog>

    <Toast />
    <ConfirmDialog />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useShowsStore } from '@/stores/shows'
import { useAuthStore } from '@/stores/auth'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import api from '@/api/axios'
import ImageUpload from '@/components/ImageUpload.vue'
import DashboardLayout from '@/components/DashboardLayout.vue'

const API_URL = import.meta.env.VITE_API_URL

const showsStore = useShowsStore()
const authStore = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

// Check if user is artist
const isArtist = computed(() => authStore.user?.role === 'artist')

const dialogVisible = ref(false)
const editingShow = ref(null)
const currentFilter = ref('all')
const genresInput = ref('')
const tagsInput = ref('')

// Audio Dialog State
const audioDialogVisible = ref(false)
const selectedShowForAudio = ref(null)
const selectedAudioFile = ref(null)
const audioUploading = ref(false)
const uploadProgress = ref(0)
const isPlaying = ref(false)
const audioPlayerRef = ref(null)
const audioFileInput = ref(null)

// Computed per verificare se l'utente può gestire l'audio dello show selezionato
const canManageAudio = computed(() => {
  if (!selectedShowForAudio.value) return false

  // Admin può sempre gestire
  if (!isArtist.value) return true

  // Artista può gestire solo se lo show è approvato
  return selectedShowForAudio.value.requestStatus === 'approved'
})

const formData = ref({
  title: '',
  description: '',
  artist: {
    name: '',
    bio: '',
    email: '',
    photo: '',
    socialLinks: {}
  },
  image: { url: '', alt: '' },
  genres: [],
  tags: [],
  requestStatus: 'pending',
  status: 'active',
  featured: false
})

const requestStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' }
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const filteredShows = computed(() => {
  const shows = showsStore.shows
  if (currentFilter.value === 'all') return shows
  if (currentFilter.value === 'pending') {
    return shows.filter(s => s.requestStatus === 'pending')
  }
  if (currentFilter.value === 'rejected') {
    return shows.filter(s => s.requestStatus === 'rejected')
  }
  return shows.filter(s => s.status === currentFilter.value)
})

const pendingRequestsCount = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'pending').length
)

const rejectedRequestsCount = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'rejected').length
)

const activeShowsCount = computed(() =>
  showsStore.shows.filter(s => s.status === 'active').length
)

const inactiveShowsCount = computed(() =>
  showsStore.shows.filter(s => s.status === 'inactive').length
)

const getFilterLabel = () => {
  const labels = {
    all: 'trovati',
    pending: 'in attesa',
    active: 'attivi',
    inactive: 'inattivi',
    rejected: 'rifiutati'
  }
  return labels[currentFilter.value] || ''
}

const getRequestStatusLabel = (status) => {
  const map = {
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED'
  }
  return map[status] || status?.toUpperCase()
}

const getRequestStatusSeverity = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

const getStatusLabel = (status) => {
  return status?.toUpperCase() || '-'
}

const getStatusSeverity = (status) => {
  const map = {
    active: 'success',
    inactive: 'secondary'
  }
  return map[status] || 'info'
}

// ==================== AUDIO MANAGEMENT FUNCTIONS ====================

const openAudioDialog = (show) => {
  selectedShowForAudio.value = show
  selectedAudioFile.value = null
  isPlaying.value = false
  audioDialogVisible.value = true
}

const getAudioUrl = (id) => {
  const ep = episodes.value.find(e => e._id === id) || previewEpisode.value

  // Se c'è URL B2/Cloudinary, usalo direttamente
  if (ep?.audioFile?.url) {
    return ep.audioFile.url
  }

  // Fallback per vecchi file locali (retrocompatibilità)
  if (ep?.audioFile?.storedFilename) {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')
    return `${base}/uploads/episodes/${ep.audioFile.storedFilename}`
  }

  return null
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

const playAudio = () => {
  if (audioPlayerRef.value) {
    audioPlayerRef.value.play()
    isPlaying.value = true
  }
}

const pauseAudio = () => {
  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
    isPlaying.value = false
  }
}

const handleAudioError = () => {
  toast.add({
    severity: 'error',
    summary: 'Errore',
    detail: 'Impossibile caricare il file audio',
    life: 3000
  })
}

const downloadAudio = () => {
  if (!selectedShowForAudio.value?.audio?.url) return

  const url = getAudioUrl(selectedShowForAudio.value)
  const filename = selectedShowForAudio.value.audio.originalName ||
    selectedShowForAudio.value.audio.filename ||
    'audio.mp3'

  // Crea un link temporaneo per il download
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  toast.add({
    severity: 'info',
    summary: 'Download',
    detail: 'Download avviato',
    life: 2000
  })
}

const triggerFileInput = () => {
  if (audioFileInput.value) {
    audioFileInput.value.click()
  }
}

const onAudioFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Validazione base lato client
    if (!file.type.includes('audio/mpeg') && !file.name.toLowerCase().endsWith('.mp3')) {
      toast.add({
        severity: 'error',
        summary: 'Formato non valido',
        detail: 'Seleziona un file MP3',
        life: 3000
      })
      return
    }
    selectedAudioFile.value = file
  }
}

const clearSelectedFile = () => {
  selectedAudioFile.value = null
  if (audioFileInput.value) {
    audioFileInput.value.value = ''
  }
}

const uploadAudio = async () => {
  if (!selectedAudioFile.value || !selectedShowForAudio.value) return

  audioUploading.value = true
  uploadProgress.value = 0

  const formData = new FormData()
  formData.append('audio', selectedAudioFile.value)

  try {
    const response = await api.post(
      `${API_URL}/shows/${selectedShowForAudio.value._id}/audio`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          uploadProgress.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
        }
      }
    )

    // Aggiorna lo show con i nuovi dati audio
    selectedShowForAudio.value.audio = response.data.audio

    toast.add({
      severity: 'success',
      summary: 'Audio caricato',
      detail: 'Il file audio è stato caricato con successo',
      life: 3000
    })

    // Aggiorna la lista degli show
    await showsStore.fetchShows()

    // Reset
    selectedAudioFile.value = null

  } catch (error) {
    console.error('Errore upload audio:', error)
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: error.response?.data?.error || 'Errore nel caricamento dell\'audio',
      life: 4000
    })
  } finally {
    audioUploading.value = false
    uploadProgress.value = 0
  }
}

const confirmDeleteAudio = () => {
  confirm.require({
    message: 'Sei sicuro di voler eliminare questo file audio?',
    header: 'Conferma Eliminazione',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sì, elimina',
    rejectLabel: 'Annulla',
    acceptClass: 'p-button-danger',
    accept: () => deleteAudio()
  })
}

const deleteAudio = async () => {
  if (!selectedShowForAudio.value) return

  try {
    await api.delete(`${API_URL}/shows/${selectedShowForAudio.value._id}/audio`)

    // Reset audio data
    selectedShowForAudio.value.audio = {
      filename: null,
      originalName: null,
      url: null,
      duration: null,
      bitrate: null,
      uploadedAt: null
    }

    toast.add({
      severity: 'success',
      summary: 'Audio eliminato',
      detail: 'Il file audio è stato eliminato',
      life: 3000
    })

    // Aggiorna la lista degli show
    await showsStore.fetchShows()

  } catch (error) {
    console.error('Errore eliminazione audio:', error)
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: error.response?.data?.error || 'Errore nell\'eliminazione dell\'audio',
      life: 3000
    })
  }
}

// ==================== SHOW MANAGEMENT FUNCTIONS ====================

const openDialog = (show = null) => {
  editingShow.value = show
  if (show) {
    formData.value = {
      title: show.title || '',
      description: show.description || '',
      artist: {
        name: show.artist?.name || '',
        bio: show.artist?.bio || '',
        email: show.artist?.email || '',
        photo: show.artist?.photo || '',
        socialLinks: show.artist?.socialLinks || {}
      },
      image: {
        url: show.image?.url || '',
        alt: show.image?.alt || ''
      },
      genres: show.genres || [],
      tags: show.tags || [],
      requestStatus: show.requestStatus || 'pending',
      status: show.status || 'active',
      featured: show.featured || false
    }
    genresInput.value = show.genres?.join(', ') || ''
    tagsInput.value = show.tags?.join(', ') || ''
  } else {
    formData.value = {
      title: '',
      description: '',
      artist: {
        name: '',
        bio: '',
        email: '',
        photo: '',
        socialLinks: {}
      },
      image: { url: '', alt: '' },
      genres: [],
      tags: [],
      requestStatus: 'pending',
      status: 'active',
      featured: false
    }
    genresInput.value = ''
    tagsInput.value = ''
  }
  dialogVisible.value = true
}

const saveShow = async () => {
  if (!formData.value.title || !formData.value.description || !formData.value.artist.name) {
    toast.add({
      severity: 'warn',
      summary: 'Attenzione',
      detail: 'Compila i campi obbligatori (titolo, descrizione, artista)',
      life: 3000
    })
    return
  }

  const showData = {
    title: formData.value.title,
    description: formData.value.description,
    artist: {
      name: formData.value.artist.name,
      bio: formData.value.artist.bio || '',
      email: formData.value.artist.email || '',
      photo: formData.value.artist.photo || '',
      socialLinks: formData.value.artist.socialLinks || {}
    },
    image: {
      url: formData.value.image.url || '',
      alt: formData.value.image.alt || ''
    },
    genres: genresInput.value.split(',').map(g => g.trim()).filter(g => g),
    tags: tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [],
    requestStatus: formData.value.requestStatus,
    status: formData.value.status,
    featured: formData.value.featured
  }

  try {
    if (editingShow.value) {
      await showsStore.updateShow(editingShow.value._id, showData)
      toast.add({
        severity: 'success',
        summary: 'Show aggiornato',
        detail: 'Le modifiche sono state salvate',
        life: 3000
      })
    } else {
      await showsStore.createShow(showData)
      toast.add({
        severity: 'success',
        summary: 'Show creato',
        detail: 'Il nuovo show è stato creato con successo',
        life: 3000
      })
    }

    dialogVisible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: showsStore.error || 'Errore durante il salvataggio',
      life: 3000
    })
  }
}

const viewShow = (show) => {
  const details = `
Dettagli Show:

Titolo: ${show.title}
Artista: ${show.artist?.name || '-'}
Email: ${show.artist?.email || '-'}
Status: ${show.status}
Request Status: ${show.requestStatus}
Featured: ${show.featured ? 'Sì' : 'No'}
Generi: ${show.genres?.join(', ') || '-'}
Audio: ${show.audio?.filename ? 'Sì (' + formatDuration(show.audio.duration) + ')' : 'No'}

Descrizione:
${show.description || '-'}

${show.adminNotes ? `Note Admin:\n${show.adminNotes}` : ''}
  `.trim()

  alert(details)
}

const approveRequest = async (show) => {
  confirm.require({
    message: `Vuoi approvare lo show "${show.title}" di ${show.artist.name}?`,
    header: 'Approva Richiesta',
    icon: 'pi pi-check-circle',
    acceptLabel: 'Sì, approva',
    rejectLabel: 'Annulla',
    acceptClass: 'p-button-success',
    accept: async () => {
      try {
        await api.put(`${API_URL}/shows/admin/${show._id}/approve`, {
          adminNotes: 'Show approvato! Benvenuto su BUG Radio 🎵'
        })

        toast.add({
          severity: 'success',
          summary: 'Show Approvato!',
          detail: `"${show.title}" è stato approvato e attivato`,
          life: 4000
        })

        await showsStore.fetchShows()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Errore nell\'approvazione',
          life: 3000
        })
      }
    }
  })
}

const rejectRequest = async (show) => {
  const rejectReason = prompt(`Motivo del rifiuto per "${show.title}":`, 'Il contenuto non è adatto alla nostra programmazione.')

  if (!rejectReason) return

  try {
    await api.put(`${API_URL}/shows/admin/${show._id}/reject`, {
      adminNotes: rejectReason
    })

    toast.add({
      severity: 'info',
      summary: 'Show Rifiutato',
      detail: `"${show.title}" è stato rifiutato`,
      life: 3000
    })

    await showsStore.fetchShows()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: 'Errore nel rifiuto',
      life: 3000
    })
  }
}

const confirmDelete = (show) => {
  confirm.require({
    message: `Sei sicuro di voler eliminare "${show.title}"?`,
    header: 'Conferma Eliminazione',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sì, elimina',
    rejectLabel: 'Annulla',
    acceptClass: 'p-button-danger',
    accept: () => deleteShow(show)
  })
}

const deleteShow = async (show) => {
  try {
    await showsStore.deleteShow(show._id)
    toast.add({
      severity: 'success',
      summary: 'Show eliminato',
      detail: 'Lo show è stato eliminato',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: 'Errore durante l\'eliminazione',
      life: 3000
    })
  }
}

onMounted(async () => {
  try {
    await showsStore.fetchShows()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: 'Errore nel caricamento degli show',
      life: 3000
    })
  }
})
</script>

<style scoped>
.filters-card {
  margin-bottom: 2rem;
}

.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-state p {
  margin: 1rem 0;
  color: #6b7280;
  font-size: 1.125rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.genres-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.genre-tag {
  font-size: 0.75rem;
}

.more-genres {
  color: #6b7280;
  font-size: 0.875rem;
}

.audio-status {
  display: flex;
  justify-content: center;
}

/* Audio Dialog Styles */
.audio-dialog-content {
  padding: 0.5rem 0;
}

.show-info-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.show-info-header h4 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  color: #1f2937;
}

.show-info-header .artist-name {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.approval-warning {
  margin-bottom: 1rem;
}

.current-audio-section {
  margin-bottom: 1.5rem;
}

.audio-info-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.audio-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-icon i {
  font-size: 1.5rem;
  color: white;
}

.audio-details {
  flex: 1;
}

.audio-filename {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.audio-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.audio-meta i {
  margin-right: 0.25rem;
}

.audio-player-wrapper {
  margin-bottom: 1rem;
}

.audio-player {
  width: 100%;
  height: 40px;
}

.audio-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.no-audio-section {
  text-align: center;
  padding: 2rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.no-audio-icon {
  width: 64px;
  height: 64px;
  background: #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.no-audio-icon i {
  font-size: 2rem;
  color: #9ca3af;
}

.no-audio-section p {
  margin: 0;
  color: #6b7280;
}

.upload-section {
  margin-top: 1rem;
}

.upload-section h5 {
  margin: 0 0 0.5rem;
  color: #1f2937;
}

.upload-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.file-upload-wrapper {
  margin-bottom: 1rem;
}

.file-input {
  display: none;
}

.select-file-button {
  width: 100%;
}

.selected-file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #eff6ff;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.selected-file-info i {
  color: #3b82f6;
}

.file-size {
  color: #6b7280;
  font-size: 0.75rem;
}

.upload-button {
  width: 100%;
}

.upload-progress {
  text-align: center;
  padding: 1rem;
}

.upload-progress p {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.no-upload-message {
  text-align: center;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 6px;
  margin-top: 1rem;
}

.no-upload-message p {
  margin: 0;
  color: #92400e;
  font-size: 0.875rem;
}

/* Form Styles */
.dialog-content {
  padding: 1rem 0;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section h3 {
  margin: 0 0 1rem;
  color: #1f2937;
  font-size: 1.125rem;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
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

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
}

.w-full {
  width: 100%;
}
</style>
