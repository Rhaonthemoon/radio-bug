<template>
  <DashboardLayout page-title="Episodes Management">
    <template #topbar-actions>
      <Button label="New Episode" icon="pi pi-plus" @click="openCreateDialog"/>
    </template>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters">
          <div class="filter-group">
            <label>Show</label>
            <Dropdown v-model="filters.showId" :options="shows" optionLabel="title"
                      optionValue="_id" placeholder="All Shows" showClear @change="loadEpisodes"
                      class="w-full"/>
          </div>
          <div class="filter-group">
            <label>Status</label>
            <Dropdown v-model="filters.status" :options="statusOptions" optionLabel="label"
                      optionValue="value" placeholder="All Statuses" showClear
                      @change="loadEpisodes" class="w-full"/>
          </div>
          <div class="filter-group">
            <label>Search</label>
            <InputText v-model="searchQuery" placeholder="Search episodes..." @input="onSearch"
                       class="w-full"/>
          </div>
        </div>
      </template>
    </Card>

    <!-- Episodes Table -->
    <Card>
      <template #content>
        <DataTable :value="filteredEpisodes" :loading="loading" stripedRows paginator :rows="10"
                   :rowsPerPageOptions="[5, 10, 20, 50]" responsiveLayout="scroll">
          <!-- Image Column -->
          <Column header="Image" style="width: 80px;">
            <template #body="{ data }">
              <div class="episode-image-cell">
                <img v-if="data.image?.exists" :src="getImageUrl(data)" :alt="data.title"
                     class="episode-thumbnail"/>
                <div v-else class="no-image"><i class="pi pi-image"></i></div>
              </div>
            </template>
          </Column>

          <Column field="title" header="Title" sortable style="min-width: 200px;">
            <template #body="{ data }">
              <div class="episode-title-cell">
                <strong>{{ data.title }}</strong>
                <small v-if="data.description" class="description">{{
                    truncate(data.description, 60)
                  }}</small>
              </div>
            </template>
          </Column>

          <Column field="showId.title" header="Show" sortable>
            <template #body="{ data }">
              <div class="show-cell"><i class="pi pi-microphone"></i> {{
                  data.showId?.title || '-'
                }}
              </div>
            </template>
          </Column>

          <Column field="airDate" header="Air Date" sortable>
            <template #body="{ data }">{{ formatDateTime(data.airDate) }}</template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)"/>
            </template>
          </Column>

          <Column header="Mixcloud" style="width: 130px;">
            <template #body="{ data }">
              <div class="mixcloud-cell">
                <Tag v-if="data.mixcloud?.status === 'uploaded'" value="UPLOADED" severity="success"
                     v-tooltip.top="'Pubblicato su Mixcloud'"/>
                <Tag v-else-if="data.mixcloud?.status === 'uploading'" severity="info"><i
                  class="pi pi-spin pi-spinner" style="margin-right:4px"></i>UPLOADING
                </Tag>
                <!-- Failed: bottone retry -->
                <Button
                  v-else-if="data.mixcloud?.status === 'failed'"
                  label="Retry"
                  icon="pi pi-refresh"
                  size="small"
                  severity="danger"
                  @click="publishToMixcloud(data)"
                  :loading="mixcloudUploading[data._id]"
                  :disabled="!data.audioFile?.exists"
                  v-tooltip.top="data.mixcloud?.error || 'Riprova upload'"
                />
                <span v-else-if="data.status !== 'archived'" class="mixcloud-na">-</span>
                <!-- Archiviato e mai uploadato -->
                <Button
                  v-else
                  label="Publish"
                  icon="pi pi-cloud-upload"
                  size="small"
                  severity="secondary"
                  @click="publishToMixcloud(data)"
                  :loading="mixcloudUploading[data._id]"
                  :disabled="!data.audioFile?.exists"
                />
              </div>
            </template>
          </Column>

          <Column header="Actions" style="width: 220px;">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button icon="pi pi-pencil" @click="openEditDialog(data)" v-tooltip.top="'Edit'"
                        text rounded/>
                <Button icon="pi pi-image" @click="openImageUploadDialog(data)"
                        v-tooltip.top="'Image'"
                        :severity="data.image?.exists ? 'success' : 'warning'" text rounded/>
                <Button icon="pi pi-upload" @click="openUploadDialog(data)" v-tooltip.top="'Audio'"
                        :severity="data.audioFile?.exists ? 'success' : 'warning'" text rounded/>
                <Button v-if="data.audioFile?.exists" icon="pi pi-play" @click="previewAudio(data)"
                        v-tooltip.top="'Preview'" severity="info" text rounded/>
                <!-- Elimina MP3 solo se già su Mixcloud -->
                <Button
                  v-if="data.mixcloud?.status === 'uploaded' && data.audioFile?.exists"
                  icon="pi pi-trash"
                  @click="confirmDeleteAudioFile(data)"
                  v-tooltip.top="'Elimina MP3 (già su Mixcloud)'"
                  severity="warning"
                  text
                  rounded
                />
                <Button icon="pi pi-trash" @click="confirmDelete(data)"
                        v-tooltip.top="'Delete Episode'" severity="danger" text rounded/>
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="empty-state"><i class="pi pi-play-circle"></i>
              <p>No episodes found</p>
              <Button label="Create First Episode" icon="pi pi-plus" @click="openCreateDialog"/>
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:visible="episodeDialog"
            :header="editingEpisode ? 'Edit Episode' : 'New Episode'" modal
            :style="{ width: '600px' }" @hide="resetForm">
      <div class="episode-form">
        <div class="form-group">
          <label>Show *</label>
          <Dropdown v-model="episodeForm.showId" :options="shows" optionLabel="title"
                    optionValue="_id" placeholder="Select a show"
                    :class="{ 'p-invalid': formErrors.showId }" class="w-full"/>
          <small class="p-error" v-if="formErrors.showId">{{ formErrors.showId }}</small>
        </div>

        <!-- Show Schedule Info (read-only, from selected show) -->
        <div v-if="selectedShowSchedule" class="schedule-info-box">
          <div class="schedule-header">
            <i class="pi pi-calendar"></i>
            <span>Show Schedule</span>
          </div>
          <div class="schedule-details">
            <div class="schedule-item">
              <strong>Day:</strong>
              <Tag :value="selectedShowSchedule.dayOfWeek" severity="info" />
            </div>
            <div class="schedule-item" v-if="selectedShowSchedule.timeSlot">
              <strong>Time:</strong>
              <span>{{ selectedShowSchedule.timeSlot }}</span>
            </div>
            <div class="schedule-item" v-if="selectedShowSchedule.frequency">
              <strong>Frequency:</strong>
              <Tag :value="formatFrequency(selectedShowSchedule.frequency)" severity="secondary" />
            </div>
          </div>
        </div>

        <Message v-else-if="episodeForm.showId && !selectedShowSchedule" severity="warn" :closable="false">
          <small>This show doesn't have a schedule configured yet.</small>
        </Message>

        <div class="form-group">
          <label>Title *</label>
          <InputText v-model="episodeForm.title" placeholder="Episode title"
                     :class="{ 'p-invalid': formErrors.title }" class="w-full"/>
          <small class="p-error" v-if="formErrors.title">{{ formErrors.title }}</small>
        </div>

        <div class="form-group">
          <label>Description</label>
          <Textarea v-model="episodeForm.description" rows="3" placeholder="Episode description..."
                    class="w-full"/>
        </div>

        <div class="form-group">
          <label>Air Date & Time *</label>
          <Calendar v-model="episodeForm.airDate" dateFormat="yy-mm-dd" showIcon showTime
                    hourFormat="24" :class="{ 'p-invalid': formErrors.airDate }" class="w-full"/>
          <small class="p-error" v-if="formErrors.airDate">{{ formErrors.airDate }}</small>
          <div v-if="suggestedAirDate" class="suggested-date">
            <i class="pi pi-lightbulb"></i>
            <span>Suggested: <strong>{{ formatDateTime(suggestedAirDate) }}</strong></span>
            <Button label="Use" size="small" text @click="episodeForm.airDate = suggestedAirDate" />
          </div>
        </div>

        <div class="form-group">
          <label>Status</label>
          <Dropdown v-model="episodeForm.status" :options="statusOptions" optionLabel="label"
                    optionValue="value" class="w-full"/>
        </div>

        <div class="form-section">
          <h4>External Links</h4>
          <div class="form-group">
            <label>Mixcloud URL</label>
            <InputText v-model="episodeForm.externalLinks.mixcloudUrl"
                       placeholder="https://www.mixcloud.com/..." class="w-full"/>
          </div>
          <div class="form-group">
            <label>YouTube URL</label>
            <InputText v-model="episodeForm.externalLinks.youtubeUrl"
                       placeholder="https://www.youtube.com/..." class="w-full"/>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" @click="episodeDialog = false" text/>
        <Button :label="editingEpisode ? 'Update' : 'Create'" @click="saveEpisode"
                :loading="saving"/>
      </template>
    </Dialog>

    <!-- Upload Audio Dialog -->
    <Dialog v-model:visible="uploadDialog" header="Upload Audio File" modal
            :style="{ width: '500px' }">
      <div class="upload-section">
        <p v-if="selectedEpisode"><strong>Episode:</strong> {{ selectedEpisode.title }}</p>
        <Message severity="info" :closable="false">
          <p><strong>Requirements:</strong> MP3, 320kbps+, max 500MB</p>
        </Message>
        <div class="file-upload-native">
          <input type="file" ref="fileInput" accept="audio/mp3,audio/mpeg,.mp3"
                 @change="onFileSelectNative" style="display: none"/>
          <Button label="Select MP3 File" icon="pi pi-folder-open" @click="triggerFileInput"
                  :disabled="uploading" outlined class="w-full"/>
        </div>
        <div v-if="selectedFile" class="file-info">
          <p><strong>Selected:</strong> {{ selectedFile.name }}</p>
          <p><strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        </div>
        <ProgressBar v-if="uploadProgress > 0" :value="uploadProgress"/>
      </div>
      <template #footer>
        <Button label="Cancel" @click="uploadDialog = false" text/>
        <Button label="Upload" @click="uploadAudio" :loading="uploading" :disabled="!selectedFile"/>
      </template>
    </Dialog>

    <!-- Upload Image Dialog -->
    <Dialog v-model:visible="imageUploadDialog" header="Upload Episode Image" modal
            :style="{ width: '500px' }">
      <div class="upload-section">
        <p v-if="selectedEpisode"><strong>Episode:</strong> {{ selectedEpisode.title }}</p>

        <div v-if="selectedEpisode?.image?.exists" class="current-image">
          <p><strong>Current Image:</strong></p>
          <img :src="getImageUrl(selectedEpisode)" class="image-preview"/>
          <Button label="Remove Image" icon="pi pi-trash" severity="danger" size="small" outlined
                  @click="confirmDeleteImage" class="mt-2"/>
        </div>

        <Message severity="info" :closable="false">
          <p><strong>Requirements:</strong> JPG/PNG/WebP, 1400x1400px recommended, max 10MB</p>
        </Message>

        <div class="file-upload-native">
          <input type="file" ref="imageFileInput" accept="image/jpeg,image/png,image/webp"
                 @change="onImageSelectNative" style="display: none"/>
          <Button label="Select Image" icon="pi pi-image" @click="triggerImageFileInput"
                  :disabled="uploadingImage" outlined class="w-full"/>
        </div>

        <div v-if="selectedImageFile" class="file-info">
          <p><strong>Selected:</strong> {{ selectedImageFile.name }}</p>
          <p><strong>Size:</strong> {{ formatFileSize(selectedImageFile.size) }}</p>
          <img v-if="imagePreviewUrl" :src="imagePreviewUrl" class="image-preview mt-2"/>
        </div>
        <ProgressBar v-if="imageUploadProgress > 0" :value="imageUploadProgress"/>
      </div>
      <template #footer>
        <Button label="Cancel" @click="closeImageUploadDialog" text/>
        <Button label="Upload" @click="uploadImage" :loading="uploadingImage"
                :disabled="!selectedImageFile"/>
      </template>
    </Dialog>

    <!-- Audio Preview Dialog -->
    <Dialog v-model:visible="previewDialog" header="Audio Preview" modal
            :style="{ width: '500px' }">
      <div v-if="previewEpisode" class="preview-section">
        <div class="preview-header">
          <img v-if="previewEpisode.image?.exists" :src="getImageUrl(previewEpisode)"
               class="preview-image"/>
          <div class="preview-info">
            <h3>{{ previewEpisode.title }}</h3>
            <p class="show-name"><i class="pi pi-microphone"></i> {{ previewEpisode.showId?.title }}
            </p>
          </div>
        </div>
        <div class="audio-player" v-if="previewEpisode.audioFile?.exists">
          <audio ref="audioPlayer" controls :src="getAudioUrl(previewEpisode._id)"
                 class="w-full"></audio>
          <div class="audio-info">
            <p><strong>Bitrate:</strong> {{ previewEpisode.audioFile.bitrate }} kbps</p>
            <p><strong>Size:</strong> {{ formatFileSize(previewEpisode.audioFile.size) }}</p>
          </div>
        </div>
        <div v-if="previewEpisode.mixcloud?.status === 'uploaded'" class="mixcloud-info">
          <a :href="previewEpisode.externalLinks?.mixcloudUrl" target="_blank"
             class="mixcloud-link">
            <i class="pi pi-external-link"></i> Open on Mixcloud
          </a>
        </div>
      </div>
      <template #footer>
        <Button label="Close" @click="closePreview" text/>
        <Button label="Download" @click="downloadAudio" severity="success" icon="pi pi-download"/>
      </template>
    </Dialog>

    <Toast/>
    <ConfirmDialog/>
  </DashboardLayout>
