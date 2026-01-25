<template>
  <DashboardLayout page-title="Shows Management">
    <template #topbar-actions>
      <Button
        label="New Show"
        icon="pi pi-plus"
        @click="openDialog()"
      />
    </template>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters">
          <Button
            :label="`Pending Requests (${pendingRequestsCount})`"
            :severity="currentFilter === 'pending' ? 'warning' : 'secondary'"
            :outlined="currentFilter !== 'pending'"
            @click="currentFilter = 'pending'"
            icon="pi pi-clock"
          />
          <Button
            :label="`Active (${activeShowsCount})`"
            :severity="currentFilter === 'active' ? 'success' : 'secondary'"
            :outlined="currentFilter !== 'active'"
            @click="currentFilter = 'active'"
            icon="pi pi-check-circle"
          />
          <Button
            :label="`Inactive (${inactiveShowsCount})`"
            :severity="currentFilter === 'inactive' ? 'info' : 'secondary'"
            :outlined="currentFilter !== 'inactive'"
            @click="currentFilter = 'inactive'"
            icon="pi pi-pause"
          />
          <Button
            :label="`Rejected (${rejectedRequestsCount})`"
            :severity="currentFilter === 'rejected' ? 'danger' : 'secondary'"
            :outlined="currentFilter !== 'rejected'"
            @click="currentFilter = 'rejected'"
            icon="pi pi-times"
          />
          <Button
            label="All"
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
              <p>No shows {{ getFilterLabel() }}</p>
              <Button label="Create first show" icon="pi pi-plus" @click="openDialog()" />
            </div>
          </template>

          <Column field="title" header="Title" sortable style="min-width: 200px;"></Column>
          <Column field="artist.name" header="Artist" sortable></Column>
          <Column field="artist.email" header="Email" sortable></Column>
          <Column field="genres" header="Genres">
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
          <Column field="requestStatus" header="Request Status" sortable>
            <template #body="slotProps">
              <Tag
                :value="getRequestStatusLabel(slotProps.data.requestStatus)"
                :severity="getRequestStatusSeverity(slotProps.data.requestStatus)"
              />
            </template>
          </Column>
          <Column field="status" header="Show Status" sortable>
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
          <Column header="Actions" style="width: 300px;">
            <template #body="slotProps">
              <div class="action-buttons">
                <!-- Actions for pending requests -->
                <Button
                  v-if="slotProps.data.requestStatus === 'pending'"
                  icon="pi pi-check"
                  rounded
                  severity="success"
                  @click="approveRequest(slotProps.data)"
                  v-tooltip.top="'Approve Request'"
                />
                <Button
                  v-if="slotProps.data.requestStatus === 'pending'"
                  icon="pi pi-times"
                  rounded
                  severity="danger"
                  @click="rejectRequest(slotProps.data)"
                  v-tooltip.top="'Reject Request'"
                />

                <!-- Audio button -->
                <Button
                  icon="pi pi-volume-up"
                  rounded
                  outlined
                  :severity="slotProps.data.audio?.filename ? 'success' : 'secondary'"
                  @click="openAudioDialog(slotProps.data)"
                  v-tooltip.top="'Manage Audio'"
                />

                <!-- Standard actions -->
                <Button
                  icon="pi pi-eye"
                  rounded
                  outlined
                  severity="info"
                  @click="viewShow(slotProps.data)"
                  v-tooltip.top="'Details'"
                />
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  severity="secondary"
                  @click="openDialog(slotProps.data)"
                  v-tooltip.top="'Edit'"
                />
                <Button
                  icon="pi pi-trash"
                  rounded
                  outlined
                  severity="danger"
                  @click="confirmDelete(slotProps.data)"
                  v-tooltip.top="'Delete'"
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
      header="Show Audio Management"
      :modal="true"
      :style="{ width: '550px' }"
    >
      <div class="audio-dialog-content" v-if="selectedShowForAudio">
        <div class="show-info-header">
          <h4>{{ selectedShowForAudio.title }}</h4>
          <p class="artist-name">{{ selectedShowForAudio.artist?.name }}</p>
        </div>

        <!-- If audio already exists -->
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
              @error="handleAudioError"
            ></audio>
          </div>

          <!-- Audio Actions -->
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
              label="Delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              @click="confirmDeleteAudio"
            />
          </div>
        </div>

        <!-- If no audio -->
        <div v-else class="no-audio-section">
          <div class="no-audio-icon">
            <i class="pi pi-volume-off"></i>
          </div>
          <p>No audio uploaded for this show</p>
        </div>

        <!-- Upload Section -->
        <Divider />

        <div class="upload-section">
          <h5>{{ selectedShowForAudio.audio?.filename ? 'Replace Audio' : 'Upload Audio' }}</h5>
          <p class="upload-hint">
            Accepted formats: MP3 | Max 500MB | Min 128kbps | Max 60 minutes
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
              label="Select MP3 file"
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
              v-tooltip.top="'Remove'"
            />
          </div>

          <Button
            v-if="selectedAudioFile"
            label="Upload Audio"
            icon="pi pi-upload"
            @click="uploadAudio"
            :loading="audioUploading"
            class="upload-button"
          />
        </div>

        <!-- Upload progress -->
        <div v-if="audioUploading" class="upload-progress">
          <ProgressBar :value="uploadProgress" />
          <p>Upload in progress...</p>
        </div>
      </div>
    </Dialog>

    <!-- Create/Edit Show Dialog -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editingShow ? 'Edit Show' : 'New Show'"
      :modal="true"
      :style="{ width: '800px' }"
      :maximizable="true"
    >
      <div class="dialog-content">
        <div class="form-section">
          <h3>Show Information</h3>

          <div class="form-field">
            <ImageUpload
              label="Show Cover Image"
              v-model="formData.image.url"
            />
          </div>

          <div class="form-field">
            <label for="title">Show Title *</label>
            <InputText
              id="title"
              v-model="formData.title"
              placeholder="E.g. Noise à Noise"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="description">Description *</label>
            <Textarea
              id="description"
              v-model="formData.description"
              rows="5"
              placeholder="Describe the show..."
              class="w-full"
            />
          </div>
        </div>

        <div class="form-section">
          <h3>Artist Information</h3>

          <div class="form-field">
            <ImageUpload
              label="Artist Photo"
              v-model="formData.artist.photo"
            />
          </div>

          <div class="form-field">
            <label for="artistName">Artist Name *</label>
            <InputText
              id="artistName"
              v-model="formData.artist.name"
              placeholder="Curator/artist name"
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="artistBio">Artist Bio</label>
            <Textarea
              id="artistBio"
              v-model="formData.artist.bio"
              rows="3"
              placeholder="Artist biography..."
              class="w-full"
            />
          </div>

          <div class="form-field">
            <label for="artistEmail">Artist Email</label>
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
          <h3>Genres and Tags</h3>

          <div class="form-field">
            <label for="genres">Genres (comma separated)</label>
            <InputText
              id="genres"
              v-model="genresInput"
              placeholder="Ambient, Experimental, Drone"
              class="w-full"
            />
            <small>Enter genres separated by comma</small>
          </div>

          <div class="form-field">
            <label for="tags">Tags (comma separated)</label>
            <InputText
              id="tags"
              v-model="tagsInput"
              placeholder="underground, electronic, live"
              class="w-full"
            />
          </div>
        </div>

        <!-- Schedule Section -->
        <div class="form-section">
          <h3><i class="pi pi-calendar"></i> Schedule</h3>
          <p class="section-description">Set the preferred day and time slot for this show</p>

          <div class="form-row">
            <div class="form-field">
              <label for="dayOfWeek">Preferred Day</label>
              <Dropdown
                id="dayOfWeek"
                v-model="formData.schedule.dayOfWeek"
                :options="dayOptions"
                placeholder="Select day"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="timeSlot">Time Slot</label>
              <InputText
                id="timeSlot"
                v-model="formData.schedule.timeSlot"
                placeholder="E.g. 20:00 - 22:00"
                class="w-full"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="frequency">Frequency</label>
            <Dropdown
              id="frequency"
              v-model="formData.schedule.frequency"
              :options="frequencyOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select frequency"
              class="w-full"
            />
          </div>
        </div>

        <!-- Social Links Section -->
        <div class="form-section">
          <h3>Social Links</h3>
          <p class="section-description">Add social media profiles (optional)</p>

          <div class="social-grid">
            <!-- Instagram -->
            <div class="form-field">
              <label for="instagram">
                <i class="pi pi-instagram" style="color: #E4405F;"></i>
                Instagram
              </label>
              <InputText
                id="instagram"
                v-model="formData.artist.socialLinks.instagram"
                placeholder="https://instagram.com/username"
                class="w-full"
              />
            </div>

            <!-- SoundCloud -->
            <div class="form-field">
              <label for="soundcloud">
                <i class="pi pi-cloud" style="color: #FF5500;"></i>
                SoundCloud
              </label>
              <InputText
                id="soundcloud"
                v-model="formData.artist.socialLinks.soundcloud"
                placeholder="https://soundcloud.com/username"
                class="w-full"
              />
            </div>

            <!-- Mixcloud -->
            <div class="form-field">
              <label for="mixcloud">
                <i class="pi pi-volume-up" style="color: #314359;"></i>
                Mixcloud
              </label>
              <InputText
                id="mixcloud"
                v-model="formData.artist.socialLinks.mixcloud"
                placeholder="https://mixcloud.com/username"
                class="w-full"
              />
            </div>

            <!-- YouTube -->
            <div class="form-field">
              <label for="youtube">
                <i class="pi pi-youtube" style="color: #FF0000;"></i>
                YouTube
              </label>
              <InputText
                id="youtube"
                v-model="formData.artist.socialLinks.youtube"
                placeholder="https://youtube.com/@username"
                class="w-full"
              />
            </div>

            <!-- Bandcamp -->
            <div class="form-field">
              <label for="bandcamp">
                <i class="pi pi-ticket" style="color: #629AA9;"></i>
                Bandcamp
              </label>
              <InputText
                id="bandcamp"
                v-model="formData.artist.socialLinks.bandcamp"
                placeholder="https://username.bandcamp.com"
                class="w-full"
              />
            </div>

            <!-- Personal Website -->
            <div class="form-field">
              <label for="website">
                <i class="pi pi-globe" style="color: #3B82F6;"></i>
                Personal Website
              </label>
              <InputText
                id="website"
                v-model="formData.artist.socialLinks.website"
                placeholder="https://yourwebsite.com"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3>Settings</h3>

          <div class="form-row">
            <div class="form-field">
              <label for="requestStatus">Request Status</label>
              <Dropdown
                id="requestStatus"
                v-model="formData.requestStatus"
                :options="requestStatusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select status"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="status">Show Status</label>
              <Dropdown
                id="status"
                v-model="formData.status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select status"
                class="w-full"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="featured">Featured</label>
            <div class="checkbox-field">
              <Checkbox
                id="featured"
                v-model="formData.featured"
                :binary="true"
              />
              <label for="featured">Show on homepage</label>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" @click="dialogVisible = false" outlined />
        <Button
          :label="editingShow ? 'Save Changes' : 'Create Show'"
          @click="saveShow"
          :loading="showsStore.loading"
        />
      </template>
    </Dialog>

    <ConfirmDialog />
    <Toast />
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useShowsStore } from '@/stores/shows.js'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DashboardLayout from '../../components/DashboardLayout.vue'
import ImageUpload from '../../components/ImageUpload.vue'
import api from '@/api/axios';

