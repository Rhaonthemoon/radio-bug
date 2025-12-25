<template>
  <DashboardLayout page-title="Posts Management">
    <template #topbar-actions>
      <Button
        label="New Post"
        icon="pi pi-plus"
        @click="goToCreatePost"
      />
    </template>

    <!-- Debug Info -->
    <Card v-if="showDebug" class="debug-card">
      <template #content>
        <div style="font-family: monospace; font-size: 12px;">
          <p><strong>Debug Info:</strong></p>
          <p>Posts loaded: {{ posts.length }}</p>
          <p>Loading: {{ loading }}</p>
          <p>API URL: {{ apiUrl }}</p>
          <p>Token exists: {{ !!token }}</p>
          <p>Filtered posts: {{ filteredPosts.length }}</p>
          <Button label="Toggle Debug" @click="showDebug = false" size="small" />
        </div>
      </template>
    </Card>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters">
          <div class="filter-group">
            <label>Category</label>
            <Dropdown
              v-model="filters.category"
              :options="categoryOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Categories"
              showClear
              @change="loadPosts"
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
              @change="loadPosts"
              class="w-full"
            />
          </div>

          <div class="filter-group">
            <label>Search</label>
            <InputText
              v-model="searchQuery"
              placeholder="Search posts..."
              @input="onSearch"
              class="w-full"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Posts Table -->
    <Card>
      <template #content>
        <DataTable
          :value="filteredPosts"
          :loading="loading"
          stripedRows
          paginator
          :rows="10"
          :rowsPerPageOptions="[5, 10, 20, 50]"
          paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          responsiveLayout="scroll"
        >
          <Column header="Image" style="width: 100px;">
            <template #body="{ data }">
              <div class="post-image-cell">
                <img
                  v-if="data.image?.url"
                  :src="getImageUrl(data.image.url)"
                  :alt="data.title"
                  @error="handleImageError"
                />
                <div v-else class="no-image">
                  <i class="pi pi-image"></i>
                </div>
              </div>
            </template>
          </Column>

          <Column field="title" header="Title" sortable style="min-width: 250px;">
            <template #body="{ data }">
              <div class="post-title-cell">
                <strong>{{ data.title }}</strong>
                <small v-if="data.excerpt" class="excerpt">
                  {{ truncate(data.excerpt, 80) }}
                </small>
              </div>
            </template>
          </Column>

          <Column field="category" header="Category" sortable>
            <template #body="{ data }">
              <Tag
                :value="getCategoryLabel(data.category)"
                :severity="getCategorySeverity(data.category)"
              />
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

          <Column field="featured" header="Featured" style="width: 100px;">
            <template #body="{ data }">
              <i
                v-if="data.featured"
                class="pi pi-star-fill"
                style="color: #f59e0b; font-size: 1.2rem;"
              ></i>
              <span v-else style="color: #d1d5db;">—</span>
            </template>
          </Column>

          <Column field="createdAt" header="Created" sortable>
            <template #body="{ data }">
              {{ formatDate(data.createdAt) }}
            </template>
          </Column>

          <Column header="Actions" style="width: 150px;">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-pencil"
                  @click="goToEditPost(data._id)"
                  v-tooltip.top="'Edit'"
                  text
                  rounded
                />
                <Button
                  icon="pi pi-eye"
                  @click="previewPostFn(data)"
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
              <i class="pi pi-file"></i>
              <p>No posts found</p>
              <p style="font-size: 12px; color: #999;">{{ emptyStateMessage }}</p>
              <Button
                label="Create First Post"
                icon="pi pi-plus"
                @click="goToCreatePost"
              />
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <!-- Preview Dialog -->
    <Dialog
      v-model:visible="previewDialog"
      :header="selectedPost?.title"
      modal
      :style="{ width: '800px' }"
    >
      <div v-if="selectedPost" class="preview-section">
        <!-- Image -->
        <div v-if="selectedPost.image?.url" class="preview-image">
          <img
            :src="getImageUrl(selectedPost.image.url)"
            :alt="selectedPost.title"
          />
        </div>

        <!-- Meta Info -->
        <div class="preview-meta">
          <Tag
            :value="getCategoryLabel(selectedPost.category)"
            :severity="getCategorySeverity(selectedPost.category)"
          />
          <Tag
            :value="getStatusLabel(selectedPost.status)"
            :severity="getStatusSeverity(selectedPost.status)"
          />
          <Tag v-if="selectedPost.featured" value="Featured" severity="warning" />
          <span class="preview-date">{{ formatDate(selectedPost.createdAt) }}</span>
        </div>

        <!-- Excerpt -->
        <div v-if="selectedPost.excerpt" class="preview-excerpt">
          {{ selectedPost.excerpt }}
        </div>

        <!-- Content -->
        <div class="preview-content">
          {{ selectedPost.content }}
        </div>
      </div>

      <template #footer>
        <Button
          label="Edit Post"
          icon="pi pi-pencil"
          @click="editPreviewedPost"
        />
        <Button
          label="Close"
          severity="secondary"
          @click="previewDialog = false"
          outlined
        />
      </template>
    </Dialog>

    <!-- Delete Confirmation -->
    <Dialog
      v-model:visible="deleteDialog"
      header="Confirm Delete"
      modal
      :style="{ width: '450px' }"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle" style="font-size: 3rem; color: #ef4444;"></i>
        <p>
          Are you sure you want to delete <strong>{{ postToDelete?.title }}</strong>?
        </p>
        <p class="warning-text">This action cannot be undone.</p>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          @click="deleteDialog = false"
          outlined
        />
        <Button
          label="Delete"
          severity="danger"
          @click="deletePost"
          :loading="deleting"
        />
      </template>
    </Dialog>

    <Toast />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DashboardLayout from '@/components/DashboardLayout.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const deleting = ref(false)