</template>

<script setup>
import {ref, computed, onMounted, reactive} from 'vue'
import {useToast} from 'primevue/usetoast'
import {useConfirm} from 'primevue/useconfirm'
import DashboardLayout from '../../components/DashboardLayout.vue'
import api from '@/api/axios'

const toast = useToast()
const confirm = useConfirm()

const episodes = ref([])
const shows = ref([])
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadingImage = ref(false)
const imageUploadProgress = ref(0)
const selectedImageFile = ref(null)
const imagePreviewUrl = ref(null)
const imageFileInput = ref(null)
const imageUploadDialog = ref(false)
const mixcloudUploading = reactive({})
const episodeDialog = ref(false)
const uploadDialog = ref(false)
const previewDialog = ref(false)
const editingEpisode = ref(null)
const selectedEpisode = ref(null)
const selectedFile = ref(null)
const fileInput = ref(null)
const previewEpisode = ref(null)
const audioPlayer = ref(null)
const filters = ref({showId: null, status: null})
const searchQuery = ref('')

const episodeForm = ref({
  showId: null, title: '', description: '', airDate: null, duration: null, status: 'draft',
  externalLinks: {mixcloudUrl: '', youtubeUrl: '', spotifyUrl: ''}
})
const formErrors = ref({})
const statusOptions = [
  {label: 'Draft', value: 'draft'},
  {label: 'Published', value: 'published'},
  {label: 'Archived', value: 'archived'}
]

