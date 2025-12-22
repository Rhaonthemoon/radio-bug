<template>
  <div class="check-email-container">
    <div class="check-email-card">
      <Card>
        <template #content>
          <div class="check-email-content">
            <i class="pi pi-envelope" style="font-size: 4rem; color: #667eea;"></i>

            <h2>Controlla la tua Email! 📧</h2>

            <p class="main-message">
              Abbiamo inviato un'email di verifica a:
            </p>
            <p class="email-highlight">{{ email }}</p>

            <div class="instructions">
              <p><strong>Cosa fare ora:</strong></p>
              <ol>
                <li>Controlla la tua casella di posta</li>
                <li>Clicca sul link di verifica nell'email</li>
                <li>Completa la registrazione</li>
              </ol>
            </div>

            <div class="info-box">
              <i class="pi pi-info-circle"></i>
              <p>Non hai ricevuto l'email? Controlla anche la cartella spam.</p>
            </div>

            <div class="actions">
              <Button
                  label="Reinvia Email"
                  icon="pi pi-refresh"
                  @click="resendEmail"
                  :loading="resending"
                  outlined
                  class="resend-btn"
              />

              <Button
                  label="Torna al Login"
                  icon="pi pi-sign-in"
                  @click="router.push('/login')"
                  class="login-btn"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Toast from 'primevue/toast'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const email = ref('')
const resending = ref(false)

onMounted(() => {
  email.value = route.query.email || ''

  if (!email.value) {
    router.push('/register')
  }
})

const resendEmail = async () => {
  resending.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.value })
    })

    const data = await response.json()

    if (response.ok) {
      toast.add({
        severity: 'success',
        summary: 'Email Inviata!',
        detail: 'Controlla nuovamente la tua casella di posta.',
        life: 5000
      })
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
.check-email-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.check-email-card {
  width: 100%;
  max-width: 550px;
}

.check-email-content {
  text-align: center;
  padding: 2rem;
}

.check-email-content h2 {
  margin: 1.5rem 0 1rem;
  color: #1f2937;
  font-size: 1.875rem;
}

.main-message {
  margin: 1rem 0 0.5rem;
  color: #4b5563;
  font-size: 1.125rem;
}

.email-highlight {
  color: #667eea;
  font-weight: 600;
  font-size: 1.25rem;
  margin: 0.5rem 0 2rem;
}

.instructions {
  background: #f3f4f6;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 2rem 0;
  text-align: left;
}

.instructions p {
  margin: 0 0 1rem;
  color: #1f2937;
}

.instructions ol {
  margin: 0;
  padding-left: 1.5rem;
  color: #4b5563;
}

.instructions li {
  margin: 0.5rem 0;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  padding: 1rem;
  border-radius: 8px;
  margin: 1.5rem 0;
}

.info-box i {
  color: #f59e0b;
  font-size: 1.25rem;
}

.info-box p {
  margin: 0;
  color: #78350f;
  font-size: 0.875rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.resend-btn,
.login-btn {
  width: 100%;
}
</style>
