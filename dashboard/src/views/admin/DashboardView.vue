<template>
  <DashboardLayout page-title="Administrator Dashboard">
    <!-- Stats Grid -->
    <div class="stats-grid">
      <Card class="stat-card">
        <template #content>
          <div class="stat-content">
            <div class="stat-info">
              <h3>Total Shows</h3>
              <p>{{ showsStore.shows.length }}</p>
            </div>
            <i class="pi pi-microphone stat-icon"></i>
          </div>
        </template>
      </Card>

      <Card class="stat-card pending">
        <template #content>
          <div class="stat-content">
            <div class="stat-info">
              <h3>Pending Requests</h3>
              <p>{{ pendingRequestsCount }}</p>
            </div>
            <i class="pi pi-clock stat-icon"></i>
          </div>
        </template>
      </Card>

      <Card class="stat-card approved">
        <template #content>
          <div class="stat-content">
            <div class="stat-info">
              <h3>Active Shows</h3>
              <p>{{ activeShowsCount }}</p>
            </div>
            <i class="pi pi-check-circle stat-icon"></i>
          </div>
        </template>
      </Card>

      <Card class="stat-card episodes">
        <template #content>
          <div class="stat-content">
            <div class="stat-info">
              <h3>Total Episodes</h3>
              <p>{{ episodesStore.episodes.length }}</p>
            </div>
            <i class="pi pi-play-circle stat-icon"></i>
          </div>
        </template>
      </Card>

      <!-- New Posts Stats Card -->
      <Card class="stat-card posts">
        <template #content>
          <div class="stat-content">
            <div class="stat-info">
              <h3>Total Posts</h3>
              <p>{{ postsStore.posts.length }}</p>
            </div>
            <i class="pi pi-file stat-icon"></i>
          </div>
        </template>
      </Card>

      <Card class="stat-card featured">
        <template #content>
          <div class="stat-content">
            <div class="stat-info">
              <h3>Featured Posts</h3>
              <p>{{ featuredPostsCount }}</p>
            </div>
            <i class="pi pi-star-fill stat-icon"></i>
          </div>
        </template>
      </Card>
    </div>

    <!-- Quick Actions -->
    <Card class="actions-card">
      <template #title>Quick Actions</template>
      <template #content>
        <div class="quick-actions">
          <Button
            label="Manage Shows"
            icon="pi pi-microphone"
            @click="$router.push('/shows')"
            size="large"
          />
          <Button
            label="Manage Episodes"
            icon="pi pi-play-circle"
            severity="secondary"
            @click="$router.push('/episodes')"
            size="large"
          />
          <Button
            label="Manage Posts"
            icon="pi pi-file"
            severity="info"
            @click="$router.push('/admin/posts')"
            size="large"
          />
          <Button
            label="Pending Requests"
            icon="pi pi-inbox"
            severity="warning"
            @click="$router.push('/requests')"
            size="large"
            :badge="pendingRequestsCount > 0 ? pendingRequestsCount.toString() : undefined"
          />
        </div>
      </template>
    </Card>

    <!-- Recent Requests -->
    <Card v-if="recentRequests.length > 0">
      <template #title>Recent Requests</template>
      <template #content>
        <DataTable
          :value="recentRequests"
          stripedRows
        >
          <Column field="title" header="Show Title" style="min-width: 200px;"></Column>
          <Column field="artist.name" header="Artist"></Column>
          <Column field="requestStatus" header="Status">
            <template #body="slotProps">
              <Tag
                :value="getRequestStatusLabel(slotProps.data.requestStatus)"
                :severity="getRequestStatusSeverity(slotProps.data.requestStatus)"
              />
            </template>
          </Column>
          <Column field="createdAt" header="Request Date">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.createdAt) }}
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                label="View"
                icon="pi pi-arrow-right"
                text
                @click="$router.push('/requests')"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Recent Episodes -->
    <Card v-if="recentEpisodes.length > 0">
      <template #title>Recent Episodes</template>
      <template #content>
        <DataTable
          :value="recentEpisodes"
          stripedRows
        >
          <Column field="title" header="Title" style="min-width: 200px;"></Column>
          <Column field="showId.title" header="Show">
            <template #body="slotProps">
              {{ slotProps.data.showId?.title || '-' }}
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="slotProps">
              <Tag
                :value="getStatusLabel(slotProps.data.status)"
                :severity="getStatusSeverity(slotProps.data.status)"
              />
            </template>
          </Column>
          <Column field="airDate" header="Date">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.airDate) }}
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Recent Posts -->
    <Card v-if="recentPosts.length > 0">
      <template #title>Recent Posts</template>
      <template #content>
        <DataTable
          :value="recentPosts"
          stripedRows
        >
          <Column header="Image" style="width: 80px;">
            <template #body="slotProps">
              <div class="post-thumbnail">
                <img
                  v-if="slotProps.data.image?.url"
                  :src="getImageUrl(slotProps.data.image.url)"
                  :alt="slotProps.data.title"
                />
                <div v-else class="no-image">
                  <i class="pi pi-image"></i>
                </div>
              </div>
            </template>
          </Column>
          <Column field="title" header="Title" style="min-width: 200px;"></Column>
          <Column field="category" header="Category">
            <template #body="slotProps">
              <Tag
                :value="getCategoryLabel(slotProps.data.category)"
                :severity="getCategorySeverity(slotProps.data.category)"
              />
            </template>
          </Column>
          <Column field="status" header="Status">
            <template #body="slotProps">
              <Tag
                :value="getStatusLabel(slotProps.data.status)"
                :severity="getStatusSeverity(slotProps.data.status)"
              />
            </template>
          </Column>
          <Column field="createdAt" header="Date">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.createdAt) }}
            </template>
          </Column>
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                label="Edit"
                icon="pi pi-pencil"
                text
                @click="$router.push(`/admin/posts/${slotProps.data._id}`)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Toast />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useShowsStore } from '@/stores/shows.js'