// Computed - Get schedule from selected show
const selectedShowSchedule = computed(() => {
  if (!episodeForm.value.showId) return null
  const show = shows.value.find(s => s._id === episodeForm.value.showId)
  if (!show?.schedule?.dayOfWeek) return null
  return show.schedule
})

// Computed - Suggest next air date based on show schedule (includes time)
const suggestedAirDate = computed(() => {
  if (!selectedShowSchedule.value?.dayOfWeek) return null

  const dayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  }

  const targetDay = dayMap[selectedShowSchedule.value.dayOfWeek]
  if (targetDay === undefined) return null

  const today = new Date()
  const currentDay = today.getDay()
  let daysUntilTarget = targetDay - currentDay

  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7
  }

  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysUntilTarget)

  // Parse time from timeSlot (e.g., "20:00 - 22:00" or "20:00")
  const timeSlot = selectedShowSchedule.value.timeSlot
  if (timeSlot) {
    const timeMatch = timeSlot.match(/(\d{1,2}):(\d{2})/)
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10)
      const minutes = parseInt(timeMatch[2], 10)
      nextDate.setHours(hours, minutes, 0, 0)
    } else {
      nextDate.setHours(0, 0, 0, 0)
    }
  } else {
    nextDate.setHours(0, 0, 0, 0)
  }

  return nextDate
})

