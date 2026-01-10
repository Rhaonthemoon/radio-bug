<template>
  <div class="dashboard-layout">
    <!-- Unified Sidebar -->
    <div class="sidebar">
      <div class="sidebar-header">
        <i class="pi pi-radio-button"></i>
        <h2>BUG Radio</h2>
        <p class="user-role">{{ userRoleLabel }}</p>
      </div>

      <div class="sidebar-menu">
        <router-link
            v-for="item in currentMenuItems"
            :key="item.to"
            :to="item.to"
            class="menu-item"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
          <Badge
              v-if="item.badge && item.badgeValue > 0"
              :value="item.badgeValue"
              :severity="item.badgeSeverity || 'warning'"
          />
        </router-link>
      </div>

      <div class="sidebar-footer">
        <div class="user-info">
          <Avatar
              :label="userInitials"
              style="background-color: #3b82f6; color: white;"
              shape="circle"
              size="large"
          />
          <div class="user-details">
            <p class="user-name">{{ authStore.user?.name }}</p>
            <p class="user-email">{{ authStore.user?.email }}</p>
          </div>
        </div>
        <Button
            label="Logout"
            icon="pi pi-sign-out"
            severity="danger"
            outlined
            class="w-full"
            @click="handleLogout"
        />
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Top Bar -->
      <div class="topbar">
        <div class="topbar-left">
          <h1>{{ pageTitle }}</h1>
        </div>
        <div class="topbar-right">
          <slot name="topbar-actions"></slot>
        </div>
      </div>

      <!-- Content Area -->
      <div class="content">
        <slot></slot>
      </div>
    </div>

    <Toast />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useShowsStore } from '../stores/shows'
import { useToast } from 'primevue/usetoast'

const props = defineProps({
  pageTitle: {
    type: String,
    required: true
  },
  breadcrumbItems: {
    type: Array,
    default: () => []
  }
})

const router = useRouter()
const authStore = useAuthStore()
const showsStore = useShowsStore()
const toast = useToast()

// Menu configuration
const adminMenuItems = [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    to: '/dashboard'
  },
  {
    label: 'Shows',
    icon: 'pi pi-microphone',
    to: '/shows'
  },
  {
    label: 'Episodes',
    icon: 'pi pi-play-circle',
    to: '/episodes'
  },
  {
    label: 'Posts',
    icon: 'pi pi-image',
    to: '/admin/posts'
  },
    {
    label: 'Requests',
    icon: 'pi pi-inbox',
    to: '/requests',
    badge: true,
    badgeValue: computed(() => showsStore.shows.filter(s => s.requestStatus === 'pending').length),
    badgeSeverity: 'warning'
  },
  {
    label: 'Streaming',
    icon: 'pi pi-broadcast',
    to: '/streaming'
  }
]

const artistMenuItems = [
  {
    label: 'My Requests',
    icon: 'pi pi-home',
    to: '/artist/dashboard'
  },
  {
    label: 'My Episodes',
    icon: 'pi pi-play-circle',
    to: '/artist/my-episodes'
  },
  {
    label: 'Request Show',
    icon: 'pi pi-plus-circle',
    to: '/artist/request'
  }
]

// Computed menu based on user role
const currentMenuItems = computed(() => {
  return authStore.isAdmin ? adminMenuItems : artistMenuItems
})

const userRoleLabel = computed(() => {
  return authStore.isAdmin ? 'Administrator' : 'Artist'
})

const userInitials = computed(() => {
  const name = authStore.user?.name || authStore.user?.email || 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

const handleLogout = () => {
  authStore.logout()
  toast.add({
    severity: 'info',
    summary: 'Logged out',
    detail: 'See you soon!',
    life: 2000
  })
  router.push('/login')
}
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar[data-v-430db805] {
  width: 280px;
  background: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
  z-index: 10000;
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  text-align: center;
}

.sidebar-header i {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.sidebar-header h2 {
  margin: 0.5rem 0;
  font-size: 1.5rem;
}

.user-role {
  font-size: 0.85rem;
  opacity: 0.7;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  flex: 1;
  padding: 1rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  margin: 0.25rem 0;
  border-radius: 8px;
  color: white;
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
}

.menu-item:hover {
  background: rgba(255,255,255,0.1);
}

.menu-item.router-link-active {
  background: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.menu-item i {
  font-size: 1.1rem;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main-content {
  flex: 1;
  margin-left: 280px;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  min-height: 100vh;
}

.topbar {
  background: white;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-left h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  color: #1f2937;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.content {
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
}

.w-full {
  width: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    position: relative;
    height: auto;
  }

  .main-content {
    margin-left: 0;
  }
}
</style>
