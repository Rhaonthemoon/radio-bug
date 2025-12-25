import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchPosts = async () => {
    loading.value = true
    error.value = null

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }

      posts.value = await response.json()
    } catch (err) {
      error.value = err.message
      console.error('Error fetching posts:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getPostById = async (id) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/posts/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch post')
      }

      return await response.json()
    } catch (err) {
      error.value = err.message
      console.error('Error fetching post:', err)
      throw err
    }
  }

  const createPost = async (postData) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: postData // FormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create post')
      }

      const newPost = await response.json()
      posts.value.unshift(newPost)
      return newPost
    } catch (err) {
      error.value = err.message
      console.error('Error creating post:', err)
      throw err
    }
  }

  const updatePost = async (id, postData) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: postData // FormData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update post')
      }

      const updatedPost = await response.json()
      
      const index = posts.value.findIndex(p => p._id === id)
      if (index !== -1) {
        posts.value[index] = updatedPost
      }

      return updatedPost
    } catch (err) {
      error.value = err.message
      console.error('Error updating post:', err)
      throw err
    }
  }

  const deletePost = async (id) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      posts.value = posts.value.filter(p => p._id !== id)
      return true
    } catch (err) {
      error.value = err.message
      console.error('Error deleting post:', err)
      throw err
    }
  }

  const getPublishedPosts = () => {
    return posts.value.filter(p => p.status === 'published')
  }

  const getFeaturedPosts = () => {
    return posts.value.filter(p => p.featured === true && p.status === 'published')
  }

  const getPostsByCategory = (category) => {
    return posts.value.filter(p => p.category === category)
  }

  return {
    posts,
    loading,
    error,
    fetchPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    getPublishedPosts,
    getFeaturedPosts,
    getPostsByCategory
  }
})
