<template>
  <div class="forgot-password-container">
    <div class="forgot-password-card">
      <Card>
        <template #header>
          <div class="header-content">
            <i class="pi pi-lock" style="font-size: 3rem; color: #667eea;"></i>
            <h2>Forgot Password?</h2>
            <p>Enter your email to receive a reset link</p>
          </div>
        </template>

        <template #content>
          <!-- Success Message -->
          <div v-if="emailSent" class="success-message">
            <i class="pi pi-check-circle"></i>
            <h3>Email Sent!</h3>
            <p>If an account exists with <strong>{{ email }}</strong>, you will receive a password reset link shortly.</p>
            <p style="margin-top: 20px;">Check your email inbox (and spam folder).</p>

            <Button
                label="Back to Login"
                icon="pi pi-sign-in"
                @click="router.push('/login')"
                class="mt-3 w-full"
            />
          </div>

          <!-- Form -->
          <form v-else @submit.prevent="handleForgotPassword">
            <div class="form-field">
              <label for="email">Email Address</label>
              <InputText
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  class="w-full"
                  :disabled="loading"
              />
            </div>

            <Button
                type="submit"
                label="Send Reset Link"
                icon="pi pi-send"
                :loading="loading"
                class="w-full"
            />

            <div class="back-link">
              <router-link to="/login">
                <i class="pi pi-arrow-left"></i>
                Back to Login
              </router-link>
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
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Toast from 'primevue/toast'

const router = useRouter()
const toast = useToast()

const email = ref('')
const loading = ref(false)
const emailSent = ref(false)

const handleForgotPassword = async () => {
  loading.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email.value })
    })

    const data = await response.json()

    if (response.ok) {
      emailSent.value = true
      toast.add({
        severity: 'success',
        summary: 'Email Sent',
        detail: 'Check your inbox for the reset link.',
        life: 5000
      })
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.error || 'Unable to send reset email.',
        life: 5000
      })
    }
  } catch (error) {
    console.error('Forgot password error:', error)
    toast.add({
      severity: 'error',
      summary: 'Connection Error',
      detail: 'Unable to connect to server. Please try again.',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.forgot-password-card {
  width: 100%;
  max-width: 450px;
}

.header-content {
  text-align: center;
  padding: 2rem 2rem 0;
}

.header-content h2 {
  margin: 1rem 0 0.5rem;
  color: #1f2937;
}

.header-content p {
  color: #6b7280;
  margin: 0;
}

.success-message {
  text-align: center;
  padding: 2rem 0;
}

.success-message i {
  font-size: 4rem;
  color: #22c55e;
}

.success-message h3 {
  margin: 1rem 0 0.5rem;
  color: #1f2937;
}

.success-message p {
  color: #6b7280;
  margin: 0.5rem 0;
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

.w-full {
  width: 100%;
}

.back-link {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.back-link a:hover {
  text-decoration: underline;
}

.mt-3 {
  margin-top: 1rem;
}
</style>
