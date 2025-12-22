<template>
  <div class="verify-container">
    <div class="verify-card">
      <Card>
        <template #content>
          <div class="verify-content">
            <!-- Loading -->
            <div v-if="verifying" class="status-section">
              <ProgressSpinner
                  style="width: 50px; height: 50px"
                  strokeWidth="4"
                  animationDuration="1s"
              />
              <h2>Verifica in corso...</h2>
              <p>Attendere prego</p>
            </div>

            <!-- Success -->
            <div v-else-if="verified" class="status-section">
              <i class="pi pi-check-circle" style="font-size: 4rem; color: #22c55e;"></i>
              <h2>Email Verificata! 🎉</h2>
              <p>Il tuo account è stato attivato con successo.</p>
              <p>Verrai reindirizzato alla dashboard...</p>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="status-section">
              <i class="pi pi-times-circle" style="font-size: 4rem; color: #ef4444;"></i>
              <h2>Errore di Verifica</h2>
              <p>{{ errorMessage }}</p>

              <Button
                  v-if="canResend"
                  label="Richiedi Nuovo Link"
                  icon="pi pi-envelope"
                  @click="showResendDialog = true"
                  class="mt-3"
              />

              <Button
                  label="Torna al Login"
                  icon="pi pi-sign-in"
                  @click="router.push('/login')"
                  outlined
                  class="mt-2"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Dialog per reinvio email -->
    <Dialog
        v-model:visible="showResendDialog"
        header="Reinvia Email di Verifica"
        :modal="true"
        :style="{ width: '450px' }"
    >
      <div class="resend-form">
        <p>Inserisci il tuo indirizzo email per ricevere un nuovo link di verifica.</p>

        <div class="form-field">
          <label for="email">Email</label>
          <InputText
              id="email"
              v-model="resendEmail"
              type="email"
              placeholder="tua@email.com"
              class="w-full"
          />
        </div>
      </div>

      <template #footer>
        <Button
            label="Annulla"
            icon="pi pi-times"
            @click="showResendDialog = false"
            text
        />
        <Button
            label="Invia"
            icon="pi pi-send"
            @click="resendVerification"
            :loading="resending"
        />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Toast from 'primevue/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const verifying = ref(true)
const verified = ref(false)
const error = ref(false)
const errorMessage = ref('')
const canResend = ref(false)

const showResendDialog = ref(false)
const resendEmail = ref('')
const resending = ref(false)

onMounted(() => {
  verifyEmail()
})

const verifyEmail = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')

    if (!token) {
      error.value = true
      errorMessage.value = 'Token di verifica mancante.'
      canResend.value = true
      verifying.value = false
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/auth/verify-email?token=${token}`)
    const data = await response.json()

    if (response.ok) {
      // Verifica riuscita
      verified.value = true
      verifying.value = false

      // Salva token JWT e dati utente
      if (data.token) {
        await authStore.loginWithToken(data.token)
      }

      toast.add({
        severity: 'success',
        summary: 'Email Verificata!',
        detail: 'Il tuo account è stato attivato.',
        life: 3000
      })

      // Redirect alla dashboard
      setTimeout(() => {
        if (authStore.user?.role === 'admin') {
          router.push('/shows')
        } else {
          router.push('/artist/dashboard')
        }
      }, 2000)

    } else {
      // Errore di verifica
      error.value = true
      errorMessage.value = data.error || 'Errore durante la verifica.'
      canResend.value = data.error?.includes('scaduto')
      verifying.value = false

      toast.add({
        severity: 'error',
        summary: 'Errore',
        detail: data.error,
        life: 5000
      })
    }

  } catch (err) {
    console.error('Errore verifica:', err)
    error.value = true
    errorMessage.value = 'Errore di connessione. Riprova più tardi.'
    verifying.value = false

    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: 'Impossibile verificare l\'email.',
      life: 5000
    })
  }
}

const resendVerification = async () => {
  if (!resendEmail.value) {
    toast.add({
      severity: 'warn',
      summary: 'Attenzione',
      detail: 'Inserisci il tuo indirizzo email.',
      life: 3000
    })
    return
  }

  resending.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: resendEmail.value })
    })

    const data = await response.json()

    if (response.ok) {
      toast.add({
        severity: 'success',
        summary: 'Email Inviata!',
        detail: 'Controlla la tua casella di posta.',
        life: 5000
      })

      showResendDialog.value = false
      resendEmail.value = ''

      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } else {
      toast.add({
        severity: 'error',
        summary: 'Errore',
        detail: data.error || 'Impossibile inviare l\'email.',
        life: 5000
      })
    }

  } catch (err) {
    console.error('Errore reinvio:', err)
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: 'Errore di connessione.',
      life: 5000
    })
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.verify-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.verify-card {
  width: 100%;
  max-width: 500px;
}

.verify-content {
  padding: 2rem;
}

.status-section {
  text-align: center;
}

.status-section h2 {
  margin: 1.5rem 0 0.5rem;
  color: #1f2937;
  font-size: 1.75rem;
}

.status-section p {
  margin: 0.5rem 0;
  color: #6b7280;
}

.resend-form {
  padding: 1rem 0;
}

.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 1rem;
}
</style>
