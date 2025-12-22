<template>
  <DashboardLayout page-title="My Show Requests">
    <template #topbar-actions>
      <Button
          label="New Request"
          icon="pi pi-plus"
          @click="$router.push('/artist/request')"
      />
    </template>

    <!-- Welcome Message if no requests -->
    <Card class="welcome-card" v-if="artistStore.myRequests.length === 0">
      <template #content>
        <div class="empty-state-large">
          <i class="pi pi-microphone" style="font-size: 4rem; color: #cbd5e1;"></i>
          <h2>Welcome to BUG Radio! 🎵</h2>
          <p>You haven't requested any shows yet.</p>
          <p>Click the button below to submit your program!</p>
          <Button
              label="Request Your Show"
              icon="pi pi-plus"
              size="large"
              @click="$router.push('/artist/request')"
              class="cta-button"
          />
        </div>
      </template>
    </Card>

    <template v-else>
      <!-- Stats Cards -->
      <div class="stats-grid">
        <Card class="stat-card">
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <h3>Total Requests</h3>
                <p>{{ artistStore.myRequests.length }}</p>
              </div>
              <i class="pi pi-list stat-icon"></i>
            </div>
          </template>
        </Card>

        <Card class="stat-card pending">
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <h3>Pending</h3>
                <p>{{ artistStore.pendingCount }}</p>
              </div>
              <i class="pi pi-clock stat-icon"></i>
            </div>
          </template>
        </Card>

        <Card class="stat-card approved">
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <h3>Approved</h3>
                <p>{{ artistStore.approvedCount }}</p>
              </div>
              <i class="pi pi-check-circle stat-icon"></i>
            </div>
          </template>
        </Card>

        <Card class="stat-card rejected">
          <template #content>
            <div class="stat-content">
              <div class="stat-info">
                <h3>Rejected</h3>
                <p>{{ rejectedCount }}</p>
              </div>
              <i class="pi pi-times-circle stat-icon"></i>
            </div>
          </template>
        </Card>
      </div>

      <!-- ✅ AGGIORNATO: Messaggio per show approvati con link a Episodes -->
      <Message v-if="artistStore.approvedCount > 0" severity="success" :closable="false" class="info-message">
        <div class="message-content">
          <i class="pi pi-check-circle"></i>
          <div>
            <strong>Congratulations!</strong> You have {{ artistStore.approvedCount }} {{ artistStore.approvedCount === 1 ? 'approved show' : 'approved shows' }}.
            <br>
            <strong>✨ You can now manage your episodes!</strong>
            <Button
                label="Go to Episodes"
                icon="pi pi-play-circle"
                @click="$router.push('/artist/episodes')"
                size="small"
                class="mt-2"
            />
          </div>
        </div>
      </Message>

      <!-- Requests Table -->
      <Card>
        <template #title>
          <div class="card-title-actions">
            <span>My Shows</span>
            <Button
                label="New Request"
                icon="pi pi-plus"
                size="small"
                @click="$router.push('/artist/request')"
            />
          </div>
        </template>

        <template #content>
          <DataTable
              :value="artistStore.myRequests"
              :loading="artistStore.loading"
              paginator
              :rows="10"
              stripedRows
              sortField="createdAt"
              :sortOrder="-1"
          >
            <Column field="title" header="Show Title" sortable style="min-width: 200px;"></Column>
            <Column field="artist.name" header="Artist Name" sortable></Column>
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
            <Column field="requestStatus" header="Status" sortable>
              <template #body="slotProps">
                <Tag
                    :value="getStatusLabel(slotProps.data.requestStatus)"
                    :severity="getStatusSeverity(slotProps.data.requestStatus)"
                />
              </template>
            </Column>
            <Column field="createdAt" header="Request Date" sortable>
              <template #body="slotProps">
                {{ formatDate(slotProps.data.createdAt) }}
              </template>
            </Column>
            <Column header="Actions" style="width: 120px;">
              <template #body="slotProps">
                <Button
                    icon="pi pi-eye"
                    rounded
                    outlined
                    severity="info"
                    @click="viewDetails(slotProps.data)"
                    v-tooltip.top="'Details'"
                />
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </template>

    <!-- Details Dialog -->
    <Dialog
        v-model:visible="detailsVisible"
        header="Show Request Details"
        :modal="true"
        :style="{ width: '700px' }"
        :maximizable="true"
    >
      <div class="details-content" v-if="selectedRequest">
        <!-- Status Badge -->
        <div class="status-banner" :class="'status-' + selectedRequest.requestStatus">
          <Tag
              :value="getStatusLabel(selectedRequest.requestStatus)"
              :severity="getStatusSeverity(selectedRequest.requestStatus)"
              style="font-size: 1.1rem; padding: 0.5rem 1rem;"
          />
        </div>

        <!-- Show Image -->
        <div class="detail-section" v-if="selectedRequest.image?.url">
          <h3>📻 Show Image</h3>
          <div class="image-preview-detail">
            <img :src="selectedRequest.image.url" :alt="selectedRequest.title" />
          </div>
        </div>

        <!-- Show Info -->
        <div class="detail-section">
          <h3>Show Information</h3>
          <p><strong>Title:</strong> {{ selectedRequest.title }}</p>
          <p><strong>Description:</strong></p>
          <p class="description-text">{{ selectedRequest.description }}</p>
          <p><strong>Genres:</strong> {{ selectedRequest.genres?.join(', ') }}</p>
          <p v-if="selectedRequest.tags?.length"><strong>Tags:</strong> {{ selectedRequest.tags.join(', ') }}</p>
        </div>

        <!-- Artist Info -->
        <div class="detail-section">
          <h3>Artist</h3>
          <div v-if="selectedRequest.artist?.photo" style="margin-bottom: 1rem;">
            <img :src="selectedRequest.artist.photo" :alt="selectedRequest.artist.name" class="artist-photo" />
          </div>
          <p><strong>Name:</strong> {{ selectedRequest.artist.name }}</p>
          <p><strong>Email:</strong> {{ selectedRequest.artist.email }}</p>
          <p><strong>Bio:</strong></p>
          <p class="description-text">{{ selectedRequest.artist.bio }}</p>

          <!-- Social Links -->
          <div v-if="hasSocialLinks(selectedRequest)" style="margin-top: 1rem;">
            <p><strong>Social:</strong></p>
            <div class="social-links">
              <a v-if="selectedRequest.artist.socialLinks?.instagram" :href="selectedRequest.artist.socialLinks.instagram" target="_blank">
                <i class="pi pi-instagram"></i> Instagram
              </a>
              <a v-if="selectedRequest.artist.socialLinks?.soundcloud" :href="selectedRequest.artist.socialLinks.soundcloud" target="_blank">
                <i class="pi pi-cloud"></i> Soundcloud
              </a>
              <a v-if="selectedRequest.artist.socialLinks?.mixcloud" :href="selectedRequest.artist.socialLinks.mixcloud" target="_blank">
                <i class="pi pi-cloud"></i> Mixcloud
              </a>
            </div>
          </div>
        </div>

        <!-- Schedule -->
        <div class="detail-section">
          <h3>📅 Schedule</h3>
          <p><strong>Day:</strong> {{ selectedRequest.schedule.dayOfWeek }}</p>
          <p><strong>Time:</strong> {{ selectedRequest.schedule.timeSlot }}</p>
        </div>

        <!-- Admin Response -->
        <div class="detail-section" v-if="selectedRequest.requestStatus !== 'pending'">
          <h3>💬 Admin Response</h3>
          <p v-if="selectedRequest.adminNotes" class="admin-notes">{{ selectedRequest.adminNotes }}</p>
          <p v-else class="no-notes">No notes from admin</p>
        </div>

        <!-- System Info -->
        <div class="detail-section">
          <h3>📊 Info</h3>
          <p><strong>Request Date:</strong> {{ formatDate(selectedRequest.createdAt) }}</p>
          <p><strong>Last Update:</strong> {{ formatDate(selectedRequest.updatedAt) }}</p>
        </div>
      </div>

      <template #footer>
        <Button label="Close" @click="detailsVisible = false" />
      </template>
    </Dialog>

    <Toast />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useArtistStore } from '@/stores/artist.js'