// Computed
const filteredEpisodes = computed(() => {
  let result = episodes.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(ep => ep.title?.toLowerCase().includes(q) || ep.showId?.title?.toLowerCase().includes(q))
  }
  return result
})

const loadEpisodes = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.showId) params.showId = filters.value.showId
    if (filters.value.status) params.status = filters.value.status
    const response = await api.get('/episodes', {params})
    episodes.value = response.data
  } catch (error) {
    toast.add({severity: 'error', summary: 'Error', detail: 'Failed to load episodes', life: 3000})
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
  editingEpisode.value = null;
  resetForm();
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
    externalLinks: {mixcloudUrl: '', youtubeUrl: '', spotifyUrl: ''}
  }
  formErrors.value = {}
}

const validateForm = () => {
  formErrors.value = {}
  if (!episodeForm.value.showId) formErrors.value.showId = 'Show is required'
  if (!episodeForm.value.title?.trim()) formErrors.value.title = 'Title is required'
  if (!episodeForm.value.airDate) formErrors.value.airDate = 'Air date is required'
  return Object.keys(formErrors.value).length === 0
}

const saveEpisode = async () => {
  if (!validateForm()) {
    toast.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Fill required fields',
      life: 3000
    });
    return
  }
  saving.value = true
  try {
    const payload = {...episodeForm.value, airDate: episodeForm.value.airDate?.toISOString()}
    if (editingEpisode.value) {
      await api.put(`/episodes/${editingEpisode.value._id}`, payload)
      toast.add({severity: 'success', summary: 'Updated', detail: 'Episode updated', life: 3000})
    } else {
      await api.post('/episodes', payload)
      toast.add({severity: 'success', summary: 'Created', detail: 'Episode created', life: 3000})
    }
    episodeDialog.value = false
    await loadEpisodes()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.error || 'Failed',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

const confirmDelete = (episode) => {
  confirm.require({
    message: `Delete "${episode.title}"?`,
    header: 'Confirm',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteEpisode(episode._id)
  })
}

const deleteEpisode = async (id) => {
  try {
    await api.delete(`/episodes/${id}`)
    toast.add({severity: 'success', summary: 'Deleted', detail: 'Episode deleted', life: 3000})
    await loadEpisodes()
  } catch (error) {
    toast.add({severity: 'error', summary: 'Error', detail: 'Failed to delete', life: 3000})
  }
}

// ==================== AUDIO UPLOAD ====================
const openUploadDialog = (ep) => {
  selectedEpisode.value = ep;
  selectedFile.value = null;
  uploadProgress.value = 0;
  uploadDialog.value = true
}
const triggerFileInput = () => fileInput.value?.click()
const onFileSelectNative = (e) => {
  const file = e.target.files[0]
  if (file && (file.type.includes('audio/') || file.name.endsWith('.mp3')) && file.size <= 500 * 1024 * 1024) selectedFile.value = file
  else toast.add({
    severity: 'error',
    summary: 'Invalid',
    detail: 'Select valid MP3 under 500MB',
    life: 3000
  })
}
const uploadAudio = async () => {
  if (!selectedFile.value || !selectedEpisode.value) return
  uploading.value = true;
  uploadProgress.value = 0
  const fd = new FormData();
  fd.append('audio', selectedFile.value)
  try {
    await api.post(`/episodes/${selectedEpisode.value._id}/upload`, fd, {
      headers: {'Content-Type': 'multipart/form-data'},
      onUploadProgress: (e) => {
        uploadProgress.value = Math.round((e.loaded * 100) / e.total)
      }
    })
    toast.add({severity: 'success', summary: 'Uploaded', detail: 'Audio uploaded', life: 3000})
    uploadDialog.value = false;
    await loadEpisodes()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Failed',
      detail: error.response?.data?.error || 'Upload failed',
      life: 3000
    })
  } finally {
    uploading.value = false;
    selectedFile.value = null;
    uploadProgress.value = 0
    if (fileInput.value) fileInput.value.value = ''
  }
}