const showsStore = useShowsStore()
const toast = useToast()
const confirm = useConfirm()

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const dialogVisible = ref(false)
const editingShow = ref(null)
const currentFilter = ref('pending')

// Audio Dialog State
const audioDialogVisible = ref(false)
const selectedShowForAudio = ref(null)
const selectedAudioFile = ref(null)
const audioUploading = ref(false)
const uploadProgress = ref(0)
const isPlaying = ref(false)
const audioPlayerRef = ref(null)
const audioFileInput = ref(null)

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
  },
  genre: [],
  tags: [],
  requestStatus: 'pending',
  status: 'active',
  featured: false
})

const genresInput = ref('')
const tagsInput = ref('')

const dayOptions = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

const frequencyOptions = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'One-time', value: 'onetime' }
]

const requestStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' }
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Archived', value: 'archived' }
]

// Computed per filtri
const pendingRequests = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'pending')
)
const activeShows = computed(() =>
  showsStore.shows.filter(s => s.status === 'active' && s.requestStatus === 'approved')
)
const inactiveShows = computed(() =>
  showsStore.shows.filter(s => s.status === 'inactive')
)
const rejectedRequests = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'rejected')
)

const pendingRequestsCount = computed(() => pendingRequests.value.length)
const activeShowsCount = computed(() => activeShows.value.length)
const inactiveShowsCount = computed(() => inactiveShows.value.length)
const rejectedRequestsCount = computed(() => rejectedRequests.value.length)

