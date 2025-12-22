<template>
  <div class="post-form-container">
    <Card>
      <template #title>
        <div class="header-actions">
          <h2>{{ isEditMode ? 'Edit Post' : 'Create New Post' }}</h2>
          <Button
            icon="pi pi-times"
            text
            rounded
            @click="$router.back()"
          />
        </div>
      </template>

      <template #content>
        <form @submit.prevent="handleSubmit">
          <!-- Image Upload -->
          <div class="form-field">
            <label>Image {{ isEditMode ? '' : '*' }}</label>

            <!-- Image Preview with Actions -->
            <div v-if="imagePreview || formData.image" class="image-section">
              <div class="image-preview">
                <img
                  :src="getImagePreviewUrl()"
                  alt="Preview"
                  @error="handleImageError"
                />
              </div>

              <div class="image-actions">
                <Button
                  label="Change Image"
                  icon="pi pi-refresh"
                  @click="$refs.fileInput.click()"
                  outlined
                  size="small"
                />
                <Button
                  label="Remove"
                  icon="pi pi-trash"
                  severity="danger"
                  @click="removeImage"
                  outlined
                  size="small"
                />
              </div>

              <small v-if="isEditMode && formData.image && !imagePreview" class="image-info">
                📎 Current: {{ formData.image?.originalName || 'image file' }}
              </small>
              <small v-if="imagePreview" class="image-info success">
                ✅ New image selected
              </small>
            </div>

            <!-- Upload Area (no image) -->
            <div v-else class="upload-area" @click="$refs.fileInput.click()">
              <i class="pi pi-cloud-upload" style="font-size: 3rem; color: #667eea;"></i>
              <p>Click to upload image</p>
              <small>JPG, PNG, GIF, WEBP (max 5MB)</small>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleFileChange"
              style="display: none"
            />
          </div>

          <!-- Title -->
          <div class="form-field">
            <label for="title">Title *</label>
            <InputText
              id="title"
              v-model="formData.title"
              placeholder="Enter post title"
              required
              class="w-full"
            />
          </div>

          <!-- Excerpt -->
          <div class="form-field">
            <label for="excerpt">Excerpt</label>
            <Textarea
              id="excerpt"
              v-model="formData.excerpt"
              placeholder="Brief description (optional)"
              rows="2"
              class="w-full"
            />
          </div>

          <!-- Content -->
          <div class="form-field">
            <label for="content">Content *</label>
            <Textarea
              id="content"
              v-model="formData.content"
              placeholder="Enter post content"
              rows="8"
              required
              class="w-full"
            />
          </div>

          <!-- Category -->
          <div class="form-field">
            <label for="category">Category</label>
            <Dropdown
              id="category"
              v-model="formData.category"
              :options="categories"
              optionLabel="label"
              optionValue="value"
              placeholder="Select category"
              class="w-full"
            />
          </div>

          <!-- Status -->
          <div class="form-field">
            <label for="status">Status</label>
            <Dropdown
              id="status"
              v-model="formData.status"
              :options="statuses"
              optionLabel="label"
              optionValue="value"
              placeholder="Select status"
              class="w-full"
            />
          </div>

          <!-- Featured -->
          <div class="form-field-checkbox">
            <Checkbox
              id="featured"
              v-model="formData.featured"
              :binary="true"
            />
            <label for="featured">Featured post</label>
          </div>

          <!-- Meta Description -->
          <div class="form-field">
            <label for="metaDescription">Meta Description (SEO)</label>
            <Textarea
              id="metaDescription"
              v-model="formData.metaDescription"
              placeholder="SEO meta description (optional)"
              rows="2"
              class="w-full"
            />
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              outlined
              @click="$router.back()"
            />
            <Button
              type="submit"
              :label="isEditMode ? 'Update Post' : 'Create Post'"
              icon="pi pi-check"
              :loading="loading"
            />
          </div>
        </form>
      </template>
    </Card>

    <Toast />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Toast from 'primevue/toast'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const loading = ref(false)
const imageFile = ref(null)
const imagePreview = ref(null)
const isEditMode = computed(() => !!route.params.id)

const formData = reactive({
  title: '',
  content: '',
  excerpt: '',
  category: 'news',
  status: 'draft',
  featured: false,
  metaDescription: '',
  image: null
})

const categories = [
  { label: 'News', value: 'news' },
  { label: 'Event', value: 'event' },
  { label: 'Announcement', value: 'announcement' },
  { label: 'Blog', value: 'blog' }
]

const statuses = [
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' }
]

onMounted(() => {
  if (isEditMode.value) {
    loadPost()
  }
})