// ==================== ELIMINA MP3 (dopo Mixcloud) ====================
const confirmDeleteAudioFile = (episode) => {
  confirm.require({
    message: `L'episodio "${episode.title}" è già su Mixcloud. Vuoi eliminare il file MP3 locale per liberare spazio?`,
    header: 'Elimina File Audio',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sì, elimina',
    rejectLabel: 'Annulla',
    acceptClass: 'p-button-warning',
    accept: async () => {
      try {
        await api.delete(`/episodes/${episode._id}/audio`)
        toast.add({
          severity: 'success',
          summary: 'Eliminato',
          detail: 'File MP3 eliminato',
          life: 3000
        })
        await loadEpisodes()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Errore',
          detail: 'Impossibile eliminare il file',
          life: 3000
        })
      }
    }
  })
}

// ==================== IMAGE UPLOAD ====================
const openImageUploadDialog = (ep) => {
  selectedEpisode.value = ep;
  selectedImageFile.value = null;
  imagePreviewUrl.value = null;
  imageUploadProgress.value = 0;
  imageUploadDialog.value = true
}
const closeImageUploadDialog = () => {
  imageUploadDialog.value = false;
  selectedImageFile.value = null;
  imagePreviewUrl.value = null;
  if (imageFileInput.value) imageFileInput.value.value = ''
}
const triggerImageFileInput = () => imageFileInput.value?.click()
const onImageSelectNative = (e) => {
  const file = e.target.files[0]
  if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 10 * 1024 * 1024) {
    selectedImageFile.value = file
    imagePreviewUrl.value = URL.createObjectURL(file)
  } else toast.add({
    severity: 'error',
    summary: 'Invalid',
    detail: 'Select JPG/PNG/WebP under 10MB',
    life: 3000
  })
}
const uploadImage = async () => {
  if (!selectedImageFile.value || !selectedEpisode.value) return
  uploadingImage.value = true;
  imageUploadProgress.value = 0
  const fd = new FormData();
  fd.append('image', selectedImageFile.value)
  try {
    await api.post(`/episodes/${selectedEpisode.value._id}/upload-image`, fd, {
      headers: {'Content-Type': 'multipart/form-data'},
      onUploadProgress: (e) => {
        imageUploadProgress.value = Math.round((e.loaded * 100) / e.total)
      }
    })
    toast.add({severity: 'success', summary: 'Uploaded', detail: 'Image uploaded', life: 3000})
    closeImageUploadDialog();
    await loadEpisodes()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Failed',
      detail: error.response?.data?.error || 'Upload failed',
      life: 3000
    })
  } finally {
    uploadingImage.value = false
  }
}
const confirmDeleteImage = () => {
  confirm.require({
    message: 'Delete this image?',
    header: 'Confirm',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteImage()
  })
}
const deleteImage = async () => {
  if (!selectedEpisode.value) return
  try {
    await api.delete(`/episodes/${selectedEpisode.value._id}/image`)
    toast.add({severity: 'success', summary: 'Deleted', detail: 'Image deleted', life: 3000})
    closeImageUploadDialog();
    await loadEpisodes()
  } catch (error) {
    toast.add({severity: 'error', summary: 'Error', detail: 'Failed to delete image', life: 3000})
  }
}