const filteredShows = computed(() => {
  switch (currentFilter.value) {
    case 'pending':
      return pendingRequests.value
    case 'active':
      return activeShows.value
    case 'inactive':
      return inactiveShows.value
    case 'rejected':
      return rejectedRequests.value
    case 'all':
      return showsStore.shows
    default:
      return showsStore.shows
  }
})

const getFilterLabel = () => {
  const labels = {
    pending: 'pending approval',
    active: 'active',
    inactive: 'inactive',
    rejected: 'rejected',
    all: ''
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
  const map = {
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    archived: 'ARCHIVED'
  }
  return map[status] || status?.toUpperCase()
}

const getStatusSeverity = (status) => {
  const map = {
    active: 'success',
    inactive: 'warning',
    archived: 'secondary'
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

const getAudioUrl = (show) => {
  if (!show?.audio?.url) return ''
  // Se l'URL è relativo, costruisci l'URL completo
  if (show.audio.url.startsWith('/')) {
    const baseUrl = API_URL.replace('/api', '')
    return `${baseUrl}${show.audio.url}`
  }
  return show.audio.url
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
    summary: 'Error',
    detail: 'Unable to load audio file',
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
    detail: 'Download started',
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
        summary: 'Invalid format',
        detail: 'Please select an MP3 file',
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

  try {
    // STEP 1: Request signed URL
    uploadProgress.value = 5
    const presignRes = await api.post(`/upload/presign/show/${selectedShowForAudio.value._id}`, {
      filename: selectedAudioFile.value.name,
      contentType: selectedAudioFile.value.type || 'audio/mpeg'
    })

    const { presignedUrl, key, fileUrl } = presignRes.data
    uploadProgress.value = 10

    // STEP 2: Direct upload to B2
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          // Progress from 10% to 90%
          uploadProgress.value = 10 + Math.round((e.loaded / e.total) * 80)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Network error')))
      xhr.open('PUT', presignedUrl)
      // DO NOT set Content-Type - must match signature
      xhr.send(selectedAudioFile.value)
    })

    uploadProgress.value = 90

    // STEP 3: Get audio metadata
    const metadata = await new Promise((resolve) => {
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.onloadedmetadata = () => {
        const duration = Math.round(audio.duration)
        const bitrate = Math.round((selectedAudioFile.value.size * 8) / audio.duration / 1000)
        URL.revokeObjectURL(audio.src)
        resolve({ duration, bitrate })
      }
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src)
        resolve({ duration: null, bitrate: null })
      }
      audio.src = URL.createObjectURL(selectedAudioFile.value)
    })

    // STEP 4: Confirm upload to backend
    const confirmRes = await api.post(`/upload/confirm/show/${selectedShowForAudio.value._id}`, {
      key,
      fileUrl,
      filename: selectedAudioFile.value.name,
      size: selectedAudioFile.value.size,
      duration: metadata.duration,
      bitrate: metadata.bitrate
    })

    uploadProgress.value = 100

    // Update show with new audio data
    selectedShowForAudio.value.audio = confirmRes.data.audio

    toast.add({
      severity: 'success',
      summary: 'Audio uploaded',
      detail: 'Audio file uploaded successfully',
      life: 3000
    })

    // Aggiorna la lista degli show
    await showsStore.fetchShows()

    // Reset
    selectedAudioFile.value = null

  } catch (error) {
    console.error('Audio upload error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || error.message || 'Error uploading audio',
      life: 4000
    })
  } finally {
    audioUploading.value = false
    uploadProgress.value = 0
  }
}

