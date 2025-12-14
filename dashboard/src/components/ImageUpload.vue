<template>
  <div class="image-upload">
    <label class="upload-label">{{ label }}</label>

    <!-- Preview Immagine -->
    <div class="image-preview" v-if="imageUrl">
      <img :src="imageUrl" :alt="label" />
      <div class="image-overlay">
        <Button
            icon="pi pi-times"
            rounded
            severity="danger"
            size="small"
            @click="removeImage"
            class="remove-btn"
        />
      </div>
    </div>

    <!-- Upload Area -->
    <div
        v-else
        class="upload-area"
        :class="{ 'drag-over': isDragging }"
        @click="triggerFileInput"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
    >
      <i class="pi pi-cloud-upload upload-icon"></i>
      <p class="upload-text">
        Clicca o trascina un'immagine qui
      </p>
      <p class="upload-hint">
        JPG, PNG, GIF, WebP (max 5MB)
      </p>
      <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          @change="handleFileSelect"
          style="display: none;"
      />
    </div>

    <!-- Loading -->
    <div v-if="uploading" class="upload-progress">
      <ProgressBar mode="indeterminate" style="height: 6px;" />
      <p>Caricamento in corso...</p>
    </div>

    <!-- Error -->
    <small v-if="error" class="upload-error">{{ error }}</small>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const props = defineProps({
  label: {
    type: String,
    default: 'Immagine'
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const fileInput = ref(null)
const imageUrl = ref(props.modelValue)
const uploading = ref(false)
const error = ref('')
const isDragging = ref(false)

// Watch per aggiornare l'immagine se cambia dall'esterno
watch(() => props.modelValue, (newVal) => {
  imageUrl.value = newVal
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    uploadImage(file)
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file) {
    uploadImage(file)
  }
}

const uploadImage = async (file) => {
  // Validazione
  if (!file.type.startsWith('image/')) {
    error.value = 'Per favore seleziona un\'immagine'
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'L\'immagine deve essere inferiore a 5MB'
    return
  }

  error.value = ''
  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('image', file)

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    imageUrl.value = response.data.url
    emit('update:modelValue', response.data.url)
  } catch (err) {
    error.value = err.response?.data?.error || 'Errore durante l\'upload'
  } finally {
    uploading.value = false
  }
}

const removeImage = () => {
  imageUrl.value = ''
  emit('update:modelValue', '')
  error.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<style scoped>
.image-upload {
  margin-bottom: 1.5rem;
}

.upload-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.image-preview {
  position: relative;
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
}

.image-preview img {
  width: 100%;
  height: auto;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.remove-btn {
  transform: scale(1.2);
}

.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f9fafb;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-icon {
  font-size: 3rem;
  color: #94a3b8;
  margin-bottom: 1rem;
}

.upload-text {
  margin: 0.5rem 0;
  color: #1f2937;
  font-weight: 500;
}

.upload-hint {
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.upload-progress {
  margin-top: 1rem;
  text-align: center;
}

.upload-progress p {
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.upload-error {
  display: block;
  margin-top: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
}
</style>