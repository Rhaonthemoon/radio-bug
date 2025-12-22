<template>
  <div class="posts-list-container">
    <Card>
      <template #title>
        <div class="header-actions">
          <h2>Posts</h2>
          <Button
              label="Create New Post"
              icon="pi pi-plus"
              @click="$router.push('/admin/posts/create')"
          />
        </div>
      </template>

      <template #content>
        <!-- Filters -->
        <div class="filters">
          <Dropdown
              v-model="selectedStatus"
              :options="statuses"
              optionLabel="label"
              optionValue="value"
              placeholder="All Statuses"
              showClear
              @change="loadPosts"
          />

          <Dropdown
              v-model="selectedCategory"
              :options="categories"
              optionLabel="label"
              optionValue="value"
              placeholder="All Categories"
              showClear
              @change="loadPosts"
          />
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <ProgressSpinner style="width: 50px; height: 50px" />
        </div>

        <!-- Posts List -->
        <div v-else-if="posts.length > 0" class="posts-grid">
          <Card v-for="post in posts" :key="post._id" class="post-card">
            <template #header>
              <img
                :src="getImageUrl(post.image?.url)"
                :alt="post.title"
                class="post-image"
              />
              <div class="post-badges">
                <Tag
                  :value="post.status"
                  :severity="getStatusSeverity(post.status)"
                />
                <Tag
                  v-if="post.featured"
                  value="Featured"
                  severity="success"
                  icon="pi pi-star-fill"
                />
              </div>
            </template>

            <template #title>
              {{ post.title }}
            </template>

            <template #subtitle>
              <div class="post-meta">
                <span><i class="pi pi-tag"></i> {{ post.category }}</span>
                <span><i class="pi pi-user"></i> {{ post.author?.name }}</span>
                <span><i class="pi pi-calendar"></i> {{ formatDate(post.createdAt) }}</span>
              </div>
            </template>

            <template #content>
              <p class="post-excerpt">
                {{ post.excerpt || truncateText(post.content, 150) }}
              </p>
            </template>

            <template #footer>
              <div class="post-actions">
                <Button
                    label="Edit"
                    icon="pi pi-pencil"
                    text
                    @click="editPost(post._id)"
                />
                <Button
                    label="Delete"
                    icon="pi pi-trash"
                    text
                    severity="danger"
                    @click="confirmDelete(post)"
                />
              </div>
            </template>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state">
          <i class="pi pi-inbox" style="font-size: 4rem; color: #9ca3af;"></i>
          <p>No posts found</p>
          <Button
              label="Create Your First Post"
              icon="pi pi-plus"
              @click="$router.push('/admin/posts/create')"
          />
        </div>
      </template>
    </Card>

    <!-- Delete Confirmation Dialog -->
    <Dialog
        v-model:visible="deleteDialog"
        header="Confirm Delete"
        :modal="true"
        :style="{ width: '450px' }"
    >
      <div class="confirmation-content">
        <i class="pi pi-exclamation-triangle" style="font-size: 3rem; color: #ef4444;"></i>
        <p>Are you sure you want to delete this post?</p>
        <p><strong>{{ postToDelete?.title }}</strong></p>
        <p style="color: #6b7280; font-size: 0.875rem;">This action cannot be undone.</p>
      </div>

      <template #footer>
        <Button
            label="Cancel"
            icon="pi pi-times"
            text
            @click="deleteDialog = false"
        />
        <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            :loading="deleting"
            @click="deletePost"
        />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'

const router = useRouter()
const toast = useToast()

const posts = ref([])
const loading = ref(false)
const deleteDialog = ref(false)
const deleting = ref(false)
const postToDelete = ref(null)
const selectedStatus = ref(null)
const selectedCategory = ref(null)

const statuses = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' }
]

const categories = [
  { label: 'News', value: 'news' },
  { label: 'Event', value: 'event' },
  { label: 'Announcement', value: 'announcement' },
  { label: 'Blog', value: 'blog' }
]

onMounted(() => {
  loadPosts()
})

const loadPosts = async () => {
  loading.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const token = localStorage.getItem('token')

    let url = `${apiUrl}/posts/admin/all`
    const params = new URLSearchParams()

    if (selectedStatus.value) params.append('status', selectedStatus.value)
    if (selectedCategory.value) params.append('category', selectedCategory.value)

    if (params.toString()) url += `?${params.toString()}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) throw new Error('Failed to load posts')

    posts.value = await response.json()

  } catch (error) {
    console.error('Error loading posts:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load posts',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const editPost = (id) => {
  router.push(`/admin/posts/edit/${id}`)
}

const confirmDelete = (post) => {
  postToDelete.value = post
  deleteDialog.value = true
}

const deletePost = async () => {
  deleting.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const token = localStorage.getItem('token')

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

    deleteDialog.value = false
    loadPosts()

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
  const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  return url ? `${apiUrl}${url}` : '/placeholder-image.jpg'
}

const getStatusSeverity = (status) => {
  switch (status) {
    case 'published': return 'success'
    case 'draft': return 'warning'
    case 'archived': return 'secondary'
    default: return 'info'
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const truncateText = (text, length) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}
</script>

<style scoped>
.posts-list-container {
  padding: 2rem;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions h2 {
  margin: 0;
}

.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 4rem 0;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.post-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.post-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-badges {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 0.5rem;
}

.post-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.post-meta span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.post-excerpt {
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.post-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-state p {
  margin: 1rem 0 2rem;
  color: #6b7280;
  font-size: 1.125rem;
}

.confirmation-content {
  text-align: center;
  padding: 1rem 0;
}

.confirmation-content p {
  margin: 1rem 0 0.5rem;
}

@media (max-width: 768px) {
  .posts-grid {
    grid-template-columns: 1fr;
  }

  .filters {
    flex-direction: column;
  }
}
</style>