const confirmDeleteAudio = () => {
  confirm.require({
    message: 'Are you sure you want to delete this audio file?',
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Yes, delete',
    rejectLabel: 'Cancel',
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
      summary: 'Audio deleted',
      detail: 'Audio file deleted successfully',
      life: 3000
    })

    // Aggiorna la lista degli show
    await showsStore.fetchShows()

  } catch (error) {
    console.error('Audio deletion error:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || 'Error deleting audio',
      life: 3000
    })
  }
}

// ==================== SHOW MANAGEMENT FUNCTIONS ====================

const openDialog = (show = null) => {
  if (show) {
    editingShow.value = show
    formData.value = {
      title: show.title,
      description: show.description,
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
      schedule: {
        dayOfWeek: show.schedule?.dayOfWeek || '',
        timeSlot: show.schedule?.timeSlot || '',
        frequency: show.schedule?.frequency || 'weekly'
      },
      genre: show.genres || [],
      tags: show.tags || [],
      requestStatus: show.requestStatus,
      status: show.status,
      featured: show.featured
    }
    genresInput.value = (show.genres || []).join(', ')
    tagsInput.value = (show.tags || []).join(', ')
  } else {
    editingShow.value = null
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
      schedule: {
        dayOfWeek: '',
        timeSlot: '',
        frequency: 'weekly'
      },
      genre: [],
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
      summary: 'Warning',
      detail: 'Fill in required fields (title, description, artist)',
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
    schedule: {
      dayOfWeek: formData.value.schedule.dayOfWeek || '',
      timeSlot: formData.value.schedule.timeSlot || '',
      frequency: formData.value.schedule.frequency || 'weekly'
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
        summary: 'Show updated',
        detail: 'Changes saved successfully',
        life: 3000
      })
    } else {
      await showsStore.createShow(showData)
      toast.add({
        severity: 'success',
        summary: 'Show created',
        detail: 'New show created successfully',
        life: 3000
      })
    }

    dialogVisible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: showsStore.error || 'Error saving data',
      life: 3000
    })
  }
}

