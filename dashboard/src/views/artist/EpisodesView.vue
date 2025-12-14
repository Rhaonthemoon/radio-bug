<template>
  <DashboardLayout page-title="Episodes Management">
    <template #topbar-actions>
      <!-- Mostra il messaggio per gli artisti che non possono gestire episodi -->
      <Message v-if="isArtist" severity="info" :closable="false" style="margin: 0;">
        Episodes are managed by admin
      </Message>
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

          <!-- Mostra azioni solo per admin -->
          <Column v-if="!isArtist" header="Actions" style="width: 150px;">
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
                    severity="secondary"
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

          <!-- Per artisti mostra solo colonna "View" -->
          <Column v-else header="View" style="width: 80px;">
            <template #body="{ data }">
              <Button
                  icon="pi pi-eye"
                  @click="viewEpisode(data)"
                  v-tooltip.top="'View Details'"
                  text
                  rounded
              />
            </template>
          </Column>

          <template #empty>
            <div class="empty-state">
              <i class="pi pi-play-circle"></i>
              <p v-if="isArtist">No episodes found for your shows</p>
              <p v-else>No episodes found</p>
              <Button
                  v-if="!isArtist"
                  label="Create First Episode"
                  icon="pi pi-plus"
                  @click="openCreateDialog"
              />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Create/Edit Episode Dialog (SOLO ADMIN) -->
    <Dialog
        v-if="!isArtist"
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

    <!-- View Episode Dialog (PER ARTISTI) -->
    <Dialog
        v-if="isArtist"
        v-model:visible="viewDialog"
        header="Episode Details"
        modal
        :style="{ width: '600px' }"
    >
      <div class="episode-details" v-if="viewingEpisode">
        <div class="detail-section">
          <h3>{{ viewingEpisode.title }}</h3>
          <p class="show-name">
            <i class="pi pi-microphone"></i> {{ viewingEpisode.showId?.title }}
          </p>
        </div>

        <div class="detail-section" v-if="viewingEpisode.description">
          <h4>Description</h4>
          <p>{{ viewingEpisode.description }}</p>
        </div>

        <div class="detail-section">
          <div class="detail-row">
            <div>
              <h4>Air Date</h4>
              <p>{{ formatDate(viewingEpisode.airDate) }}</p>
            </div>
            <div>
              <h4>Duration</h4>
              <p>{{ formatDuration(viewingEpisode.duration) }}</p>
            </div>
            <div>
              <h4>Status</h4>
              <Tag
                  :value="getStatusLabel(viewingEpisode.status)"
                  :severity="getStatusSeverity(viewingEpisode.status)"
              />
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="viewingEpisode.externalLinks">
          <h4>External Links</h4>
          <div class="external-links">
            <a v-if="viewingEpisode.externalLinks.mixcloudUrl"
               :href="viewingEpisode.externalLinks.mixcloudUrl"
               target="_blank">
              <i class="pi pi-cloud"></i> Mixcloud
            </a>
            <a v-if="viewingEpisode.externalLinks.youtubeUrl"
               :href="viewingEpisode.externalLinks.youtubeUrl"
               target="_blank">
              <i class="pi pi-youtube"></i> YouTube
            </a>
            <a v-if="viewingEpisode.externalLinks.spotifyUrl"
               :href="viewingEpisode.externalLinks.spotifyUrl"
               target="_blank">
              <i class="pi pi-spotify"></i> Spotify
            </a>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Close" @click="viewDialog = false" />
      </template>
    </Dialog>

    <!-- Upload Audio Dialog (SOLO ADMIN) -->
    <Dialog
        v-if="!isArtist"
        v-model:visible="uploadDialog"
        header="Upload Audio File"
        modal
        :style="{ width: '500px' }"
    >
      <div class="upload-section">
        <p v-if="selectedEpisode">
          <strong>Episode:</strong> {{ selectedEpisode.title }}
        </p>

        <FileUpload
            mode="basic"
            name="audio"
            accept="audio/*"
            :maxFileSize="500000000"
            @select="onFileSelect"
            :auto="false"
            chooseLabel="Select Audio File"
        />

        <div v-if="uploadProgress > 0" class="upload-progress">
          <ProgressBar :value="uploadProgress" />
          <small>Uploading... {{ uploadProgress }}%</small>
        </div>
      </div>

      <template #footer>
        <Button
            label="Cancel"
            @click="uploadDialog = false"
            text
            :disabled="uploading"
        />
        <Button
            label="Upload"
            @click="uploadAudio"
            :loading="uploading"
            :disabled="!selectedFile"
        />
      </template>
    </Dialog>

    <Toast />
    <ConfirmDialog />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/axios'
import DashboardLayout from '@/components/DashboardLayout.vue'

const confirm = useConfirm()
const toast = useToast()
const authStore = useAuthStore()

// Check if user is artist
const isArtist = computed(() => authStore.user?.role === 'artist')

const loading = ref(false)
const saving = ref(false)
const episodes = ref([])
const shows = ref([])
const searchQuery = ref('')
const episodeDialog = ref(false)
const viewDialog = ref(false)
const uploadDialog = ref(false)
const editingEpisode = ref(null)
const viewingEpisode = ref(null)
const selectedEpisode = ref(null)
const selectedFile = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)

const filters = ref({
  showId: null,
  status: null
})

const episodeForm = ref({
  showId: '',
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

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' }
]

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
    showId: episode.showId?._id || episode.showId,
    title: episode.title,
    description: episode.description || '',
    airDate: episode.airDate ? new Date(episode.airDate) : null,
    duration: episode.duration,
    status: episode.status,
    externalLinks: {
      mixcloudUrl: episode.externalLinks?.mixcloudUrl || '',
      youtubeUrl: episode.externalLinks?.youtubeUrl || '',
      spotifyUrl: episode.externalLinks?.spotifyUrl || ''
    }
  }
  episodeDialog.value = true
}

const viewEpisode = (episode) => {
  viewingEpisode.value = episode
  viewDialog.value = true
}

const resetForm = () => {
  episodeForm.value = {
    showId: '',
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

  if (!episodeForm.value.title) {
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
}

const onFileSelect = (event) => {
  selectedFile.value = event.files[0]
}

const uploadAudio = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  uploadProgress.value = 0

  const formData = new FormData()
  formData.append('audio', selectedFile.value)
  formData.append('episodeId', selectedEpisode.value._id)

  try {
    await api.post('/upload/episode', formData, {
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

const formatDuration = (minutes) => {
  if (!minutes) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
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

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

/* Episode Details (Artist View) */
.episode-details {
  padding: 1rem 0;
}

.detail-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h3 {
  margin: 0 0 0.5rem;
  color: #1f2937;
  font-size: 1.5rem;
}

.detail-section h4 {
  margin: 0 0 0.5rem;
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
}

.detail-section p {
  margin: 0;
  color: #1f2937;
  line-height: 1.6;
}

.show-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280 !important;
  font-size: 0.95rem;
}

.show-name i {
  color: #3b82f6;
}

.detail-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.external-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.external-links a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.95rem;
}

.external-links a:hover {
  text-decoration: underline;
}

.w-full {
  width: 100%;
}
</style>