<template>
  <DashboardLayout page-title="Episodes Management">
    <template #topbar-actions>
      <Button
        label="New Episode"
        icon="pi pi-plus"
        @click="openCreateDialog"
      />
    </template>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters">
          <div class="filter-group">
            <label>Show</label>
            <Dropdown
              v-model="filters.showId"
              :options="shows"
              optionLabel="title"
              optionValue="_id"
              placeholder="All Shows"
              showClear
              @change="loadEpisodes"
              class="w-full"
            />
          </div>

          <div class="filter-group">
            <label>Status</label>
            <Dropdown
              v-model="filters.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Statuses"
              showClear
              @change="loadEpisodes"
              class="w-full"
            />
          </div>

          <div class="filter-group">
            <label>Search</label>
            <InputText
              v-model="searchQuery"
              placeholder="Search episodes..."
              @input="onSearch"
              class="w-full"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Episodes Table -->
    <Card>
      <template #content>
        <DataTable
          :value="filteredEpisodes"
          :loading="loading"
          stripedRows
          paginator
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          responsiveLayout="scroll"
        >
          <Column field="title" header="Title" sortable style="min-width: 250px;">
            <template #body="{ data }">
              <div class="episode-title-cell">
                <strong>{{ data.title }}</strong>
                <small v-if="data.description" class="description">
                  {{ truncate(data.description, 80) }}
                </small>
              </div>
            </template>
          </Column>

          <Column field="showId.title" header="Show" sortable>
            <template #body="{ data }">
              <div class="show-cell">
                <i class="pi pi-microphone"></i>
                {{ data.showId?.title || '-' }}
              </div>
            </template>
          </Column>

          <Column field="airDate" header="Air Date" sortable>
            <template #body="{ data }">
              {{ formatDate(data.airDate) }}
            </template>
          </Column>

          <Column field="duration" header="Duration" sortable>
            <template #body="{ data }">
              {{ formatDuration(data.duration) }}
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
              />
            </template>
          </Column>

          <Column header="Audio" style="width: 100px;">
            <template #body="{ data }">
              <Tag
                v-if="data.localFile?.exists"
                value="Uploaded"
                severity="success"
                icon="pi pi-check"
              />
              <Tag
                v-else
                value="No File"
                severity="warning"
                icon="pi pi-times"
              />
            </template>
          </Column>

          <Column header="Actions" style="width: 150px;">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-pencil"
                  @click="openEditDialog(data)"
                  v-tooltip.top="'Edit'"
                  text
                  rounded
                />
                <Button
                  icon="pi pi-upload"
                  @click="openUploadDialog(data)"
                  v-tooltip.top="'Upload Audio'"
                  :severity="data.audioFile?.exists ? 'secondary' : 'warning'"
                  text
                  rounded
                />
                <Button
                  v-if="data.audioFile?.exists"
                  icon="pi pi-play"
                  @click="previewAudio(data)"
                  v-tooltip.top="'Preview'"
                  severity="info"
                  text
                  rounded
                />
                <Button
                  icon="pi pi-trash"
                  @click="confirmDelete(data)"
                  v-tooltip.top="'Delete'"
                  severity="danger"
                  text
                  rounded
                />
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="empty-state">
              <i class="pi pi-play-circle"></i>
              <p>No episodes found</p>
              <Button
                label="Create First Episode"
                icon="pi pi-plus"
                @click="openCreateDialog"
              />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create/Edit Episode Dialog -->
    <Dialog
      v-model:visible="episodeDialog"
      :header="editingEpisode ? 'Edit Episode' : 'New Episode'"
      modal
      :style="{ width: '600px' }"
      @hide="resetForm"
    >
      <div class="episode-form">
        <!-- Show Selection -->
        <div class="form-group">
          <label for="showId">Show *</label>
          <Dropdown
            id="showId"
            v-model="episodeForm.showId"
            :options="shows"
            optionLabel="title"
            optionValue="_id"
            placeholder="Select a show"
            :class="{ 'p-invalid': formErrors.showId }"
            class="w-full"
          />
          <small class="p-error" v-if="formErrors.showId">{{ formErrors.showId }}</small>
        </div>

        <!-- Title -->
        <div class="form-group">
          <label for="title">Title *</label>
          <InputText
            id="title"
            v-model="episodeForm.title"
            placeholder="Episode title"
            :class="{ 'p-invalid': formErrors.title }"
            class="w-full"
          />
          <small class="p-error" v-if="formErrors.title">{{ formErrors.title }}</small>
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="episodeForm.description"
            rows="4"
            placeholder="Episode description..."
            class="w-full"
          />
        </div>

        <!-- Air Date -->
        <div class="form-group">
          <label for="airDate">Air Date *</label>
          <Calendar
            id="airDate"
            v-model="episodeForm.airDate"
            dateFormat="yy-mm-dd"
            showIcon
            :class="{ 'p-invalid': formErrors.airDate }"
            class="w-full"
          />
          <small class="p-error" v-if="formErrors.airDate">{{ formErrors.airDate }}</small>
        </div>

        <!-- Duration -->
        <div class="form-group">
          <label for="duration">Duration (minutes)</label>
          <InputNumber
            id="duration"
            v-model="episodeForm.duration"
            placeholder="60"
            :min="1"
            :max="480"
            class="w-full"
          />
          <small class="hint">Leave empty if unknown</small>
        </div>

        <!-- Status -->
        <div class="form-group">
          <label for="status">Status *</label>
          <Dropdown
            id="status"
            v-model="episodeForm.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select status"
            class="w-full"
          />
        </div>

        <!-- External Links -->
        <div class="form-section">
          <h4>External Links</h4>

          <div class="form-group">
            <label for="mixcloudUrl">Mixcloud URL</label>
            <InputText
              id="mixcloudUrl"
              v-model="episodeForm.externalLinks.mixcloudUrl"
              placeholder="https://www.mixcloud.com/..."
              class="w-full"
            />
          </div>

          <div class="form-group">
            <label for="youtubeUrl">YouTube URL</label>
            <InputText
              id="youtubeUrl"
              v-model="episodeForm.externalLinks.youtubeUrl"
              placeholder="https://www.youtube.com/..."
              class="w-full"
            />
          </div>

          <div class="form-group">
            <label for="spotifyUrl">Spotify URL</label>
            <InputText
              id="spotifyUrl"
              v-model="episodeForm.externalLinks.spotifyUrl"
              placeholder="https://open.spotify.com/..."
              class="w-full"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          @click="episodeDialog = false"
          text
        />
        <Button
          :label="editingEpisode ? 'Update' : 'Create'"
          @click="saveEpisode"
          :loading="saving"
        />
      </template>
    </Dialog>

    <!-- Upload Audio Dialog -->
    <Dialog
      v-model:visible="uploadDialog"
      header="Upload Audio File"
      modal
      :style="{ width: '500px' }"
    >
      <div class="upload-section">
        <p v-if="selectedEpisode">
          <strong>Episode:</strong> {{ selectedEpisode.title }}
        </p>

        <Message severity="info" :closable="false">
          <p><strong>Requirements:</strong></p>
          <ul>
            <li>Format: MP3 only</li>
            <li>Bitrate: 320 kbps (or higher)</li>
            <li>Max size: 500 MB</li>
          </ul>
        </Message>

        <!-- Input file nativo (più affidabile) -->
        <div class="file-upload-native">
          <input
            type="file"
            ref="fileInput"
            accept="audio/mp3,audio/mpeg,.mp3"
            @change="onFileSelectNative"
            style="display: none"
          />

          <Button
            label="Select MP3 File"
            icon="pi pi-folder-open"
            @click="triggerFileInput"
            :disabled="uploading"
            outlined
            severity="secondary"
            class="w-full select-file-btn"
          />
        </div>

        <div v-if="selectedFile" class="file-info">
          <p><strong>Selected:</strong> {{ selectedFile.name }}</p>
          <p><strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        </div>

        <div v-if="uploadProgress > 0" class="upload-progress">
          <ProgressBar :value="uploadProgress" />
          <small>{{ uploadProgress }}%</small>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          @click="uploadDialog = false"
          text
        />
        <Button
          label="Upload"
          @click="uploadAudio"
          :loading="uploading"
          :disabled="!selectedFile"
        />
      </template>
    </Dialog>

    <!-- Audio Preview Dialog -->
    <Dialog
      v-model:visible="previewDialog"
      header="Audio Preview"
      modal
      :style="{ width: '500px' }"
    >
      <div v-if="previewEpisode" class="preview-section">
        <h3>{{ previewEpisode.title }}</h3>
        <p class="show-name">
          <i class="pi pi-microphone"></i>
          {{ previewEpisode.showId?.title }}
        </p>

        <div class="audio-player" v-if="previewEpisode.audioFile?.exists">
          <audio
            ref="audioPlayer"
            controls
            :src="getAudioUrl(previewEpisode._id)"
            class="w-full"
          >
            Your browser does not support the audio element.
          </audio>

          <div class="audio-info">
            <p><strong>Bitrate:</strong> {{ previewEpisode.audioFile.bitrate }} kbps</p>
            <p><strong>Duration:</strong> {{ formatDuration(previewEpisode.audioFile.duration) }}</p>
            <p><strong>Size:</strong> {{ formatFileSize(previewEpisode.audioFile.size) }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Close"
          @click="closePreview"
          text
        />
        <Button
          label="Download"
          @click="downloadAudio"
          severity="success"
          icon="pi pi-download"
        />
        <Button
          label="Delete Audio"
          @click="confirmDeleteAudio"
          severity="danger"
          icon="pi pi-trash"
        />
      </template>
    </Dialog>

    <Toast />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DashboardLayout from '../../components/DashboardLayout.vue'
import api from '@/api/axios'

const toast = useToast()
const confirm = useConfirm()

// Data
const episodes = ref([])
const shows = ref([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)

// Dialogs
const episodeDialog = ref(false)
const uploadDialog = ref(false)
const previewDialog = ref(false)
const editingEpisode = ref(null)
const selectedEpisode = ref(null)
const selectedFile = ref(null)
const fileInput = ref(null)
const previewEpisode = ref(null)
const audioPlayer = ref(null)

// Filters
const filters = ref({
  showId: null,
  status: null
})
const searchQuery = ref('')

// Form
const episodeForm = ref({
  showId: null,
  title: '',
  description: '',
  airDate: null,
  duration: null,
  status: 'draft',
  externalLinks: {
    mixcloudUrl: '',
    youtubeUrl: '',
    spotifyUrl: ''
  }
})

const formErrors = ref({})

// Options
const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' }
]

// Computed
const filteredEpisodes = computed(() => {
  let result = episodes.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(ep =>
      ep.title?.toLowerCase().includes(query) ||
      ep.description?.toLowerCase().includes(query) ||
      ep.showId?.title?.toLowerCase().includes(query)
    )
  }

  return result
})

