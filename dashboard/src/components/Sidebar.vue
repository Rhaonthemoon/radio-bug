<template>
  <div class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <i :class="headerIcon"></i>
      <h2>{{ headerTitle }}</h2>
      <p v-if="headerSubtitle" class="user-role">{{ headerSubtitle }}</p>
    </div>

    <!-- Menu Items -->
    <div class="sidebar-menu">
      <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ disabled: item.disabled }"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
        <Badge
            v-if="item.badge && item.badge > 0"
            :value="item.badge"
            :severity="item.badgeSeverity || 'warning'"
        />
        <span v-if="item.tag" class="menu-tag">{{ item.tag }}</span>
      </router-link>
    </div>

    <!-- Footer -->
    <div class="sidebar-footer">
      <slot name="footer">
        <Button
            label="Logout"
            icon="pi pi-sign-out"
            severity="danger"
            outlined
            class="w-full"
            @click="handleLogout"
        />
      </slot>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  headerIcon: {
    type: String,
    default: 'pi pi-radio-button'
  },
  headerTitle: {
    type: String,
    default: 'BUG Radio'
  },
  headerSubtitle: {
    type: String,
    default: ''
  },
  menuItems: {
    type: Array,
    required: true,
    // Esempio formato:
    // [
    //   { path: '/dashboard', label: 'Dashboard', icon: 'pi pi-home', badge: 0 },
    //   { path: '/shows', label: 'Shows', icon: 'pi pi-microphone', badge: 3, badgeSeverity: 'warning' }
    // ]
  }
})

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const handleLogout = () => {
  authStore.logout()
  toast.add({
    severity: 'info',
    summary: 'Logout effettuato',
    detail: 'A presto!',
    life: 2000
  })
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-header i {
  font-size: 2rem;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.user-role {
  font-size: 0.85rem;
  opacity: 0.7;
  margin: 0;
}

.sidebar-menu {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin: 0.25rem 0;
  border-radius: 8px;
  color: white;
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
}

.menu-item:hover:not(.disabled) {
  background: rgba(255,255,255,0.1);
}

.menu-item.router-link-active {
  background: #3b82f6;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.menu-tag {
  font-size: 0.65rem;
  background: #f59e0b;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-left: auto;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.w-full {
  width: 100%;
}
</style>