<template>
  <div class="login-container">
    <div class="login-card">
      <Card>
        <template #header>
          <div class="login-header">
            <i class="pi pi-radio-button" style="font-size: 3rem; color: #3b82f6;"></i>
            <h2>BUG Radio CMS</h2>
            <p>Create your account</p>
          </div>
        </template>

        <template #content>
          <form @submit.prevent="handleRegister">
            <div class="form-field">
              <label for="name">Name</label>
              <InputText
                  id="name"
                  v-model="formData.name"
                  type="text"
                  placeholder="Your name"
                  required
                  class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="artistName">Artist Name</label>
              <InputText
                  id="artistName"
                  v-model="formData.artistName"
                  type="text"
                  placeholder="Your artist/DJ name"
                  class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="email">Email</label>
              <InputText
                  id="email"
                  v-model="formData.email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="password">Password</label>
              <Password
                  id="password"
                  v-model="formData.password"
                  placeholder="Password"
                  :feedback="true"
                  toggleMask
                  required
                  class="w-full"
              />
            </div>

            <Button
                type="submit"
                label="Register"
                icon="pi pi-user-plus"
                :loading="authStore.loading"
                class="w-full"
            />
          </form>

          <!-- Divider -->
          <div class="divider">
            <span>or</span>
          </div>

          <!-- Google Sign Up Button -->
          <Button
              @click="handleGoogleSignUp"
              label="Sign up with Google"
              icon="pi pi-google"
              :loading="googleLoading"
              class="w-full google-btn"
              outlined
          />

          <!-- Login Link -->
          <div class="register-link">
            Already have an account?
            <router-link to="/login">Login</router-link>
          </div>
        </template>
      </Card>
    </div>

    <Toast />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const formData = ref({
  name: '',
  artistName: '',
  email: '',
  password: ''
})

const googleLoading = ref(false)

const handleRegister = async () => {
  try {
    await authStore.register(formData.value)
    toast.add({
      severity: 'success',
      summary: 'Registration Successful',
      detail: `Welcome ${authStore.userName}!`,
      life: 3000
    })

    // Redirect based on role
    if (authStore.user?.role === 'admin') {
      router.push('/shows')
    } else {
      router.push('/artist/dashboard')
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: authStore.error || 'Registration failed',
      life: 3000
    })
  }
}

const handleGoogleSignUp = () => {
  googleLoading.value = true
  // Redirect al backend per Google OAuth
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  window.location.href = `${apiUrl}/api/auth/google`
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-card {
  width: 100%;
  max-width: 450px;
}

.login-header {
  text-align: center;
  padding: 2rem 2rem 0;
}

.login-header h2 {
  margin: 1rem 0 0.5rem;
  color: #1f2937;
}

.login-header p {
  color: #6b7280;
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

.w-full {
  width: 100%;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  color: #9ca3af;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider span {
  padding: 0 1rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  font-weight: 500;
}

/* Google Button */
.google-btn {
  margin-bottom: 1.5rem;
}

.register-link {
  margin-top: 1.5rem;
  text-align: center;
  color: #6b7280;
}

.register-link a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
  margin-left: 0.25rem;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>