import { useToast } from 'primevue/usetoast'
import DashboardLayout from '@/components/DashboardLayout.vue'

const artistStore = useArtistStore()
const toast = useToast()

const detailsVisible = ref(false)
const selectedRequest = ref(null)

const rejectedCount = computed(() =>
    artistStore.myRequests.filter(r => r.requestStatus === 'rejected').length
)

const getStatusLabel = (status) => {
  const map = {
    pending: 'PENDING',
    approved: 'APPROVED ✓',
    rejected: 'REJECTED'
  }
  return map[status] || status
}

const getStatusSeverity = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const hasSocialLinks = (request) => {
  const links = request.artist?.socialLinks
  return links && (links.instagram || links.soundcloud || links.mixcloud)
}

const viewDetails = (request) => {
  selectedRequest.value = request
  detailsVisible.value = true
}

onMounted(async () => {
  try {
    await artistStore.fetchMyRequests()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error loading requests',
      life: 3000
    })
  }
})
</script>

<style scoped>
/* Stessi stili del file originale */
.welcome-card {
  margin-bottom: 2rem;
}

.empty-state-large {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state-large h2 {
  margin: 1rem 0;
  color: #1f2937;
}

.empty-state-large p {
  margin: 0.5rem 0;
  color: #6b7280;
  font-size: 1.1rem;
}

.cta-button {
  margin-top: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  border-left: 4px solid #3b82f6;
}

.stat-card.pending {
  border-left-color: #f59e0b;
}

.stat-card.approved {
  border-left-color: #10b981;
}

.stat-card.rejected {
  border-left-color: #ef4444;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
}

.stat-info p {
  margin: 0;
  font-size: 2rem;
  font-weight: bold;
  color: #1f2937;
}

.stat-icon {
  font-size: 2.5rem;
  opacity: 0.2;
  color: #3b82f6;
}

.info-message {
  margin-bottom: 2rem;
}

.message-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.message-content i {
  font-size: 1.5rem;
  margin-top: 0.25rem;
}

.card-title-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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

.details-content {
  padding: 1rem 0;
}

.status-banner {
  text-align: center;
  padding: 1rem;
  margin-bottom: 2rem;
  border-radius: 8px;
}

.status-banner.status-pending {
  background: #fef3c7;
}

.status-banner.status-approved {
  background: #d1fae5;
}

.status-banner.status-rejected {
  background: #fee2e2;
}

.detail-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h3 {
  margin: 0 0 1rem;
  color: #1f2937;
  font-size: 1.1rem;
}

.detail-section p {
  margin: 0.5rem 0;
  color: #4b5563;
}

.description-text {
  color: #1f2937;
  line-height: 1.6;
  white-space: pre-wrap;
}

.admin-notes {
  background: #fef3c7;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
  color: #92400e;
  line-height: 1.6;
  margin-top: 0.5rem;
}

.no-notes {
  color: #9ca3af;
  font-style: italic;
}

.image-preview-detail {
  margin: 1rem 0;
}

.image-preview-detail img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.artist-photo {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.social-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.social-links a {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #3b82f6;
  text-decoration: none;
}

.social-links a:hover {
  text-decoration: underline;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>