const viewShow = (show) => {
  alert(`Show Details:\n\nTitle: ${show.title}\nSlug: ${show.slug}\nStatus: ${show.status}\nRequest Status: ${show.requestStatus}`)
}

const approveRequest = async (show) => {
  confirm.require({
    message: `Do you want to approve the show "${show.title}" by ${show.artist.name}?`,
    header: 'Approve Request',
    icon: 'pi pi-check-circle',
    acceptLabel: 'Yes, approve',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-success',
    accept: async () => {
      try {
        await api.put(`${API_URL}/shows/admin/${show._id}/approve`, {
          adminNote: 'Show approved! Welcome to BUG Radio 🎵'
        })

        toast.add({
          severity: 'success',
          summary: 'Show Approved!',
          detail: `"${show.title}" has been approved and activated`,
          life: 4000
        })

        await showsStore.fetchShows()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error approving show',
          life: 3000
        })
      }
    }
  })
}

const rejectRequest = async (show) => {
  const rejectReason = prompt(`Reason for rejecting "${show.title}":`, 'The content is not suitable for our programming.')

  if (!rejectReason) return

  try {
    await api.put(`${API_URL}/shows/admin/${show._id}/reject`, {
      adminNotes: rejectReason
    })

    toast.add({
      severity: 'info',
      summary: 'Show Rejected',
      detail: `"${show.title}" has been rejected`,
      life: 3000
    })

    await showsStore.fetchShows()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error rejecting show',
      life: 3000
    })
  }
}

const confirmDelete = (show) => {
  confirm.require({
    message: `Are you sure you want to delete "${show.title}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Yes, delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: () => deleteShow(show)
  })
}

const deleteShow = async (show) => {
  try {
    await showsStore.deleteShow(show._id)
    toast.add({
      severity: 'success',
      summary: 'Show deleted',
      detail: 'Show deleted successfully',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error deleting show',
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
      summary: 'Error',
      detail: 'Error loading shows',
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
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-description {
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
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

.form-field label i {
  margin-right: 0.5rem;
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

.social-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
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