// ==================== MIXCLOUD ====================
const publishToMixcloud = async (episode) => {
  confirm.require({
    message: `Publish "${episode.title}" to Mixcloud?`,
    header: 'Publish',
    icon: 'pi pi-cloud-upload',
    accept: async () => {
      mixcloudUploading[episode._id] = true
      try {
        await api.post(`/episodes/${episode._id}/publish-mixcloud`)
        toast.add({
          severity: 'success',
          summary: 'Published',
          detail: 'Published to Mixcloud',
          life: 5000
        })
        await loadEpisodes()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Failed',
          detail: error.response?.data?.error || 'Publish failed',
          life: 5000
        })
        await loadEpisodes()
      } finally {
        mixcloudUploading[episode._id] = false
      }
    }
  })
}

// ==================== PREVIEW ====================
const previewAudio = (ep) => {
  previewEpisode.value = ep;
  previewDialog.value = true
}
const closePreview = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
  }
  ;previewDialog.value = false;
  previewEpisode.value = null
}
const downloadAudio = async () => {
  if (!previewEpisode.value) return
  const url = getAudioUrl(previewEpisode.value._id)
  const link = document.createElement('a');
  link.href = url;
  link.download = `${previewEpisode.value.title}.mp3`;
  link.click()
}

// ==================== HELPERS ====================
const getImageUrl = (ep) => {
  if (!ep?.image?.storedFilename) return null
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')
  return `${base}/uploads/episodes/images/${ep.image.storedFilename}`
}
const getAudioUrl = (id) => {
  const ep = episodes.value.find(e => e._id === id) || previewEpisode.value

  // Se c'è URL Cloudinary, usalo direttamente
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
const formatFileSize = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '-'
const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}) : '-'
const formatFrequency = (frequency) => {
  const map = {
    'weekly': 'Weekly',
    'biweekly': 'Bi-weekly',
    'monthly': 'Monthly',
    'onetime': 'One-time'
  }
  return map[frequency] || frequency
}
const getStatusLabel = (s) => ({
  draft: 'DRAFT',
  published: 'PUBLISHED',
  archived: 'ARCHIVED'
}[s] || s?.toUpperCase())
const getStatusSeverity = (s) => ({
  draft: 'secondary',
  published: 'success',
  archived: 'warning'
}[s] || 'info')
const truncate = (t, l) => t?.length > l ? t.substring(0, l) + '...' : t
const onSearch = () => {
}