import { useEpisodesStore } from '@/stores/episodes.js'
import { usePostsStore } from '@/stores/posts.js'
import { useToast } from 'primevue/usetoast'
import DashboardLayout from '../../components/DashboardLayout.vue'

const router = useRouter()
const showsStore = useShowsStore()
const episodesStore = useEpisodesStore()
const postsStore = usePostsStore()
const toast = useToast()

const pendingRequestsCount = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'pending').length
)

const activeShowsCount = computed(() =>
  showsStore.shows.filter(s => s.status === 'active').length
)

const featuredPostsCount = computed(() =>
  postsStore.posts.filter(p => p.featured === true).length
)

const recentRequests = computed(() =>
  showsStore.shows
    .filter(s => s.requestStatus === 'pending')
    .slice(0, 5)
)

const recentEpisodes = computed(() =>
  episodesStore.episodes
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
)

const recentPosts = computed(() =>
  postsStore.posts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
)

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

const getCategoryLabel = (category) => {
  const map = {
    news: 'News',
    event: 'Event',
    announcement: 'Announcement',
    blog: 'Blog'
  }
  return map[category] || category
}

const getCategorySeverity = (category) => {
  const map = {
    news: 'info',
    event: 'success',
    announcement: 'warning',
    blog: 'secondary'
  }
  return map[category] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getImageUrl = (url) => {
  if (!url) return ''

  const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

  if (url.startsWith('http')) {
    return url
  }

  return `${apiUrl}${url}`
}

onMounted(async () => {
  try {
    await Promise.all([
      showsStore.fetchShows(),
      episodesStore.fetchEpisodes(),
      postsStore.fetchPosts()
    ])
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error loading data',
      life: 3000
    })
  }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.stat-card.episodes {
  border-left-color: #8b5cf6;
}

.stat-card.posts {
  border-left-color: #06b6d4;
}

.stat-card.featured {
  border-left-color: #f59e0b;
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
  font-weight: 600;
}

.stat-info p {
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
  color: #1f2937;
}

.stat-icon {
  font-size: 3rem;
  opacity: 0.15;
  color: #3b82f6;
}

.actions-card {
  margin-bottom: 2rem;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.post-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.post-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  color: #9ca3af;
}

.no-image i {
  font-size: 1.5rem;
}
</style>