const loadPost = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const token = localStorage.getItem('token')

    console.log('Loading post:', route.params.id)

    const response = await fetch(`${apiUrl}/posts/${route.params.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) throw new Error('Failed to load post')

    const post = await response.json()

    console.log('Post loaded:', post)
    console.log('Image data:', post.image)

    Object.assign(formData, {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      category: post.category,
      status: post.status,
      featured: post.featured,
      metaDescription: post.metaDescription || '',
      image: post.image
    })

    console.log('FormData updated:', formData.image)

  } catch (error) {
    console.error('Error loading post:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load post',
      life: 3000
    })
    router.back()
  }
}

const getImagePreviewUrl = () => {
  // Se c'è un'anteprima locale (nuova immagine selezionata)
  if (imagePreview.value) {
    console.log('Using preview:', imagePreview.value.substring(0, 50))
    return imagePreview.value
  }

  // Se c'è un'immagine esistente nel database
  if (formData.image?.url) {
    const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    let imageUrl

    // Se l'URL inizia già con http, usalo direttamente
    if (formData.image.url.startsWith('http')) {
      imageUrl = formData.image.url
    } else {
      // Altrimenti costruisci l'URL completo
      imageUrl = `${apiUrl}${formData.image.url}`
    }

    console.log('Image URL:', imageUrl)
    return imageUrl
  }

  console.log('No image, using placeholder')

  // Placeholder inline (SVG data URL)
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="300"%3E%3Crect width="500" height="300" fill="%23667eea"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="white"%3ENo Image%3C/text%3E%3C/svg%3E'
}

const handleFileChange = (event) => {
  const file = event.target.files[0]

  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.add({
      severity: 'warn',
      summary: 'Invalid File',
      detail: 'Please select an image file',
      life: 3000
    })
    return
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      severity: 'warn',
      summary: 'File Too Large',
      detail: 'Image must be less than 5MB',
      life: 3000
    })
    return
  }

  imageFile.value = file

  // Create preview
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)

  toast.add({
    severity: 'success',
    summary: 'Image Selected',
    detail: 'New image ready to upload',
    life: 2000
  })
}

const removeImage = () => {
  imageFile.value = null
  imagePreview.value = null
  formData.image = null

  toast.add({
    severity: 'info',
    summary: 'Image Removed',
    detail: 'You can upload a new image',
    life: 2000
  })
}

const handleImageError = (event) => {
  console.error('Image load error:', formData.image)
  console.error('Failed URL:', event.target.src)

  // Placeholder SVG inline per errori
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="500" height="300"%3E%3Crect width="500" height="300" fill="%23ef4444"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" fill="white"%3EImage Not Found%3C/text%3E%3C/svg%3E'

  toast.add({
    severity: 'warn',
    summary: 'Image Not Found',
    detail: 'The image could not be loaded. Please upload a new one.',
    life: 4000
  })
}

const handleSubmit = async () => {
  // Validate - immagine richiesta solo al create
  if (!isEditMode.value && !imageFile.value && !formData.image) {
    toast.add({
      severity: 'warn',
      summary: 'Image Required',
      detail: 'Please select an image for the post',
      life: 3000
    })
    return
  }

  loading.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const token = localStorage.getItem('token')

    // Create FormData
    const data = new FormData()
    data.append('title', formData.title)
    data.append('content', formData.content)
    data.append('category', formData.category)
    data.append('status', formData.status)
    data.append('featured', formData.featured)

    if (formData.excerpt) data.append('excerpt', formData.excerpt)
    if (formData.metaDescription) data.append('metaDescription', formData.metaDescription)
    if (imageFile.value) data.append('image', imageFile.value)

    const url = isEditMode.value
      ? `${apiUrl}/posts/${route.params.id}`
      : `${apiUrl}/posts`

    const method = isEditMode.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: data
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save post')
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: isEditMode.value ? 'Post updated successfully' : 'Post created successfully',
      life: 3000
    })

    router.push('/admin/posts')

  } catch (error) {
    console.error('Error saving post:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to save post',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.post-form-container {
  max-width: 900px;
  margin: 0 auto;
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

.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.form-field-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.form-field-checkbox label {
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f9fafb;
}

.upload-area p {
  margin: 1rem 0 0.5rem;
  font-weight: 600;
  color: #374151;
}

.upload-area small {
  color: #6b7280;
}

.image-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.image-preview {
  border-radius: 8px;
  overflow: hidden;
  max-width: 500px;
  border: 2px solid #e5e7eb;
}

.image-preview img {
  width: 100%;
  display: block;
}

.image-actions {
  display: flex;
  gap: 0.75rem;
}

.image-info {
  display: block;
  color: #6b7280;
  font-size: 0.875rem;
}

.image-info.success {
  color: #22c55e;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.w-full {
  width: 100%;
}
</style>