onMounted(async () => {
  await Promise.all([loadEpisodes(), loadShows()])
})
</script>

<style scoped>
.filters-card {
  margin-bottom: 2rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 600;
  font-size: 0.875rem;
}

.episode-image-cell {
  width: 60px;
  height: 60px;
}

.episode-thumbnail {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
}

.no-image {
  width: 60px;
  height: 60px;
  background: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}

.episode-title-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.episode-title-cell .description {
  color: #6b7280;
  font-size: 0.8rem;
}

.show-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.show-cell i {
  color: #3b82f6;
}

.mixcloud-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mixcloud-na {
  color: #9ca3af;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.empty-state i {
  font-size: 3rem;
  opacity: 0.3;
}

.episode-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  font-size: 0.875rem;
}

.form-section {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-section h4 {
  margin: 0 0 1rem;
}

/* Schedule Info Box */
.schedule-info-box {
  background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.5rem;
}

.schedule-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #1e40af;
}

.schedule-header i {
  color: #3b82f6;
}

.schedule-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.schedule-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.schedule-item strong {
  color: #374151;
}

.suggested-date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef9c3;
  border-radius: 6px;
  font-size: 0.85rem;
}

.suggested-date i {
  color: #f59e0b;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-info {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.file-info p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.current-image {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.image-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  display: block;
}

.preview-section {
  padding: 1rem 0;
}

.preview-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.preview-image {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.preview-info h3 {
  margin: 0 0 0.5rem;
}

.show-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  margin: 0;
}

.audio-player {
  margin-top: 1rem;
}

.audio-player audio {
  width: 100%;
}

.audio-info {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  margin-top: 1rem;
}

.audio-info p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.mixcloud-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f5f3ff;
  border-radius: 8px;
}

.mixcloud-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #7c3aed;
  text-decoration: none;
}

.mixcloud-link:hover {
  text-decoration: underline;
}

.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>
