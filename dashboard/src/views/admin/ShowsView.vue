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
          <Column header="Actions" style="width: 250px;">
            <template #body="slotProps">
              <div class="action-buttons">
                <!-- Azioni per richieste pending -->
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

                <!-- Azioni standard -->
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

    <!-- Dialog Crea/Modifica Show -->
    <Dialog
      v-model:visible="dialogVisible"
      :header="editingShow ? 'Edit Show' : 'New Show'"
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
          <h3>Generi e Tags</h3>

          <div class="form-field">
            <label for="genres">Generi (separati da virgola)</label>
            <InputText
              id="genres"
              v-model="genresInput"
              placeholder="Ambient, Experimental, Drone"
              class="w-full"
            />
            <small>Enter genres separated by comma</small>
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
          <h3>Impostazioni</h3>

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
      youtube: '',      // ← AGGIUNGI
      bandcamp: '',     // ← AGGIUNGI
      website: ''       // ← AGGIUNGI
    }
  },
  image: {
    url: '',
    alt: ''
  },
  genre: [],
  tags: [],
  requestStatus: 'pending',
  status: 'active',
  featured: false
})
const genresInput = ref('')
const tagsInput = ref('')

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
    genre: genresInput.value.split(',').map(g => g.trim()).filter(g => g),
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
      summary: 'Error',
      detail: showsStore.error || 'Errore durante il salvataggio',
      life: 3000
    })
  }
}

const viewShow = (show) => {
  alert(`Dettagli show:\n\nTitolo: ${show.title}\nSlug: ${show.slug}\nStatus: ${show.status}\nRequest Status: ${show.requestStatus}`)
}

const approveRequest = async (show) => {
  confirm.require({
    message: `Vuoi approvare lo show "${show.title}" di ${show.artist.name}?`,
    header: 'Approve Request',
    icon: 'pi pi-check-circle',
    acceptLabel: 'Sì, approva',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-success',
    accept: async () => {
      try {
        await api.put(`${API_URL}/shows/admin/${show._id}/approve`, {
          adminNote: 'Show approvato! Benvenuto su BUG Radio 🎵'
      })

        toast.add({
          severity: 'success',
          summary: 'Show Approved!',
          detail: `"${show.title}" è stato approvato e attivato`,
          life: 4000
        })

        await showsStore.fetchShows()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
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
    await api.put(`${API_URL}/admin/shows/${show._id}/reject`, {
      adminNote: rejectReason
  })

    toast.add({
      severity: 'info',
      summary: 'Show Rejected',
      detail: `"${show.title}" è stato rifiutato`,
      life: 3000
    })

    await showsStore.fetchShows()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Errore nel rifiuto',
      life: 3000
    })
  }
}

const confirmDelete = (show) => {
  confirm.require({
    message: `Sei sicuro di voler eliminare "${show.title}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sì, elimina',
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
      summary: 'Show eliminato',
      detail: 'Lo show è stato eliminato',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
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
      summary: 'Error',
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
.form-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.form-section h3 {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.section-description {
  margin: 0 0 1.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.social-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.form-field label i {
  margin-right: 0.5rem;
}
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
