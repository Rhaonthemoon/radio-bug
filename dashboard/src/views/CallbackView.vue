<template>
  <div class="callback-container">
    <div class="callback-card">
      <Card>
        <template #content>
          <div class="callback-content">
            <ProgressSpinner
                v-if="!error"
                style="width: 50px; height: 50px"
                strokeWidth="4"
                animationDuration="1s"
            />
            <i v-else class="pi pi-times-circle" style="font-size: 3rem; color: #ef4444;"></i>

            <h2>{{ statusMessage }}</h2>
            <p>{{ detailMessage }}</p>
          </div>
        </template>
      </Card>
    </div>
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'
import ProgressSpinner from 'primevue/progressspinner'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const statusMessage = ref('Authenticating...')
const detailMessage = ref('Please wait')
const error = ref(false)

onMounted(() => {
  handleCallback()
})

const handleCallback = async () => {
  try {
    // Estrai parametri dall'URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const errorParam = urlParams.get('error')

    // Gestione errore
    if (errorParam) {
      error.value = true
      statusMessage.value = 'Authentication Error'
      detailMessage.value = getErrorMessage(errorParam)

      toast.add({
        severity: 'error',
        summary: 'Authentication Failed',
        detail: getErrorMessage(errorParam),
        life: 4000
      })

      setTimeout(() => {
        router.push('/login')
      }, 3000)
      return
    }

    // Gestione token
    if (!token) {
      error.value = true
      statusMessage.value = 'Token Missing'
      detailMessage.value = 'Redirecting to login...'

      setTimeout(() => {
        router.push('/login')
      }, 2000)
      return
    }

    // Salva il token nello store
    statusMessage.value = 'Retrieving user data...'
    await authStore.loginWithToken(token)

    // Successo
    statusMessage.value = 'Login Successful!'
    detailMessage.value = 'Redirecting...'

    toast.add({
      severity: 'success',
      summary: 'Welcome!',
      detail: `Hello ${authStore.userName}!`,
      life: 3000
    })

    setTimeout(() => {
      // Redirect based on role
      if (authStore.user?.role === 'admin') {
        router.push('/shows')
      } else {
        router.push('/artist/dashboard')
      }
    }, 1000)

  } catch (err) {
    console.error('Callback error:', err)
    error.value = true
    statusMessage.value = 'Unexpected Error'
    detailMessage.value = 'Something went wrong. Please try again.'

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Unable to complete authentication',
      life: 4000
    })

    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }
}

const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'google_auth_failed': 'Google authentication failed',
    'token_generation_failed': 'Unable to generate authentication token',
    'access_denied': 'Access denied by Google'
  }

  return errorMessages[errorCode] || 'An error occurred during authentication'
}
</script>

<style scoped>
.callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.callback-card {
  width: 100%;
  max-width: 450px;
}

.callback-content {
  text-align: center;
  padding: 2rem;
}

.callback-content h2 {
  margin: 1.5rem 0 0.5rem;
  color: #1f2937;
  font-size: 1.5rem;
}

.callback-content p {
  margin: 0;
  color: #6b7280;
}
</style>