// Methods
const loadEpisodes = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.showId) params.showId = filters.value.showId
    if (filters.value.status) params.status = filters.value.status

    const response = await api.get('/episodes', { params })
    episodes.value = response.data
  } catch (error) {
    console.error('Error loading episodes:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load episodes',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadShows = async () => {
  try {
    const response = await api.get('/shows')
    shows.value = response.data
  } catch (error) {
    console.error('Error loading shows:', error)
  }
}

const openCreateDialog = () => {
  editingEpisode.value = null
  resetForm()
  episodeDialog.value = true
}

const openEditDialog = (episode) => {
  editingEpisode.value = episode
  episodeForm.value = {
    showId: episode.showId?._id,
    title: episode.title,
    description: episode.description || '',
    airDate: episode.airDate ? new Date(episode.airDate) : null,
    duration: episode.duration || null,
    status: episode.status,
    externalLinks: {
      mixcloudUrl: episode.externalLinks?.mixcloudUrl || '',
      youtubeUrl: episode.externalLinks?.youtubeUrl || '',
      spotifyUrl: episode.externalLinks?.spotifyUrl || ''
    }
  }
  episodeDialog.value = true
}

const resetForm = () => {
  episodeForm.value = {
    showId: null,
    title: '',
    description: '',
    airDate: null,
    duration: null,
    status: 'draft',
    externalLinks: {
      mixcloudUrl: '',
      youtubeUrl: '',
      spotifyUrl: ''
    }
  }
  formErrors.value = {}
}

const validateForm = () => {
  formErrors.value = {}

  if (!episodeForm.value.showId) {
    formErrors.value.showId = 'Show is required'
  }

  if (!episodeForm.value.title || episodeForm.value.title.trim() === '') {
    formErrors.value.title = 'Title is required'
  }

  if (!episodeForm.value.airDate) {
    formErrors.value.airDate = 'Air date is required'
  }

  return Object.keys(formErrors.value).length === 0
}

const saveEpisode = async () => {
  if (!validateForm()) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please fill in all required fields',
      life: 3000
    })
    return
  }

  saving.value = true
  try {
    const payload = {
      ...episodeForm.value,
      airDate: episodeForm.value.airDate?.toISOString()
    }

    if (editingEpisode.value) {
      await api.put(`/episodes/${editingEpisode.value._id}`, payload)
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Episode updated successfully',
        life: 3000
      })
    } else {
      await api.post('/episodes', payload)
      toast.add({
        severity: 'success',
        summary: 'Created',
        detail: 'Episode created successfully',
        life: 3000
      })
    }

    episodeDialog.value = false
    await loadEpisodes()
  } catch (error) {
    console.error('Error saving episode:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || 'Failed to save episode',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (episode) => {
  confirm.require({
    message: `Delete episode "${episode.title}"?`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteEpisode(episode._id)
  })
}

const deleteEpisode = async (id) => {
  try {
    await api.delete(`/episodes/${id}`)
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Episode deleted successfully',
      life: 3000
    })
    await loadEpisodes()
  } catch (error) {
    console.error('Error deleting episode:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete episode',
      life: 3000
    })
  }
}

