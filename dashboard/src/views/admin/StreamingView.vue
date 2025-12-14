<template>
  <DashboardLayout page-title="Streaming Management">
    <template #topbar-actions>
      <Button
          :label="streamStatus === 'live' ? 'ON AIR' : 'OFFLINE'"
          :severity="streamStatus === 'live' ? 'success' : 'secondary'"
          :icon="streamStatus === 'live' ? 'pi pi-circle-fill' : 'pi pi-circle'"
          disabled
          class="status-badge"
      />
    </template>

    <!-- Stream Status Card -->
    <Card class="status-card">
      <template #content>
        <div class="stream-status">
          <div class="status-indicator">
            <i
                :class="['pi', streamStatus === 'live' ? 'pi-broadcast' : 'pi-wifi-off']"
                :style="{ color: streamStatus === 'live' ? '#10b981' : '#6b7280' }"
            ></i>
            <h2>{{ streamStatus === 'live' ? 'Stream Live' : 'Stream Offline' }}</h2>
          </div>

          <div class="listeners-count" v-if="streamStatus === 'live'">
            <i class="pi pi-users"></i>
            <span>{{ currentListeners }} listeners</span>
          </div>
        </div>
      </template>
    </Card>

    <!-- Audio Player (shown when live) -->
    <Card v-if="streamStatus === 'live'" class="player-card">
      <template #content>
        <div class="audio-player">
          <audio
              ref="audioPlayer"
              :src="streamUrl"
              preload="none"
              crossorigin="anonymous"
          ></audio>

          <div class="player-controls">
            <Button
                :icon="isPlaying ? 'pi pi-pause' : 'pi pi-play'"
                @click="togglePlay"
                :severity="isPlaying ? 'danger' : 'success'"
                rounded
                size="large"
                class="play-button"
            />

            <div class="player-info">
              <div class="player-status">
                <div class="pulse-indicator" v-if="isPlaying"></div>
                <span class="status-text">
                  {{ isPlaying ? 'Riproduzione in corso...' : 'Premi play per ascoltare' }}
                </span>
              </div>
              <div class="stream-quality">
                <i class="pi pi-wifi"></i>
                <span>{{ bitrate }} kbps</span>
              </div>
            </div>

            <div class="volume-control">
              <Button
                  :icon="volume === 0 ? 'pi pi-volume-off' : 'pi pi-volume-up'"
                  @click="toggleMute"
                  text
                  rounded
              />
              <div class="volume-slider-container">
                <Slider
                    v-model="volume"
                    :min="0"
                    :max="100"
                    @update:modelValue="updateVolume"
                    class="volume-slider"
                />
              </div>
            </div>
          </div>

          <div class="player-footer" v-if="isPlaying">
            <div class="equalizer">
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
              <div class="bar"></div>
            </div>
            <span class="live-badge">
              <i class="pi pi-circle-fill"></i>
              LIVE
            </span>
          </div>
        </div>
      </template>
    </Card>

    <!-- Current Playing & Queue -->
    <div class="content-grid">
      <!-- Now Playing -->
      <Card class="now-playing-card">
        <template #title>
          <div class="card-title-icon">
            <i class="pi pi-play-circle"></i>
            <span>Now Playing</span>
          </div>
        </template>
        <template #content>
          <div v-if="nowPlaying" class="now-playing">
            <div class="album-art">
              <img
                  v-if="nowPlaying.artwork"
                  :src="nowPlaying.artwork"
                  :alt="nowPlaying.title"
              />
              <div v-else class="no-artwork">
                <i class="pi pi-music"></i>
              </div>
            </div>

            <div class="track-info">
              <h3>{{ nowPlaying.title }}</h3>
              <p class="artist">{{ nowPlaying.artist }}</p>
              <p class="show-name" v-if="nowPlaying.show">
                <i class="pi pi-microphone"></i>
                {{ nowPlaying.show }}
              </p>

              <div class="progress-section">
                <div class="time-labels">
                  <span>{{ formatTime(nowPlaying.elapsed) }}</span>
                  <span>{{ formatTime(nowPlaying.duration) }}</span>
                </div>
                <ProgressBar
                    :value="trackProgress"
                    :showValue="false"
                    class="track-progress"
                />
              </div>
            </div>
          </div>

          <div v-else class="no-content">
            <i class="pi pi-info-circle"></i>
            <p>No track currently playing</p>
          </div>
        </template>
      </Card>

      <!-- Next in Queue -->
      <Card class="queue-card">
        <template #title>
          <div class="card-title-icon">
            <i class="pi pi-list"></i>
            <span>Next in Queue</span>
          </div>
        </template>
        <template #content>
          <div v-if="queue.length > 0" class="queue-list">
            <div
                v-for="(track, index) in queue"
                :key="track.id"
                class="queue-item"
            >
              <div class="queue-number">{{ index + 1 }}</div>
              <div class="queue-info">
                <p class="queue-title">{{ track.title }}</p>
                <p class="queue-artist">{{ track.artist }}</p>
              </div>
              <div class="queue-duration">{{ formatDuration(track.duration) }}</div>
            </div>
          </div>

          <div v-else class="no-content">
            <i class="pi pi-info-circle"></i>
            <p>Queue is empty</p>
          </div>
        </template>
      </Card>
    </div>

    <!-- Current Show & Schedule -->
    <div class="content-grid">
      <!-- Current Show -->
      <Card class="current-show-card">
        <template #title>
          <div class="card-title-icon">
            <i class="pi pi-calendar"></i>
            <span>Current Show</span>
          </div>
        </template>
        <template #content>
          <div v-if="currentShow" class="current-show">
            <div class="show-image">
              <img
                  v-if="currentShow.image"
                  :src="currentShow.image"
                  :alt="currentShow.title"
              />
              <div v-else class="no-image">
                <i class="pi pi-microphone"></i>
              </div>
            </div>

            <div class="show-details">
              <h3>{{ currentShow.title }}</h3>
              <p class="show-artist" v-if="currentShow.artist">with {{ currentShow.artist }}</p>
              <div class="show-time">
                <i class="pi pi-clock"></i>
                <span>{{ currentShow.startTime }} - {{ currentShow.endTime }}</span>
              </div>
              <div class="show-genres" v-if="currentShow.genres && currentShow.genres.length > 0">
                <Tag
                    v-for="genre in currentShow.genres"
                    :key="genre"
                    :value="genre"
                    severity="info"
                />
              </div>
            </div>
          </div>

          <div v-else class="no-content">
            <i class="pi pi-info-circle"></i>
            <p>No scheduled show at this time</p>
            <small>AutoDJ is playing</small>
          </div>
        </template>
      </Card>

      <!-- Stream Controls -->
      <Card class="controls-card">
        <template #title>
          <div class="card-title-icon">
            <i class="pi pi-sliders-h"></i>
            <span>Stream Controls</span>
          </div>
        </template>
        <template #content>
          <div class="controls-section">
            <div class="control-group">
              <label>Stream URL</label>
              <div class="input-with-copy">
                <InputText
                    v-model="streamUrl"
                    readonly
                    class="w-full"
                />
                <Button
                    icon="pi pi-copy"
                    @click="copyStreamUrl"
                    v-tooltip.top="'Copy URL'"
                    outlined
                />
              </div>
            </div>

            <div class="control-group">
              <label>Bitrate</label>
              <div class="info-display">
                <i class="pi pi-info-circle"></i>
                <span>{{ bitrate }} kbps</span>
              </div>
            </div>

            <div class="control-group">
              <label>Current Listeners</label>
              <div class="info-display">
                <i class="pi pi-users"></i>
                <span>{{ currentListeners }} / {{ maxListeners }}</span>
              </div>
            </div>

            <Button
                label="Refresh Status"
                icon="pi pi-refresh"
                @click="refreshStreamStatus"
                :loading="loading"
                class="w-full"
                outlined
            />

            <Button
                label="Open Airtime Dashboard"
                icon="pi pi-external-link"
                @click="openAirtimeDashboard"
                class="w-full"
                severity="secondary"
            />
          </div>
        </template>
      </Card>
    </div>

    <!-- Statistics -->
    <Card class="stats-card">
      <template #title>Stream Statistics</template>
      <template #content>
        <div class="stats-grid">
          <div class="stat-item">
            <i class="pi pi-chart-line"></i>
            <div class="stat-content">
              <span class="stat-label">Peak Listeners Today</span>
              <span class="stat-value">{{ peakListeners }}</span>
            </div>
          </div>

          <div class="stat-item">
            <i class="pi pi-clock"></i>
            <div class="stat-content">
              <span class="stat-label">Uptime</span>
              <span class="stat-value">{{ uptime }}</span>
            </div>
          </div>

          <div class="stat-item">
            <i class="pi pi-play"></i>
            <div class="stat-content">
              <span class="stat-label">Tracks Played Today</span>
              <span class="stat-value">{{ tracksPlayedToday }}</span>
            </div>
          </div>

          <div class="stat-item">
            <i class="pi pi-calendar"></i>
            <div class="stat-content">
              <span class="stat-label">Shows Today</span>
              <span class="stat-value">{{ showsToday }}</span>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Schedule Calendar -->
    <Card class="schedule-card">
      <template #title>
        <div class="card-title-icon">
          <i class="pi pi-calendar"></i>
          <span>Programmazione</span>
        </div>
      </template>
      <template #content>
        <FullCalendar :events="calendarEvents" :options="calendarOptions" />
      </template>
    </Card>

    <!-- EPISODI & AIRTIME MANAGEMENT -->
    <Card class="episodes-card">
      <template #title>
        <div class="card-title-icon">
          <i class="pi pi-upload"></i>
          <span>Episode Management</span>
        </div>
      </template>
      <template #content>
        <div class="episodes-section">
          <!-- Info Box -->
          <div class="info-box">
            <i class="pi pi-info-circle"></i>
            <div>
              <p><strong>Upload Process:</strong></p>
              <p>1. Upload audio file to server → 2. Download file → 3. Manually upload to Airtime → 4. Mark as uploaded in system</p>
            </div>
          </div>

          <!-- Uploaded Episodes Table -->
          <DataTable
              :value="uploadedEpisodes"
              :loading="loadingEpisodes"
              striped-rows
              responsive-layout="scroll"
              class="episodes-table"
          >
            <Column field="title" header="Title" />
            <Column field="show" header="Show" />
            <Column
                field="localFile.size"
                header="Size"
            >
              <template #body="{ data }">
                {{ formatFileSize(data.localFile?.size || 0) }}
              </template>
            </Column>
            <Column
                field="localFile.uploadedAt"
                header="Uploaded"
            >
              <template #body="{ data }">
                {{ formatDate(data.localFile?.uploadedAt) }}
              </template>
            </Column>
            <Column
                field="airtime.uploaded"
                header="Status"
            >
              <template #body="{ data }">
                <Tag
                    v-if="data.airtime?.uploaded"
                    value="On Airtime"
                    severity="success"
                />
                <Tag
                    v-else-if="data.airtime?.scheduled"
                    value="Scheduled"
                    severity="info"
                />
                <Tag
                    v-else
                    value="On Server"
                    severity="warning"
                />
              </template>
            </Column>
            <Column header="Actions" :style="{ width: '200px' }">
              <template #body="{ data }">
                <div class="action-buttons">
                  <!-- Download button -->
                  <Button
                      icon="pi pi-download"
                      @click="downloadEpisode(data.id, data.title)"
                      v-tooltip.top="'Download for manual Airtime upload'"
                      rounded
                      text
                      severity="info"
                      :loading="loadingDownload === data.id"
                  />

                  <!-- Mark as uploaded button -->
                  <Button
                      v-if="!data.airtime?.uploaded"
                      icon="pi pi-check"
                      @click="showMarkUploadedDialog(data)"
                      v-tooltip.top="'Mark as uploaded to Airtime'"
                      rounded
                      text
                      severity="success"
                  />

                  <!-- Delete button -->
                  <Button
                      icon="pi pi-trash"
                      @click="deleteEpisode(data.id, data.title)"
                      v-tooltip.top="'Delete from server'"
                      rounded
                      text
                      severity="danger"
                  />
                </div>
              </template>
            </Column>

            <template #empty>
              <div class="empty-state">
                <i class="pi pi-inbox"></i>
                <p>No episodes uploaded yet</p>
              </div>
            </template>
          </DataTable>
        </div>
      </template>
    </Card>

    <!-- Dialog: Mark as Uploaded -->
    <Dialog
        v-model:visible="markUploadedDialog"
        modal
        header="Mark as Uploaded to Airtime"
        :style="{ width: '400px' }"
    >
      <div class="mark-uploaded-form">
        <p class="instructions">
          After manually uploading the file to Airtime, enter the file ID from Airtime:
        </p>
        <div class="form-group">
          <label for="airtimeFileId">Airtime File ID *</label>
          <InputText
              id="airtimeFileId"
              v-model="airtimeFileId"
              placeholder="e.g., 12345"
              class="w-full"
          />
        </div>
        <small class="hint">You can find this ID in Airtime after uploading the file</small>
      </div>
      <template #footer>
        <Button
            label="Cancel"
            @click="markUploadedDialog = false"
            text
        />
        <Button
            label="Mark as Uploaded"
            @click="confirmMarkUploaded"
            :loading="loadingMarkUploaded"
        />
      </template>
    </Dialog>

    <Toast />
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import itLocale from '@fullcalendar/core/locales/it'
import DashboardLayout from '../../components/DashboardLayout.vue'
import api from '@/api/axios';

