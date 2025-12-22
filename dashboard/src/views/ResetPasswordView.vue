<template>
  <div class="reset-password-container">
    <div class="reset-password-card">
      <Card>
        <template #header>
          <div class="header-content">
            <i class="pi pi-key" style="font-size: 3rem; color: #667eea;"></i>
            <h2>Reset Your Password</h2>
            <p>Enter your new password below</p>
          </div>
        </template>

        <template #content>
          <!-- Loading State -->
          <div v-if="verifying" class="verifying-state">
            <ProgressSpinner
                style="width: 50px; height: 50px"
                strokeWidth="4"
            />
            <p>Verifying token...</p>
          </div>

          <!-- Invalid Token -->
          <div v-else-if="invalidToken" class="error-state">
            <i class="pi pi-times-circle" style="font-size: 4rem; color: #ef4444;"></i>
            <h3>Invalid or Expired Token</h3>
            <p>This password reset link is invalid or has expired.</p>
            <p style="margin-top: 20px;">Password reset links expire after 1 hour.</p>
            
            <Button
                label="Request New Link"
                icon="pi pi-refresh"
                @click="router.push('/forgot-password')"
                class="mt-3"
            />
          </div>

          <!-- Success State -->
          <div v-else-if="resetSuccess" class="success-state">
            <i class="pi pi-check-circle" style="font-size: 4rem; color: #22c55e;"></i>
            <h3>Password Reset Successful!</h3>
            <p>Your password has been changed successfully.</p>
            <p>You will be redirected to the dashboard...</p>
          </div>

          <!-- Reset Form -->
          <form v-else @submit.prevent="handleResetPassword">
            <div class="form-field">
              <label for="newPassword">New Password</label>
              <Password
                  id="newPassword"
                  v-model="newPassword"
                  placeholder="Enter new password"
                  :feedback="true"
                  toggleMask
                  required
                  class="w-full"
                  :disabled="loading"
              />
              <small class="password-hint">
                Password must be at least 6 characters long
              </small>
            </div>

            <div class="form-field">
              <label for="confirmPassword">Confirm Password</label>
              <Password
                  id="confirmPassword"
                  v-model="confirmPassword"
                  placeholder="Confirm new password"
                  :feedback="false"
                  toggleMask
                  required
                  class="w-full"
                  :disabled="loading"
              />
            </div>

            <Button
                type="submit"
                label="Reset Password"
                icon="pi pi-check"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Password from 'primevue/password'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const verifying = ref(true)
const invalidToken = ref(false)
const resetSuccess = ref(false)
const token = ref('')

onMounted(() => {
  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search)
  token.value = urlParams.get('token')

  if (!token.value) {
    invalidToken.value = true
    verifying.value = false
    toast.add({
      severity: 'error',
      summary: 'Missing Token',
      detail: 'No reset token provided.',
      life: 3000
    })
  } else {
    verifying.value = false
  }
})

const handleResetPassword = async () => {
  // Validate passwords match
  if (newPassword.value !== confirmPassword.value) {
    toast.add({
      severity: 'warn',
      summary: 'Passwords Don\'t Match',
      detail: 'Please make sure both passwords match.',
      life: 3000
    })
    return
  }

  // Validate password length
  if (newPassword.value.length < 6) {
    toast.add({
      severity: 'warn',
      summary: 'Password Too Short',
      detail: 'Password must be at least 6 characters long.',
      life: 3000
    })
    return
  }

  loading.value = true

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token.value,
        newPassword: newPassword.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      resetSuccess.value = true

      toast.add({
        severity: 'success',
        summary: 'Success!',
        detail: 'Your password has been reset.',
        life: 3000
      })

      // Auto-login with the returned token
      if (data.token) {
        await authStore.loginWithToken(data.token)
      }

      // Redirect to dashboard
      setTimeout(() => {
        if (authStore.user?.role === 'admin') {
          router.push('/shows')
        } else {
          router.push('/artist/dashboard')
        }
      }, 2000)

    } else {
      // Token might be expired or invalid
      if (data.error.includes('expired') || data.error.includes('Invalid')) {
        invalidToken.value = true
      }

      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.error || 'Unable to reset password.',
        life: 5000
      })
    }
  } catch (error) {
    console.error('Reset password error:', error)
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
.reset-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.reset-password-card {
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

.verifying-state,
.error-state,
.success-state {
  text-align: center;
  padding: 2rem 0;
}

.verifying-state p,
.error-state p,
.success-state p {
  color: #6b7280;
  margin: 0.5rem 0;
}

.error-state h3,
.success-state h3 {
  margin: 1rem 0 0.5rem;
  color: #1f2937;
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

.password-hint {
  display: block;
  margin-top: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
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