const openUploadDialog = (episode) => {
  selectedEpisode.value = episode
  selectedFile.value = null
  uploadProgress.value = 0
  uploadDialog.value = true

  // Reset input file
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const onFileSelectNative = (event) => {
  const file = event.target.files[0]

  if (!file) return

  // Verifica MP3
  const isMP3 = file.type === 'audio/mpeg' ||
    file.type === 'audio/mp3' ||
    file.name.toLowerCase().endsWith('.mp3')

  if (!isMP3) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Format',
      detail: 'Please select an MP3 file',
      life: 3000
    })
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  // Verifica dimensione (500MB)
  if (file.size > 500 * 1024 * 1024) {
    toast.add({
      severity: 'error',
      summary: 'File Too Large',
      detail: 'Maximum size is 500MB',
      life: 3000
    })
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  selectedFile.value = file
  console.log('✅ File selected:', file.name, file.size, 'bytes')
}

const uploadAudio = async () => {
  if (!selectedFile.value || !selectedEpisode.value) return

  uploading.value = true
  uploadProgress.value = 0

  const formData = new FormData()
  formData.append('audio', selectedFile.value)

  try {
    // ✅ Endpoint corretto: /episodes/:id/upload
    await api.post(`/episodes/${selectedEpisode.value._id}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        uploadProgress.value = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
      }
    })

    toast.add({
      severity: 'success',
      summary: 'Uploaded',
      detail: 'Audio file uploaded successfully',
      life: 3000
    })

    uploadDialog.value = false
    selectedFile.value = null

    // Reset input file
    if (fileInput.value) {
      fileInput.value.value = ''
    }

    await loadEpisodes()
  } catch (error) {
    console.error('Error uploading audio:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || 'Failed to upload audio',
      life: 3000
    })
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

// Audio Preview Functions
const previewAudio = (episode) => {
  previewEpisode.value = episode
  previewDialog.value = true
}

const closePreview = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
  }
  previewDialog.value = false
}

const confirmDeleteAudio = () => {
  confirm.require({
    message: 'Are you sure you want to delete the audio file?',
    header: 'Delete Audio',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteAudio()
  })
}

const deleteAudio = async () => {
  if (!previewEpisode.value) return

  try {
    await api.delete(`/episodes/${previewEpisode.value._id}/audio`)
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Audio file deleted successfully',
      life: 3000
    })
    previewDialog.value = false
    await loadEpisodes()
  } catch (error) {
    console.error('Error deleting audio:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete audio file',
      life: 3000
    })
  }
}

const downloadAudio = async () => {
  if (!previewEpisode.value?.audioFile?.storedFilename) return

  const audioUrl = getAudioUrl(previewEpisode.value._id)

  if (!audioUrl) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Audio file not found',
      life: 3000
    })
    return
  }

  try {
    // Toast per indicare che il download sta iniziando
    toast.add({
      severity: 'info',
      summary: 'Downloading',
      detail: 'Preparing download...',
      life: 2000
    })

    // Scarica il file come blob
    const response = await fetch(audioUrl)

    if (!response.ok) {
      throw new Error('Download failed')
    }

    const blob = await response.blob()

    // Nome file suggerito per il download
    const filename = `${previewEpisode.value.showId?.title || 'Episode'} - ${previewEpisode.value.title}.mp3`
      .replace(/[^a-z0-9\s\-_]/gi, '_') // Rimuovi caratteri non validi

    // Crea blob URL e forza il download
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Rilascia il blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)

    toast.add({
      severity: 'success',
      summary: 'Download Complete',
      detail: 'Audio file downloaded successfully',
      life: 3000
    })
  } catch (error) {
    console.error('Download error:', error)
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: 'Failed to download audio file',
      life: 3000
    })
  }
}

const getAudioUrl = (episodeId) => {
  // Trova episode nella lista o usa previewEpisode
  const episode = episodes.value.find(ep => ep._id === episodeId) || previewEpisode.value

  if (!episode?.audioFile?.storedFilename) {
    return null
  }

  // URL diretto al file MP3
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  const serverBase = API_BASE.replace('/api', '')

  return `${serverBase}/uploads/episodes/${episode.audioFile.storedFilename}`
}

const formatFileSize = (bytes) => {
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

const onSearch = () => {
  // Debounce can be added here if needed
}

// Utility functions
const getStatusLabel = (status) => {
  const map = {
    draft: 'DRAFT',
    published: 'PUBLISHED',
    archived: 'ARCHIVED'
  }
  return map[status] || status?.toUpperCase()
}

const getStatusSeverity = (status) => {
  const map = {
    draft: 'secondary',
    published: 'success',
    archived: 'warning'
  }
  return map[status] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDuration = (value) => {
  if (!value) return '-'

  // Se è in secondi (dal file audio)
  if (value > 1000) {
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Se è già in minuti
  const hours = Math.floor(value / 60)
  const mins = value % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// Lifecycle
onMounted(async () => {
  await Promise.all([
    loadEpisodes(),
    loadShows()
  ])
})
</script>

<style scoped>
.filters-card {
  margin-bottom: 2rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.episode-title-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.episode-title-cell .description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
}

.show-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.show-cell i {
  color: #3b82f6;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

.empty-state p {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

/* Form Styles */
.episode-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-section {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-section h4 {
  margin: 0 0 1rem;
  color: #1f2937;
  font-size: 1rem;
}

.hint {
  color: #9ca3af;
  font-size: 0.8rem;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.upload-section ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.file-upload-native {
  margin: 1rem 0;
}

.select-file-btn {
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.file-info {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.file-info p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.w-full {
  width: 100%;
}

/* Preview Styles */
.preview-section {
  padding: 1rem 0;
}

.preview-section h3 {
  margin: 0 0 0.5rem;
  color: #1f2937;
}

.show-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.show-name i {
  color: #3b82f6;
}

.audio-player {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.audio-player audio {
  width: 100%;
  border-radius: 8px;
}

.audio-info {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.audio-info p {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #374151;
}
</style>