const toast = useToast()
const loading = ref(false)
const loadingEpisodes = ref(false)
const loadingDownload = ref(null)
const loadingMarkUploaded = ref(false)

// Stream Status
const streamStatus = ref('offline')
const currentListeners = ref(0)
const maxListeners = ref(100)
const bitrate = ref(192)
const streamUrl = ref('https://bugradio2024.out.airtime.pro/bugradio2024_a')

// Now Playing
const nowPlaying = ref(null)

// Queue
const queue = ref([])

// Current Show
const currentShow = ref(null)

// Statistics
const peakListeners = ref(0)
const uptime = ref('N/A')
const tracksPlayedToday = ref(0)
const showsToday = ref(0)

// Episodes
const uploadedEpisodes = ref([])
const markUploadedDialog = ref(false)
const selectedEpisode = ref(null)
const airtimeFileId = ref('')

// Week Schedule
const weekSchedule = ref({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
})

// FullCalendar
const calendarEvents = ref([])
const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locale: itLocale,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  slotMinTime: '00:00:00',
  slotMaxTime: '24:00:00',
  allDaySlot: false,
  height: 'auto',
  eventClick: (info) => {
    const event = info.event
    toast.add({
      severity: 'info',
      summary: event.title,
      detail: `${event.extendedProps.artist || 'N/A'}\n${event.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - ${event.end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
      life: 5000
    })
  },
  eventColor: '#667eea'
})

// Audio Player
const audioPlayer = ref(null)
const isPlaying = ref(false)
const volume = ref(70)
const previousVolume = ref(70)

// Computed
const trackProgress = computed(() => {
  if (!nowPlaying.value || !nowPlaying.value.duration) return 0
  return (nowPlaying.value.elapsed / nowPlaying.value.duration) * 100
})

let refreshInterval = null

// Utility Methods
const formatTime = (seconds) => {
  if (!seconds || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const parseTimeString = (timeStr) => {
  if (!timeStr) return 0
  // Format: "HH:MM:SS" or "HH:MM:SS.ffffff"
  const parts = timeStr.split(':')
  if (parts.length < 2) return 0

  const hours = parseInt(parts[0]) || 0
  const minutes = parseInt(parts[1]) || 0
  const seconds = parseFloat(parts[2]) || 0

  return hours * 3600 + minutes * 60 + seconds
}

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyStreamUrl = () => {
  navigator.clipboard.writeText(streamUrl.value)
  toast.add({
    severity: 'success',
    summary: 'Copied',
    detail: 'Stream URL copied to clipboard',
    life: 3000
  })
}

// API Methods
const loadLiveInfo = async () => {
  try {
    const response = await fetch('https://bugradio2024.airtime.pro/api/live-info-v2');
    const data = await response.json();
    console.log("live data: ", data)

    // STREAM STATUS - controlla se lo schedulerTime esiste
    streamStatus.value = data.station?.schedulerTime ? 'live' : 'offline';

    // LISTENER COUNT
    currentListeners.value = data.station?.listener_count || 0;
    maxListeners.value = data.station?.max_listeners || 100;

    // BITRATE - prova a prenderlo dal metadata del track corrente
    if (data.tracks?.current?.metadata?.bit_rate) {
      bitrate.value = Math.floor(data.tracks.current.metadata.bit_rate / 1000);
    } else {
      bitrate.value = 192; // fallback
    }

    // UPTIME
    uptime.value = data.station?.uptime || 'N/A';

    // NOW PLAYING - dai dati in tracks.current
    const currentTrack = data.tracks?.current;
    if (currentTrack && currentTrack.name) {
      const metadata = currentTrack.metadata || {};

      // Calcola elapsed e duration
      const duration = parseTimeString(metadata.length);
      let elapsed = 0;

      if (currentTrack.starts && currentTrack.ends) {
        const startTime = new Date(currentTrack.starts).getTime();
        const now = new Date().getTime();
        elapsed = Math.floor((now - startTime) / 1000);
        // Assicurati che elapsed non superi duration
        if (elapsed > duration) elapsed = duration;
        if (elapsed < 0) elapsed = 0;
      }

      nowPlaying.value = {
        id: metadata.id || Date.now(),
        title: metadata.track_title || currentTrack.name || 'Unknown Track',
        artist: metadata.artist_name || 'Unknown Artist',
        show: data.shows?.current?.name || null,
        artwork: currentTrack.album_artwork_image || null,
        duration: duration,
        elapsed: elapsed
      };
    } else {
      nowPlaying.value = null;
    }

    // CURRENT SHOW - dai dati in shows.current
    const currentShowData = data.shows?.current;
    if (currentShowData && currentShowData.name && !currentShowData.auto_dj) {
      currentShow.value = {
        id: currentShowData.id || currentShowData.instance_id,
        title: currentShowData.name,
        artist: null, // Airtime non fornisce questo campo
        image: currentShowData.image_path || null,
        startTime: currentShowData.starts ? new Date(currentShowData.starts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,
        endTime: currentShowData.ends ? new Date(currentShowData.ends).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,
        genres: currentShowData.genre ? [currentShowData.genre] : []
      };
    } else {
      currentShow.value = null;
    }

    // QUEUE - prova prima shows.next, poi tracks.next come fallback
    let nextItems = [];

    // Prova con shows.next
    if (data.shows?.next && Array.isArray(data.shows.next) && data.shows.next.length > 0) {
      console.log("Using shows.next for queue:", data.shows.next);
      nextItems = data.shows.next.slice(0, 5).map(show => {
        let duration = 0;
        if (show.starts && show.ends) {
          const start = new Date(show.starts).getTime();
          const end = new Date(show.ends).getTime();
          duration = Math.floor((end - start) / 1000);
        }

        return {
          id: show.id || show.instance_id || Math.random(),
          title: show.name || 'Unknown Show',
          artist: 'BUG Radio',
          duration: duration
        };
      });
    }
    // Fallback: usa tracks.next se disponibile
    else if (data.tracks?.next && data.tracks.next.name) {
      console.log("Using tracks.next for queue:", data.tracks.next);
      const nextTrack = data.tracks.next;
      const metadata = nextTrack.metadata || {};

      nextItems = [{
        id: metadata.id || Date.now(),
        title: metadata.track_title || nextTrack.name || 'Unknown Track',
        artist: metadata.artist_name || 'Unknown Artist',
        duration: parseTimeString(metadata.length)
      }];
    }
    // Fallback: usa shows.previous per mostrare la cronologia recente
    else if (data.shows?.previous && Array.isArray(data.shows.previous) && data.shows.previous.length > 0) {
      console.log("Queue empty, showing recent shows from previous");
      // Prendi solo gli ultimi 3 show precedenti come riferimento
      const recentShows = data.shows.previous.slice(-3).reverse();
      nextItems = recentShows.map(show => {
        let duration = 0;
        if (show.starts && show.ends) {
          const start = new Date(show.starts).getTime();
          const end = new Date(show.ends).getTime();
          duration = Math.floor((end - start) / 1000);
        }

        return {
          id: show.id || show.instance_id || Math.random(),
          title: show.name || 'Unknown Show',
          artist: 'Recently Played',
          duration: duration
        };
      });
    }

    queue.value = nextItems;
    console.log("Final queue:", queue.value);

  } catch (error) {
    console.error('Error fetching live info from Airtime:', error);
    streamStatus.value = 'offline';
    nowPlaying.value = null;
    queue.value = [];
    currentShow.value = null;
  }
};


const loadCurrentShow = async () => {
  try {
    const response = await api.get('/admin/streaming/current-show')
    const data = response.data

    if (data.id) {
      currentShow.value = {
        id: data.id,
        title: data.title || 'No show scheduled',
        artist: data.artist || 'AutoDJ',
        image: data.image || null,
        startTime: data.startTime ? new Date(data.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,
        endTime: data.endTime ? new Date(data.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null,
        genres: data.genres || []
      }
    } else {
      currentShow.value = null
    }
  } catch (error) {
    console.error('Error loading current show:', error)
    currentShow.value = null
  }
}

const loadStatistics = async () => {
  try {
    const response = await api.get('/admin/streaming/statistics')
    const data = response.data

    peakListeners.value = data.peakListeners || 0
    tracksPlayedToday.value = data.tracksPlayedToday || 0
    showsToday.value = data.showsToday || 0
  } catch (error) {
    console.error('Error loading statistics:', error)
  }
}

const loadWeekSchedule = async () => {
  try {
    const response = await api.get('/admin/streaming/week-schedule')
    weekSchedule.value = response.data
    convertScheduleToCalendarEvents()
  } catch (error) {
    console.error('Error loading week schedule:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load week schedule',
      life: 3000
    })
  }
}

const convertScheduleToCalendarEvents = () => {
  const events = []
  const dayMap = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0
  }

  Object.entries(weekSchedule.value).forEach(([day, shows]) => {
    if (!shows || !Array.isArray(shows)) return

    shows.forEach(show => {
      // Calcola la data del prossimo giorno della settimana
      const today = new Date()
      const targetDay = dayMap[day]
      const currentDay = today.getDay()
      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget < 0) daysUntilTarget += 7

      const showDate = new Date(today)
      showDate.setDate(today.getDate() + daysUntilTarget)

      // Parse orari
      const [startHour, startMin] = show.startTime.split(':').map(Number)
      const [endHour, endMin] = show.endTime.split(':').map(Number)

      const start = new Date(showDate)
      start.setHours(startHour, startMin, 0, 0)

      const end = new Date(showDate)
      end.setHours(endHour, endMin, 0, 0)

      events.push({
        id: show.id,
        title: show.title,
        start,
        end,
        extendedProps: {
          artist: show.artist,
          genres: show.genres
        }
      })
    })
  })

  calendarEvents.value = events
}

const refreshStreamStatus = async () => {
  loading.value = true
  try {
    await Promise.all([
      loadLiveInfo(),
      loadCurrentShow(),
      loadStatistics()
    ])

    toast.add({
      severity: 'success',
      summary: 'Refreshed',
      detail: 'Stream status updated',
      life: 2000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to refresh status',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const openAirtimeDashboard = () => {
  const airtimeUrl = import.meta.env.VITE_AIRTIME_URL || 'https://bugradio2024.airtime.pro'
  window.open(airtimeUrl, '_blank')
}

// Episodes Methods
const loadUploadedEpisodes = async () => {
  loadingEpisodes.value = true
  try {
    const response = await api.get('/admin/streaming/uploaded-episodes')
    if (Array.isArray(response.data)) {
      uploadedEpisodes.value = response.data
    } else {
      console.warn('Invalid response format:', response.data)
      uploadedEpisodes.value = []
      toast.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Invalid response format from server',
        life: 3000
      })
    }
  } catch (error) {
    console.error('Error loading episodes:', error)
    uploadedEpisodes.value = []

    let errorMessage = 'Failed to load episodes'
    if (error.response?.status === 401) {
      errorMessage = 'Authentication failed - please login again'
    } else if (error.response?.status === 403) {
      errorMessage = 'Not authorized to access episodes'
    }

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 3000
    })
  } finally {
    loadingEpisodes.value = false
  }
}

const downloadEpisode = async (episodeId, title) => {
  loadingDownload.value = episodeId
  try {
    const link = document.createElement('a')
    link.href = `/api/admin/streaming/episodes/${episodeId}/download`
    link.download = title || 'episode'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.add({
      severity: 'success',
      summary: 'Downloaded',
      detail: 'File ready for manual Airtime upload',
      life: 3000
    })
  } catch (error) {
    console.error('Error downloading episode:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to download episode',
      life: 3000
    })
  } finally {
    loadingDownload.value = null
  }
}

const deleteEpisode = async (episodeId, title) => {
  if (!confirm(`Delete "${title}" from server?`)) return

  try {
    await api.delete(`/admin/streaming/episodes/${episodeId}/file`)
    await loadUploadedEpisodes()

    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: 'Episode deleted from server',
      life: 3000
    })
  } catch (error) {
    console.error('Error deleting episode:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete episode',
      life: 3000
    })
  }
}

const showMarkUploadedDialog = (episode) => {
  if (!episode || !episode.id) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Invalid episode data',
      life: 3000
    })
    return
  }
  selectedEpisode.value = episode
  airtimeFileId.value = ''
  markUploadedDialog.value = true
}

const confirmMarkUploaded = async () => {
  if (!selectedEpisode.value || !selectedEpisode.value.id) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No episode selected',
      life: 3000
    })
    return
  }

  if (!airtimeFileId.value.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Required',
      detail: 'Please enter Airtime File ID',
      life: 3000
    })
    return
  }

  loadingMarkUploaded.value = true
  try {
    await api.post(
        `/admin/streaming/episodes/${selectedEpisode.value.id}/mark-uploaded`,
        { airtimeFileId: airtimeFileId.value }
    )

    markUploadedDialog.value = false
    await loadUploadedEpisodes()

    toast.add({
      severity: 'success',
      summary: 'Marked',
      detail: 'Episode marked as uploaded to Airtime',
      life: 3000
    })
  } catch (error) {
    console.error('Error marking episode as uploaded:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to mark episode as uploaded',
      life: 3000
    })
  } finally {
    loadingMarkUploaded.value = false
  }
}

// Audio Player Methods
const togglePlay = async () => {
  if (!audioPlayer.value) {
    console.error('Audio player ref not available')
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: 'Player non inizializzato',
      life: 3000
    })
    return
  }

  console.log('Toggle play, current state:', isPlaying.value)
  console.log('Stream URL:', streamUrl.value)
  console.log('Audio element:', audioPlayer.value)

  try {
    if (isPlaying.value) {
      audioPlayer.value.pause()
      isPlaying.value = false
      console.log('Audio paused')
    } else {
      // Assicurati che l'URL sia impostato
      if (!audioPlayer.value.src) {
        audioPlayer.value.src = streamUrl.value
        console.log('Set audio src to:', streamUrl.value)
      }

      // Prova a caricare prima
      audioPlayer.value.load()
      console.log('Audio loaded, attempting play...')

      await audioPlayer.value.play()
      isPlaying.value = true
      console.log('Audio playing successfully')

      toast.add({
        severity: 'success',
        summary: 'Streaming',
        detail: 'Connesso allo stream live',
        life: 2000
      })
    }
  } catch (error) {
    console.error('Error playing audio:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    isPlaying.value = false

    let errorDetail = 'Impossibile riprodurre lo streaming'
    if (error.name === 'NotAllowedError') {
      errorDetail = 'Permesso audio negato dal browser. Clicca di nuovo per riprovare.'
    } else if (error.name === 'NotSupportedError') {
      errorDetail = 'Formato stream non supportato'
    } else if (error.name === 'AbortError') {
      errorDetail = 'Caricamento stream interrotto'
    }

    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: errorDetail,
      life: 5000
    })
  }
}

const updateVolume = (value) => {
  if (audioPlayer.value) {
    audioPlayer.value.volume = value / 100
  }
}

const toggleMute = () => {
  if (volume.value === 0) {
    volume.value = previousVolume.value || 70
  } else {
    previousVolume.value = volume.value
    volume.value = 0
  }
  updateVolume(volume.value)
}

// Lifecycle
onMounted(() => {
  console.log('Component mounted, initializing...')

  loadLiveInfo()
  loadCurrentShow()
  loadStatistics()
  loadWeekSchedule()
  loadUploadedEpisodes()

  // Initialize audio player
  if (audioPlayer.value) {
    console.log('Audio player ref found:', audioPlayer.value)
    console.log('Setting initial volume to:', volume.value)
    audioPlayer.value.volume = volume.value / 100

    // Handle audio errors
    audioPlayer.value.addEventListener('error', (e) => {
      console.error('Audio player error event:', e)
      console.error('Error code:', audioPlayer.value.error?.code)
      console.error('Error message:', audioPlayer.value.error?.message)

      isPlaying.value = false

      let errorMsg = 'Problema nella connessione allo streaming'
      if (audioPlayer.value.error) {
        switch(audioPlayer.value.error.code) {
          case 1: errorMsg = 'Caricamento stream interrotto'; break;
          case 2: errorMsg = 'Errore di rete'; break;
          case 3: errorMsg = 'Errore di decodifica stream'; break;
          case 4: errorMsg = 'Formato stream non supportato'; break;
        }
      }

      toast.add({
        severity: 'error',
        summary: 'Errore Stream',
        detail: errorMsg,
        life: 5000
      })
    })

    // Handle audio ended
    audioPlayer.value.addEventListener('ended', () => {
      console.log('Audio ended event')
      isPlaying.value = false
    })

    // Handle can play
    audioPlayer.value.addEventListener('canplay', () => {
      console.log('Audio can play event - stream ready')
    })

    // Handle loading
    audioPlayer.value.addEventListener('loadstart', () => {
      console.log('Audio load start event')
    })

    // Handle waiting
    audioPlayer.value.addEventListener('waiting', () => {
      console.log('Audio waiting event - buffering...')
    })

    // Handle playing
    audioPlayer.value.addEventListener('playing', () => {
      console.log('Audio playing event - stream started')
    })

    console.log('Audio player event listeners attached')
  } else {
    console.error('Audio player ref NOT found!')
  }

  // Auto-refresh every 30 seconds
  refreshInterval = setInterval(() => {
    console.log('Auto-refresh triggered')
    loadLiveInfo()
    loadCurrentShow()
  }, 30000)

  console.log('Initialization complete')
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // Stop audio player
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.src = ''
  }
})
</script>

<style scoped>
/* Status Card */
.stream-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator i {
  font-size: 2rem;
}

.status-indicator h2 {
  margin: 0;
  font-size: 1.5rem;
}

.listeners-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

/* Now Playing Card */
.now-playing {
  display: flex;
  gap: 1.5rem;
}

.album-art {
  flex-shrink: 0;
  width: 200px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
}

.album-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-artwork {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-artwork i {
  font-size: 4rem;
  color: white;
  opacity: 0.5;
}

.track-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-top: auto;
}

.track-info h3 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  color: #1f2937;
}

.track-info .artist {
  margin: 0 0 0.5rem;
  color: #6b7280;
}

.show-name {
  margin: 0.5rem 0;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-section {
  margin-top: auto;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.track-progress {
  height: 8px;
}

/* Queue Card */
.queue-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  transition: background 0.2s;
}

.queue-item:hover {
  background: #f3f4f6;
}

.queue-number {
  width: 30px;
  height: 30px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.queue-info {
  flex: 1;
}

.queue-title {
  margin: 0 0 0.25rem;
  font-weight: 600;
  color: #1f2937;
}

.queue-artist {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.queue-duration {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Current Show Card */
.current-show {
  display: flex;
  gap: 1.5rem;
}

.show-image {
  flex-shrink: 0;
  width: 150px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
}

.show-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-image i {
  font-size: 3rem;
  color: white;
  opacity: 0.5;
}

.show-details {
  flex: 1;
}

.show-details h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  color: #1f2937;
}

.show-artist {
  margin: 0 0 0.75rem;
  color: #6b7280;
}

.show-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: #6b7280;
}

.show-genres {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Controls Card */
.controls-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.input-with-copy {
  display: flex;
  gap: 0.5rem;
}

.info-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  color: #1f2937;
}

.info-display i {
  color: #3b82f6;
}

/* Statistics */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-item i {
  font-size: 2rem;
  color: #3b82f6;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1f2937;
}

/* Episodes Section */
.episodes-card {
  margin-top: 2rem;
}

.episodes-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-box {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #dbeafe;
  border-left: 4px solid #3b82f6;
  border-radius: 6px;
}

.info-box i {
  color: #3b82f6;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.info-box p {
  margin: 0;
  color: #1e40af;
  font-size: 0.875rem;
}

.info-box p:first-child {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.episodes-table {
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* Mark Uploaded Dialog */
.mark-uploaded-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.instructions {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.hint {
  color: #9ca3af;
  font-size: 0.8rem;
}

/* Empty States */
.no-content {
  text-align: center;
  padding: 3rem 2rem;
  color: #6b7280;
}

.no-content i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-content p {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
}

.no-content small {
  color: #9ca3af;
}

.w-full {
  width: 100%;
}

/* Schedule Calendar */
.schedule-card {
  margin-top: 2rem;
}

.schedule-card :deep(.fc) {
  font-family: inherit;
}

.schedule-card :deep(.fc .fc-button) {
  background: #667eea;
  border-color: #667eea;
  text-transform: capitalize;
}

.schedule-card :deep(.fc .fc-button:hover) {
  background: #5568d3;
  border-color: #5568d3;
}

.schedule-card :deep(.fc .fc-button-active) {
  background: #4c51bf;
  border-color: #4c51bf;
}

.schedule-card :deep(.fc-theme-standard .fc-scrollgrid) {
  border-color: #e5e7eb;
}

.schedule-card :deep(.fc-theme-standard td),
.schedule-card :deep(.fc-theme-standard th) {
  border-color: #e5e7eb;
}

.schedule-card :deep(.fc-col-header-cell) {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  padding: 0.75rem;
}

.schedule-card :deep(.fc-event) {
  border: none;
  border-radius: 4px;
  padding: 2px 4px;
}

.schedule-card :deep(.fc-event:hover) {
  opacity: 0.85;
  cursor: pointer;
}

.schedule-card :deep(.fc-daygrid-event-dot) {
  border-color: #667eea;
}

.schedule-card :deep(.fc-timegrid-slot) {
  height: 3rem;
}

.schedule-card :deep(.fc-toolbar-title) {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.schedule-card :deep(.fc-today-button:disabled) {
  opacity: 0.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .now-playing,
  .current-show {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .track-info,
  .show-details {
    align-items: center;
  }
}

/* Audio Player Card */
.player-card {
  margin-top: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.player-card :deep(.p-card-content) {
  padding: 0;
}

.audio-player {
  padding: 1.5rem;
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.play-button {
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: white;
}

.player-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pulse-indicator {
  width: 12px;
  height: 12px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.status-text {
  font-size: 1rem;
  font-weight: 500;
}

.stream-quality {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.9;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.volume-control button {
  color: white;
}

.volume-slider-container {
  width: 120px;
}

.volume-slider :deep(.p-slider) {
  background: rgba(255, 255, 255, 0.3);
}

.volume-slider :deep(.p-slider-range) {
  background: white;
}

.volume-slider :deep(.p-slider-handle) {
  background: white;
  border-color: white;
}

.player-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.equalizer {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 24px;
}

.equalizer .bar {
  width: 4px;
  background: white;
  border-radius: 2px;
  animation: equalize 0.8s ease-in-out infinite;
}

.equalizer .bar:nth-child(1) {
  animation-delay: 0s;
}

.equalizer .bar:nth-child(2) {
  animation-delay: 0.1s;
}

.equalizer .bar:nth-child(3) {
  animation-delay: 0.2s;
}

.equalizer .bar:nth-child(4) {
  animation-delay: 0.3s;
}

.equalizer .bar:nth-child(5) {
  animation-delay: 0.4s;
}

@keyframes equalize {
  0%, 100% {
    height: 8px;
  }
  50% {
    height: 24px;
  }
}

.live-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  background: rgba(239, 68, 68, 0.9);
  padding: 0.5rem 1rem;
  border-radius: 20px;
}

.live-badge i {
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* Responsive for player */
@media (max-width: 768px) {
  .player-controls {
    flex-direction: column;
    gap: 1rem;
  }

  .player-info {
    text-align: center;
    align-items: center;
  }

  .volume-control {
    width: 100%;
    justify-content: center;
  }

  .volume-slider-container {
    width: 200px;
  }
}
</style>