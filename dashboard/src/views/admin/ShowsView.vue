<template>
  <DashboardLayout page-title="Gestione Shows">
    <template #topbar-actions>
      <Button
        label="Nuovo Show"
        icon="pi pi-plus"
        @click="openDialog()"
      />
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
              <Button label="Crea il primo show" icon="pi pi-plus" @click="openDialog()" />
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
          <Column header="Azioni" style="width: 250px;">
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
        </DataTable>
      </template>
    </Card>

    <!-- Dialog Crea/Modifica Show -->
    <Dialog
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

          <div class="form-field">
            <label for="featured">In Evidenza</label>
            <div class="checkbox-field">
              <Checkbox
                id="featured"
                v-model="formData.featured"
                :binary="true"
              />
              <label for="featured">Mostra in homepage</label>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Annulla" severity="secondary" @click="dialogVisible = false" outlined />
        <Button
          :label="editingShow ? 'Salva Modifiche' : 'Crea Show'"
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
    socialLinks: {}
  },
  image: {
    url: '',
    alt: ''
  },
  genres: [],
  tags: [],
  requestStatus: 'pending',
  status: 'active',
  featured: false
})

const genresInput = ref('')
const tagsInput = ref('')

const requestStatusOptions = [
  { label: 'In Attesa', value: 'pending' },
  { label: 'Approvato', value: 'approved' },
  { label: 'Rifiutato', value: 'rejected' }
]

const statusOptions = [
  { label: 'Attivo', value: 'active' },
  { label: 'Inattivo', value: 'inactive' },
  { label: 'Archiviato', value: 'archived' }
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
    pending: 'in attesa di approvazione',
    active: 'attivo',
    inactive: 'inattivo',
    rejected: 'rifiutato',
    all: ''
  }
  return labels[currentFilter.value] || ''
}

const getRequestStatusLabel = (status) => {
  const map = {
    pending: 'IN ATTESA',
    approved: 'APPROVATO',
    rejected: 'RIFIUTATO'
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
    active: 'ATTIVO',
    inactive: 'INATTIVO',
    archived: 'ARCHIVIATO'
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
      genres: show.genres || [],
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
  alert(`Dettagli show:\n\nTitolo: ${show.title}\nSlug: ${show.slug}\nStatus: ${show.status}\nRequest Status: ${show.requestStatus}`)
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
    await api.put(`${API_URL}/admin/shows/${show._id}/reject`, {
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
