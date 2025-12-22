import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import StreamingView from "@/views/admin/StreamingView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/CallbackView.vue')
    },
    {
      path: '/check-email',
      name: 'check-email',
      component: () => import('../views/CheckEmailView.vue')
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: () => import('../views/VerifyEmailView.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue')
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordView.vue')
    },
    // ==================== ADMIN ROUTES ====================
    {
      path: '/dashboard',
      name: 'admin-dashboard',
      component: () => import('../views/admin/DashboardView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/shows',
      name: 'shows',
      component: () => import('../views/admin/ShowsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/episodes',
      name: 'episodes',
      component: () => import('../views/admin/EpisodesView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/requests',
      name: 'requests',
      component: () => import('../views/admin/RequestsView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/posts',
      name: 'admin-posts',
      component: () => import('../views/admin/PostsListView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/posts/create',  // ← Questa manca!
      name: 'admin-posts-create',
      component: () => import('../views/admin/PostFormView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/posts/edit/:id',  // ← Anche questa!
      name: 'admin-posts-edit',
      component: () => import('../views/admin/PostFormView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    // ==================== ARTIST ROUTES ====================
    {
      path: '/artist/dashboard',
      name: 'artist-dashboard',
      component: () => import('../views/artist/DashboardView.vue'),
      meta: { requiresAuth: true, requiresArtist: true }
    },
    {
      path: '/artist/request',
      name: 'artist-request',
      component: () => import('../views/artist/RequestView.vue'),
      meta: { requiresAuth: true, requiresArtist: true }
    },
    {
      path: '/artist/my-episodes',
      name: 'artist-episode',
      component: () => import('../views/artist/EpisodesView.vue'),
      meta: { requiresAuth: true, requiresArtist: true }
    },
    {
      path: '/streaming',
      name: 'Streaming',
      component: StreamingView,
      meta: {
        requiresAuth: true,
        requiresAdmin: true
      }
    }
  ]
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Inizializza auth se necessario
  if (authStore.token && !authStore.user) {
    await authStore.initAuth()
  }

  // Redirect se non autenticato
  if (to.meta.requiresAuth && !authStore.token) {
    next('/login')
    return
  }

  // Redirect se già loggato e va su login/register
  if ((to.path === '/login' || to.path === '/register') && authStore.token) {
    if (authStore.isAdmin) {
      next('/dashboard')
    } else {
      next('/artist/dashboard')
    }
    return
  }

  // Check permessi admin
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next('/artist/dashboard')
    return
  }

  // Check permessi artist
  if (to.meta.requiresArtist && !authStore.isArtist) {
    next('/dashboard')
    return
  }

  next()
})

export default router
