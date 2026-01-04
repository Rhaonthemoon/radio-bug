<template>
  <div class="request-page">
    <div class="request-container">
      <Card class="request-card">
        <template #header>
          <div class="request-header">
            <i class="pi pi-radio-button" style="font-size: 3rem; color: #3b82f6;"></i>
            <h2>Request Your Show on BUG Radio</h2>
            <p>Fill in all fields to submit your request to the admin</p>
          </div>
        </template>

        <template #content>
          <form @submit.prevent="submitRequest" class="request-form">
            <!-- Show Information -->
            <div class="form-section">
              <h3><i class="pi pi-microphone"></i> Show Information</h3>

              <div class="form-field">
                <label for="title">Show Title *</label>
                <InputText
                  id="title"
                  v-model="formData.title"
                  placeholder="E.g. Noise à Noise"
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="description">Show Description *</label>
                <Textarea
                  id="description"
                  v-model="formData.description"
                  rows="6"
                  placeholder="Describe your show concept, the type of music you'll feature, the atmosphere you want to create..."
                  required
                  class="w-full"
                />
                <small>Explain in detail what makes your show unique</small>
              </div>

              <div class="form-field">
                <ImageUpload
                  label="Show Cover Image *"
                  v-model="formData.image.url"
                />
              </div>
            </div>

            <!-- Artist Information -->
            <div class="form-section">
              <h3><i class="pi pi-user"></i> Artist Information</h3>

              <div class="form-field">
                <ImageUpload
                  label="Artist Photo"
                  v-model="formData.artist.photo"
                />
                <small>Profile photo or press photo (optional)</small>
              </div>

              <div class="form-field">
                <label for="artistName">Artist/Curator Name *</label>
                <InputText
                  id="artistName"
                  v-model="formData.artist.name"
                  placeholder="Your name or pseudonym"
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="artistBio">Artist Biography *</label>
                <Textarea
                  id="artistBio"
                  v-model="formData.artist.bio"
                  rows="5"
                  placeholder="Tell us about your musical experience, collaborations, past projects..."
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label for="artistEmail">Contact Email *</label>
                <InputText
                  id="artistEmail"
                  v-model="formData.artist.email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  class="w-full"
                />
              </div>

              <div class="form-field">
                <label>Social Links (optional)</label>
                <div class="social-grid">
                  <div class="social-input">
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
                  <div class="social-input">
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
                  <div class="social-input">
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
                  <div class="social-input">
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
                  <div class="social-input">
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
                  <div class="social-input">
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
            </div>

            <!-- Genres -->
            <div class="form-section">
              <h3><i class="pi pi-tags"></i> Musical Genres</h3>

              <div class="form-field">
                <label for="genres">Musical Genres *</label>
                <InputText
                  id="genres"
                  v-model="genresInput"
                  placeholder="Ambient, Experimental, Drone, Techno..."
                  required
                  class="w-full"
                />
                <small>Enter genres separated by commas (at least one)</small>
              </div>

              <div class="form-field">
                <label for="tags">Tags</label>
                <InputText
                  id="tags"
                  v-model="tagsInput"
                  placeholder="underground, live, dj-set..."
                  class="w-full"
                />
                <small>Keywords to describe your show (optional)</small>
              </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <Button
                type="button"
                label="Cancel"
                severity="secondary"
                outlined
                @click="$router.push('/artist/dashboard')"
              />
              <Button
                type="submit"
                label="Submit Request"
                icon="pi pi-send"
                :loading="loading"
              />
            </div>
          </form>
        </template>
      </Card>
    </div>

    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useArtistStore } from '@/stores/artist'
import { useToast } from 'primevue/usetoast'
import ImageUpload from '@/components/ImageUpload.vue'

const router = useRouter()
const artistStore = useArtistStore()
const toast = useToast()
const loading = ref(false)

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
  }
})

const genresInput = ref('')
const tagsInput = ref('')

const validateForm = () => {
  if (!formData.value.title || !formData.value.description) {
    toast.add({
      severity: 'warn',
      summary: 'Missing Fields',
      detail: 'Fill in show title and description',
      life: 3000
    })
    return false
  }

  if (!formData.value.artist.name || !formData.value.artist.bio || !formData.value.artist.email) {
    toast.add({
      severity: 'warn',
      summary: 'Missing Fields',
      detail: 'Fill in all artist information',
      life: 3000
    })
    return false
  }

  if (!formData.value.image.url) {
    toast.add({
      severity: 'warn',
      summary: 'Missing Image',
      detail: 'Insert cover image URL',
      life: 3000
    })
    return false
  }

  if (!genresInput.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Missing Genres',
      detail: 'Enter at least one musical genre',
      life: 3000
    })
    return false
  }

  return true
}

const submitRequest = async () => {
  if (!validateForm()) return

  loading.value = true

  const requestData = {
    ...formData.value,
    genres: genresInput.value.split(',').map(g => g.trim()).filter(g => g),
    tags: tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : []
  }

  try {
    await artistStore.createRequest(requestData)

    toast.add({
      severity: 'success',
      summary: 'Request Submitted!',
      detail: 'Your request has been sent to admin for approval',
      life: 4000
    })

    setTimeout(() => {
      router.push('/artist/dashboard')
    }, 2000)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: artistStore.error || 'Error submitting request',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.request-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.request-container {
  width: 100%;
  max-width: 900px;
}

.request-card {
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.request-header {
  text-align: center;
  padding: 2rem 2rem 1rem;
}

.request-header h2 {
  margin: 1rem 0 0.5rem;
  color: #1f2937;
  font-size: 1.75rem;
}

.request-header p {
  color: #6b7280;
  margin: 0;
}

.request-form {
  padding: 0 1rem 1rem;
}

.form-section {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin: 0 0 1.5rem;
  color: #1f2937;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
}

.form-field small {
  display: block;
  margin-top: 0.4rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.social-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.social-input {
  display: flex;
  flex-direction: column;
}

.social-input label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #e5e7eb;
}

.w-full {
  width: 100%;
}
</style>
