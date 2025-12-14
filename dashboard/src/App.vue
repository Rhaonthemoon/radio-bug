<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth.js'

const authStore = useAuthStore()

onMounted(() => {
  // Inizializza l'autenticazione se c'è un token
  authStore.initAuth()
})
</script>

<style>
</style>