const posts = ref([])
const searchQuery = ref('')
const previewDialog = ref(false)
const deleteDialog = ref(false)
const selectedPost = ref(null)
const postToDelete = ref(null)
const showDebug = ref(true)
const emptyStateMessage = ref('')

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const token = localStorage.getItem('token')

const filters = ref({
  category: null,
  status: null
})

const categoryOptions = [
  { label: 'News', value: 'news' },
  { label: 'Event', value: 'event' },
  { label: 'Announcement', value: 'announcement' },
  { label: 'Blog', value: 'blog' }
]

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' }
]

const filteredPosts = computed(() => {
  let result = posts.value

  // Filter by category
  if (filters.value.category) {
    result = result.filter(p => p.category === filters.value.category)
  }

  // Filter by status
  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status)
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.excerpt?.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query)
    )
  }

  return result
})

const loadPosts = async () => {
  loading.value = true
  emptyStateMessage.value = 'Loading...'

  try {
    console.log('🔍 Loading posts from:', `${apiUrl}/posts`)
    console.log('🔑 Token exists:', !!token)

    const response = await fetch(`${apiUrl}/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('📡 Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      throw new Error(`Failed to load posts: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Raw data received:', data)
    console.log('✅ Data type:', typeof data)
    console.log('✅ Is array:', Array.isArray(data))

    // Il backend può restituire:
    // 1. Un array diretto: [post1, post2, ...]
    // 2. Un oggetto con posts: {posts: [post1, post2, ...], pagination: {...}}
    if (Array.isArray(data)) {
      posts.value = data
      console.log('✅ Posts set from array:', posts.value.length, 'posts')
    } else if (data && Array.isArray(data.posts)) {
      posts.value = data.posts
      console.log('✅ Posts extracted from object:', posts.value.length, 'posts')
      console.log('📊 Pagination:', data.pagination)
    } else {
      console.error('❌ Unexpected data format:', data)
      posts.value = []
      throw new Error('Unexpected response format')
    }

    emptyStateMessage.value = posts.value.length === 0 ? 'No posts in database' : ''

    if (posts.value.length > 0) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Loaded ${posts.value.length} posts`,
        life: 2000
      })
    }

  } catch (error) {
    console.error('❌ Error loading posts:', error)
    emptyStateMessage.value = `Error: ${error.message}`

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to load posts',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

const goToCreatePost = () => {
  console.log('🚀 Navigating to create post...')
  router.push('/admin/posts/new')
    .then(() => console.log('✅ Navigation successful'))
    .catch(err => console.error('❌ Navigation error:', err))
}

const goToEditPost = (id) => {
  console.log('✏️ Navigating to edit post:', id)
  router.push(`/admin/posts/${id}`)
    .then(() => console.log('✅ Navigation successful'))
    .catch(err => console.error('❌ Navigation error:', err))
}

const previewPostFn = (post) => {
  selectedPost.value = post
  previewDialog.value = true
}

const editPreviewedPost = () => {
  router.push(`/admin/posts/${selectedPost.value._id}`)
  previewDialog.value = false
}

const confirmDelete = (post) => {
  postToDelete.value = post
  deleteDialog.value = true
}

const deletePost = async () => {
  deleting.value = true

  try {
    const response = await fetch(`${apiUrl}/posts/${postToDelete.value._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) throw new Error('Failed to delete post')

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Post deleted successfully',
      life: 3000
    })

    await loadPosts()
    deleteDialog.value = false

  } catch (error) {
    console.error('Error deleting post:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete post',
      life: 3000
    })
  } finally {
    deleting.value = false
  }
}

const getImageUrl = (url) => {
  if (!url) return ''

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

  if (url.startsWith('http')) {
    return url
  }

  return `${backendUrl}${url}`
}

const handleImageError = (event) => {
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
}

const onSearch = () => {
  // Debounce can be added here if needed
}

// Utility functions
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

const truncate = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

// Lifecycle
onMounted(() => {
  console.log('🎬 PostsView mounted')
  console.log('📍 API URL:', apiUrl)
  console.log('🔐 Token exists:', !!token)
  loadPosts()
})
</script>

<style scoped>
.debug-card {
  margin-bottom: 1rem;
  background: #fef3c7;
  border: 2px solid #f59e0b;
}

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

.post-image-cell {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
}

.post-image-cell img {
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
  font-size: 2rem;
}

.post-title-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.post-title-cell .excerpt {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.4;
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
  margin: 0.5rem 0;
  font-size: 1.125rem;
}

/* Preview Styles */
.preview-section {
  padding: 1rem 0;
}

.preview-image {
  margin-bottom: 1.5rem;
  border-radius: 8px;
  overflow: hidden;
  max-height: 400px;
}

.preview-image img {
  width: 100%;
  height: auto;
  display: block;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.preview-date {
  color: #6b7280;
  font-size: 0.875rem;
}

.preview-excerpt {
  font-size: 1.1rem;
  font-style: italic;
  color: #4b5563;
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.preview-content {
  color: #1f2937;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* Delete Confirmation */
.confirmation-content {
  text-align: center;
  padding: 1rem 0;
}

.confirmation-content i {
  display: block;
  margin: 0 auto 1rem;
}

.confirmation-content p {
  margin: 0.75rem 0;
  font-size: 1rem;
  color: #374151;
}

.warning-text {
  color: #dc2626;
  font-size: 0.9rem;
  font-weight: 600;
}

.w-full {
  width: 100%;
}
</style>
