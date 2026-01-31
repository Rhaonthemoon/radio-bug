<template>
  <DashboardLayout page-title="Shows Management">
    <template #topbar-actions>
      <!-- Pulsante per creare show solo per admin -->
      <Button
        v-if="isAdmin"
        label="New Show"
        icon="pi pi-plus"
        @click="openDialog()"
      />
      <!-- Messaggio per artisti -->
    </template>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters">
          <Button
            :label="`Richieste Pending (${pendingRequestsCount})`"
            :severity="currentFilter === 'pending' ? 'warning' : 'secondary'"
            :outlined="currentFilter !== 'pending'"
            @click="currentFilter = 'pending'"
            icon="pi pi-clock"
          />
          <Button
            :label="`Attivi (${activeShowsCount})`"
            :severity="currentFilter === 'active' ? 'success' : 'secondary'"
            :outlined="currentFilter !== 'active'"
            @click="currentFilter = 'active'"
            icon="pi pi-check-circle"
          />
          <Button
            :label="`Inattivi (${inactiveShowsCount})`"
            :severity="currentFilter === 'inactive' ? 'info' : 'secondary'"
            :outlined="currentFilter !== 'inactive'"
            @click="currentFilter = 'inactive'"
            icon="pi pi-pause"
          />
          <Button
            :label="`Rifiutati (${rejectedRequestsCount})`"
            :severity="currentFilter === 'rejected' ? 'danger' : 'secondary'"
            :outlined="currentFilter !== 'rejected'"
            @click="currentFilter = 'rejected'"
            icon="pi pi-times"
          />
          <Button
            label="Tutti"
            :severity="currentFilter === 'all' ? 'contrast' : 'secondary'"
            :outlined="currentFilter !== 'all'"
            @click="currentFilter = 'all'"
            icon="pi pi-list"
          />
        </div>
      </template>
    </Card>

    <!-- Shows Table -->
    <Card>
      <template #content>
        <DataTable
          :value="filteredShows"
          :loading="showsStore.loading"
          paginator
          :rows="10"
          stripedRows
          sortField="updatedAt"
          :sortOrder="-1"
        >
          <template #empty>
            <div class="empty-state">
              <i class="pi pi-microphone" style="font-size: 3rem; color: #cbd5e1;"></i>
              <p>No shows {{ getFilterLabel() }}</p>
              <Button
                v-if="isAdmin"
                label="Create first show"
                icon="pi pi-plus"
                @click="openDialog()"
              />
            </div>
          </template>

          <Column field="title" header="Titolo" sortable style="min-width: 200px;"></Column>
          <Column field="artist.name" header="Artista" sortable></Column>
          <Column field="artist.email" header="Email" sortable></Column>
          <Column field="genres" header="Genres">
            <template #body="slotProps">
              <div class="genres-tags">
                <Tag
                  v-for="genre in slotProps.data.genres?.slice(0, 2)"
                  :key="genre"
                  :value="genre"
                  severity="info"
                  class="genre-tag"
                />
                <span v-if="slotProps.data.genres?.length > 2" class="more-genres">
                  +{{ slotProps.data.genres.length - 2 }}
                </span>
              </div>
            </template>
          </Column>
          <!-- Audio Column -->
          <Column header="Audio" style="width: 120px;">
            <template #body="slotProps">
              <div class="audio-status">
                <Tag
                  v-if="slotProps.data.audio?.filename"
                  value="Audio"
                  severity="success"
                  icon="pi pi-volume-up"
                />
                <Tag
                  v-else
                  value="No Audio"
                  severity="secondary"
                  icon="pi pi-volume-off"
                />
              </div>
            </template>
          </Column>
          <Column field="requestStatus" header="Status Richiesta" sortable>
            <template #body="slotProps">
              <Tag
                :value="getRequestStatusLabel(slotProps.data.requestStatus)"
                :severity="getRequestStatusSeverity(slotProps.data.requestStatus)"
              />
            </template>
          </Column>
          <Column field="status" header="Status Show" sortable>
            <template #body="slotProps">
              <Tag
                :value="getStatusLabel(slotProps.data.status)"
                :severity="getStatusSeverity(slotProps.data.status)"
              />
            </template>
          </Column>
          <Column field="featured" header="Featured" sortable>
            <template #body="slotProps">
              <i
                :class="slotProps.data.featured ? 'pi pi-star-fill' : 'pi pi-star'"
                :style="{ color: slotProps.data.featured ? '#f59e0b' : '#cbd5e1' }"
              ></i>
            </template>
          </Column>

          <!-- Actions for ADMIN -->
          <Column v-if="isAdmin" header="Actions" style="width: 300px;">
            <template #body="slotProps">
              <div class="action-buttons">
                <!-- Actions for pending requests -->
                <Button
                  v-if="slotProps.data.requestStatus === 'pending'"
                  icon="pi pi-check"
                  rounded
                  severity="success"
                  @click="approveRequest(slotProps.data)"
                  v-tooltip.top="'Approva Richiesta'"
                />
                <Button
                  v-if="slotProps.data.requestStatus === 'pending'"
                  icon="pi pi-times"
                  rounded
                  severity="danger"
                  @click="rejectRequest(slotProps.data)"
                  v-tooltip.top="'Rifiuta Richiesta'"
                />

                <!-- Audio button -->
                <Button
                  icon="pi pi-volume-up"
                  rounded
                  outlined
                  :severity="slotProps.data.audio?.filename ? 'success' : 'secondary'"
                  @click="openAudioDialog(slotProps.data)"
                  v-tooltip.top="'Manage Audio'"
                />

                <!-- Standard actions -->
                <Button
                  icon="pi pi-eye"
                  rounded
                  outlined
                  severity="info"
                  @click="viewShow(slotProps.data)"
                  v-tooltip.top="'Details'"
                />
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  severity="secondary"
                  @click="openEditDialog(slotProps.data)"
                  v-tooltip.top="'Edit'"
                />
                <Button
                  icon="pi pi-trash"
                  rounded
                  outlined
                  severity="danger"
                  @click="confirmDelete(slotProps.data)"
                  v-tooltip.top="'Delete'"
                />
              </div>
            </template>
          </Column>

          <!-- Actions for ARTISTS -->
          <Column v-else header="Actions" style="width: 200px;">
            <template #body="slotProps">
              <div class="action-buttons">
                <!-- Audio button - solo per show approvati -->
                <Button
                  v-if="slotProps.data.requestStatus === 'approved'"
                  icon="pi pi-volume-up"
                  rounded
                  outlined
                  :severity="slotProps.data.audio?.filename ? 'success' : 'secondary'"
                  @click="openAudioDialog(slotProps.data)"
                  v-tooltip.top="'Manage Audio'"
                />
                <Button
                  icon="pi pi-eye"
                  rounded
                  outlined
                  severity="info"
                  @click="viewShow(slotProps.data)"
                  v-tooltip.top="'Details'"
                />
                <!-- Edit button for artists - possono editare solo i propri show -->
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  severity="secondary"
                  @click="openEditDialog(slotProps.data)"
                  v-tooltip.top="'Edit'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Dialog Create/Edit Show -->
    <Dialog
      v-model:visible="editDialogVisible"
      :header="editMode ? (isArtist ? 'Edit Your Show' : 'Edit Show') : 'Create New Show'"
      :modal="true"
      :style="{ width: '800px' }"
      :closable="!formSubmitting"
      :closeOnEscape="!formSubmitting"
    >
      <div class="dialog-content">
        <!-- Messaggio per artisti -->
        <Message v-if="isArtist && editMode" severity="info" :closable="false" style="margin-bottom: 1.5rem;">
          You can edit your show details. Status changes require admin approval.
        </Message>

        <form @submit.prevent="handleSubmit">
          <!-- Basic Information Section -->
          <div class="form-section">
            <h3>Basic Information</h3>

            <div class="form-field">
              <label for="title">Show Title *</label>
              <InputText
                id="title"
                v-model="showForm.title"
                placeholder="Enter show title"
                :disabled="formSubmitting"
                class="w-full"
                :class="{ 'p-invalid': formErrors.title }"
              />
              <small v-if="formErrors.title" class="p-error">{{ formErrors.title }}</small>
            </div>

            <div class="form-field">
              <label for="description">Description *</label>
              <Textarea
                id="description"
                v-model="showForm.description"
                placeholder="Describe your show"
                rows="4"
                :disabled="formSubmitting"
                class="w-full"
                :class="{ 'p-invalid': formErrors.description }"
              />
              <small v-if="formErrors.description" class="p-error">{{ formErrors.description }}</small>
            </div>

            <!-- Campo Artist - SOLO PER ADMIN in creazione -->
            <div v-if="isAdmin && !editMode" class="form-field">
              <label for="artist">Artist *</label>
              <Dropdown
                id="artist"
                v-model="showForm.artistId"
                :options="artists"
                optionLabel="name"
                optionValue="_id"
                placeholder="Select artist"
                :disabled="formSubmitting"
                class="w-full"
                :class="{ 'p-invalid': formErrors.artistId }"
                filter
                showClear
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex align-items-center">
                    <div>{{ getArtistName(slotProps.value) }}</div>
                  </div>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="flex align-items-center">
                    <div>
                      <div>{{ slotProps.option.name }}</div>
                      <small class="text-muted">{{ slotProps.option.email }}</small>
                    </div>
                  </div>
                </template>
              </Dropdown>
              <small v-if="formErrors.artistId" class="p-error">{{ formErrors.artistId }}</small>
            </div>

            <!-- Info per artisti e admin in edit -->
            <div v-if="editMode || isArtist" class="form-field">
              <label>Artist</label>
              <div style="padding: 0.75rem; background: #f9fafb; border-radius: 6px; color: #6b7280;">
                {{ showForm.artistName || 'Artist information' }}
              </div>
              <small>Artist cannot be changed</small>
            </div>

            <div class="form-field">
              <label for="genres">Genres *</label>
              <MultiSelect
                id="genres"
                v-model="showForm.genres"
                :options="availableGenres"
                placeholder="Select genres"
                :disabled="formSubmitting"
                class="w-full"
                :class="{ 'p-invalid': formErrors.genres }"
                :maxSelectedLabels="3"
                filter
              />
              <small v-if="formErrors.genres" class="p-error">{{ formErrors.genres }}</small>
            </div>
          </div>

          <!-- Show Details Section -->
          <div class="form-section">
            <h3>Show Details</h3>

            <div class="form-row">
              <div class="form-field">
                <label for="frequency">Frequency</label>
                <InputText
                  id="frequency"
                  v-model="showForm.frequency"
                  placeholder="e.g., Weekly, Bi-weekly"
                  :disabled="formSubmitting"
                  class="w-full"
                />
                <small>How often this show airs</small>
              </div>

              <div class="form-field">
                <label for="duration">Duration</label>
                <InputText
                  id="duration"
                  v-model="showForm.duration"
                  placeholder="e.g., 2 hours"
                  :disabled="formSubmitting"
                  class="w-full"
                />
                <small>Typical duration of the show</small>
              </div>
            </div>

            <div class="form-field">
              <label for="broadcastDay">Broadcast Day</label>
              <Dropdown
                id="broadcastDay"
                v-model="showForm.broadcastDay"
                :options="daysOfWeek"
                placeholder="Select day"
                :disabled="formSubmitting"
                class="w-full"
                showClear
              />
              <small>Main broadcast day</small>
            </div>

            <div class="form-field">
              <label for="broadcastTime">Broadcast Time</label>
              <InputText
                id="broadcastTime"
                v-model="showForm.broadcastTime"
                placeholder="e.g., 18:00 - 20:00"
                :disabled="formSubmitting"
                class="w-full"
              />
              <small>Time slot for the show</small>
            </div>
          </div>

          <!-- Status Section - SOLO PER ADMIN -->
          <div v-if="isAdmin" class="form-section">
            <h3>Status & Settings</h3>

            <div class="form-field">
              <label for="status">Show Status *</label>
              <Dropdown
                id="status"
                v-model="showForm.status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select status"
                :disabled="formSubmitting"
                class="w-full"
                :class="{ 'p-invalid': formErrors.status }"
              />
              <small v-if="formErrors.status" class="p-error">{{ formErrors.status }}</small>
            </div>

            <div class="form-field">
              <label for="requestStatus">Request Status *</label>
              <Dropdown
                id="requestStatus"
                v-model="showForm.requestStatus"
                :options="requestStatusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select request status"
                :disabled="formSubmitting"
                class="w-full"
                :class="{ 'p-invalid': formErrors.requestStatus }"
              />
              <small v-if="formErrors.requestStatus" class="p-error">{{ formErrors.requestStatus }}</small>
            </div>

            <div class="checkbox-field">
              <Checkbox
                id="featured"
                v-model="showForm.featured"
                :binary="true"
                :disabled="formSubmitting"
              />
              <label for="featured">Featured Show</label>
            </div>
          </div>

          <!-- Social Media Section -->
          <div class="form-section">
            <h3>Social Media & Links</h3>

            <div class="form-field">
              <label for="socialMedia.facebook">Facebook</label>
              <InputText
                id="socialMedia.facebook"
                v-model="showForm.socialMedia.facebook"
                placeholder="Facebook URL"
                :disabled="formSubmitting"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="socialMedia.instagram">Instagram</label>
              <InputText
                id="socialMedia.instagram"
                v-model="showForm.socialMedia.instagram"
                placeholder="Instagram URL"
                :disabled="formSubmitting"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="socialMedia.twitter">Twitter</label>
              <InputText
                id="socialMedia.twitter"
                v-model="showForm.socialMedia.twitter"
                placeholder="Twitter URL"
                :disabled="formSubmitting"
                class="w-full"
              />
            </div>

            <div class="form-field">
              <label for="socialMedia.website">Website</label>
              <InputText
                id="socialMedia.website"
                v-model="showForm.socialMedia.website"
                placeholder="Website URL"
                :disabled="formSubmitting"
                class="w-full"
              />
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              @click="closeEditDialog"
              :disabled="formSubmitting"
            />
            <Button
              type="submit"
              :label="editMode ? 'Update Show' : 'Create Show'"
              :loading="formSubmitting"
              :disabled="formSubmitting"
            />
          </div>
        </form>
      </div>
    </Dialog>

    <!-- Dialog Gestione Audio Show -->
    <Dialog
      v-model:visible="audioDialogVisible"
      header="Show Audio Management"
      :modal="true"
      :style="{ width: '550px' }"
    >
      <div class="audio-dialog-content" v-if="selectedShowForAudio">
        <div class="show-info-header">
          <h4>{{ selectedShowForAudio.title }}</h4>
          <p class="artist-name">{{ selectedShowForAudio.artist?.name }}</p>
        </div>

        <!-- Avviso per artisti se lo show non è approvato -->
        <Message
          v-if="isArtist && selectedShowForAudio.requestStatus !== 'approved'"
          severity="warn"
          :closable="false"
          class="approval-warning"
        >
          You can only upload audio for approved shows. This show status is: {{ getRequestStatusLabel(selectedShowForAudio.requestStatus) }}
        </Message>

        <!-- If audio already exists -->
        <div v-if="selectedShowForAudio.audio?.filename" class="current-audio-section">
          <div class="audio-info-card">
            <div class="audio-icon">
              <i class="pi pi-file-audio"></i>
            </div>
            <div class="audio-details">
              <span class="audio-filename">{{ selectedShowForAudio.audio.originalName || selectedShowForAudio.audio.filename }}</span>
              <div class="audio-meta">
                <span v-if="selectedShowForAudio.audio.duration">
                  <i class="pi pi-clock"></i> {{ formatDuration(selectedShowForAudio.audio.duration) }}
                </span>
                <span v-if="selectedShowForAudio.audio.bitrate">
                  <i class="pi pi-chart-bar"></i> {{ selectedShowForAudio.audio.bitrate }} kbps
                </span>
              </div>
            </div>
          </div>

          <!-- Audio Player -->
          <div class="audio-player-wrapper">
            <audio
              ref="audioPlayerRef"
              :src="getAudioUrl(selectedShowForAudio)"
              controls
              class="audio-player"
              @play="isPlaying = true"
              @pause="isPlaying = false"
              @ended="isPlaying = false"
              @error="handleAudioError"
            ></audio>
          </div>

          <!-- Audio Actions -->
          <div class="audio-actions">
            <Button
              label="Play"
              icon="pi pi-play"
              severity="success"
              @click="playAudio"
              :disabled="isPlaying"
            />
            <Button
              label="Pause"
              icon="pi pi-pause"
              severity="secondary"
              @click="pauseAudio"
              :disabled="!isPlaying"
            />
            <Button
              label="Download"
              icon="pi pi-download"
              severity="info"
              @click="downloadAudio"
            />
            <Button
              v-if="canManageAudio"
              label="Delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              @click="confirmDeleteAudio"
            />
          </div>

          <!-- Replace Audio Section (only if user can manage) -->
          <div v-if="canManageAudio" class="upload-section">
            <h5>Replace Audio</h5>
            <p class="upload-hint">Select a new audio file to replace the current one</p>

            <div class="file-upload-wrapper">
              <input
                ref="audioFileInputRef"
                type="file"
                accept="audio/*"
                @change="handleAudioFileSelect"
                class="file-input"
              />
              <Button
                label="Select New Audio File"
                icon="pi pi-file"
                severity="secondary"
                outlined
                class="select-file-button"
                @click="triggerAudioFileInput"
                :disabled="audioUploading"
              />
            </div>

            <div v-if="selectedAudioFile" class="selected-file-info">
              <i class="pi pi-file-audio"></i>
              <span>{{ selectedAudioFile.name }}</span>
              <span class="file-size">({{ formatFileSize(selectedAudioFile.size) }})</span>
            </div>

            <Button
              v-if="selectedAudioFile"
              label="Upload New Audio"
              icon="pi pi-upload"
              class="upload-button"
              @click="handleAudioUpload"
              :loading="audioUploading"
              :disabled="audioUploading"
            />

            <div v-if="audioUploading" class="upload-progress">
              <ProgressBar :value="uploadProgress" />
              <p>Uploading... {{ uploadProgress }}%</p>
            </div>
          </div>
        </div>

        <!-- If no audio exists -->
        <div v-else class="no-audio-section">
          <div class="no-audio-icon">
            <i class="pi pi-volume-off"></i>
          </div>
          <p>No audio file uploaded yet</p>

          <!-- Upload Section (only if user can manage and show is approved) -->
          <div v-if="canManageAudio" class="upload-section">
            <h5>Upload Audio</h5>
            <p class="upload-hint">Supported formats: MP3, WAV, OGG. Max size: 200MB</p>

            <div class="file-upload-wrapper">
              <input
                ref="audioFileInputRef"
                type="file"
                accept="audio/*"
                @change="handleAudioFileSelect"
                class="file-input"
              />
              <Button
                label="Select Audio File"
                icon="pi pi-file"
                severity="primary"
                outlined
                class="select-file-button"
                @click="triggerAudioFileInput"
                :disabled="audioUploading"
              />
            </div>

            <div v-if="selectedAudioFile" class="selected-file-info">
              <i class="pi pi-file-audio"></i>
              <span>{{ selectedAudioFile.name }}</span>
              <span class="file-size">({{ formatFileSize(selectedAudioFile.size) }})</span>
            </div>

            <Button
              v-if="selectedAudioFile"
              label="Upload Audio"
              icon="pi pi-upload"
              class="upload-button"
              @click="handleAudioUpload"
              :loading="audioUploading"
              :disabled="audioUploading"
            />

            <div v-if="audioUploading" class="upload-progress">
              <ProgressBar :value="uploadProgress" />
              <p>Uploading... {{ uploadProgress }}%</p>
            </div>
          </div>

          <!-- Message for artists with unapproved shows -->
          <div v-else-if="isArtist" class="no-upload-message">
            <p>Audio upload is only available for approved shows</p>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- View Dialog -->
    <Dialog
      v-model:visible="viewDialogVisible"
      header="Show Details"
      :modal="true"
      :style="{ width: '700px' }"
    >
      <div v-if="selectedShow" class="view-dialog-content">
        <div class="detail-section">
          <h3>Basic Information</h3>
          <div class="detail-row">
            <span class="detail-label">Title:</span>
            <span class="detail-value">{{ selectedShow.title }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Description:</span>
            <span class="detail-value">{{ selectedShow.description }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Artist:</span>
            <span class="detail-value">{{ selectedShow.artist?.name }} ({{ selectedShow.artist?.email }})</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Genres:</span>
            <div class="genres-tags">
              <Tag
                v-for="genre in selectedShow.genres"
                :key="genre"
                :value="genre"
                severity="info"
              />
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Broadcast Information</h3>
          <div class="detail-row">
            <span class="detail-label">Frequency:</span>
            <span class="detail-value">{{ selectedShow.frequency || 'Not specified' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">{{ selectedShow.duration || 'Not specified' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Broadcast Day:</span>
            <span class="detail-value">{{ selectedShow.broadcastDay || 'Not specified' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Broadcast Time:</span>
            <span class="detail-value">{{ selectedShow.broadcastTime || 'Not specified' }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Status</h3>
          <div class="detail-row">
            <span class="detail-label">Request Status:</span>
            <Tag
              :value="getRequestStatusLabel(selectedShow.requestStatus)"
              :severity="getRequestStatusSeverity(selectedShow.requestStatus)"
            />
          </div>
          <div class="detail-row">
            <span class="detail-label">Show Status:</span>
            <Tag
              :value="getStatusLabel(selectedShow.status)"
              :severity="getStatusSeverity(selectedShow.status)"
            />
          </div>
          <div class="detail-row">
            <span class="detail-label">Featured:</span>
            <i
              :class="selectedShow.featured ? 'pi pi-star-fill' : 'pi pi-star'"
              :style="{ color: selectedShow.featured ? '#f59e0b' : '#cbd5e1' }"
            ></i>
          </div>
        </div>

        <div class="detail-section">
          <h3>Social Media</h3>
          <div class="detail-row" v-if="selectedShow.socialMedia?.facebook">
            <span class="detail-label">Facebook:</span>
            <a :href="selectedShow.socialMedia.facebook" target="_blank" class="detail-link">
              {{ selectedShow.socialMedia.facebook }}
            </a>
          </div>
          <div class="detail-row" v-if="selectedShow.socialMedia?.instagram">
            <span class="detail-label">Instagram:</span>
            <a :href="selectedShow.socialMedia.instagram" target="_blank" class="detail-link">
              {{ selectedShow.socialMedia.instagram }}
            </a>
          </div>
          <div class="detail-row" v-if="selectedShow.socialMedia?.twitter">
            <span class="detail-label">Twitter:</span>
            <a :href="selectedShow.socialMedia.twitter" target="_blank" class="detail-link">
              {{ selectedShow.socialMedia.twitter }}
            </a>
          </div>
          <div class="detail-row" v-if="selectedShow.socialMedia?.website">
            <span class="detail-label">Website:</span>
            <a :href="selectedShow.socialMedia.website" target="_blank" class="detail-link">
              {{ selectedShow.socialMedia.website }}
            </a>
          </div>
          <div v-if="!hasAnySocialMedia" class="detail-row">
            <span class="detail-value">No social media links</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Audio</h3>
          <div class="detail-row">
            <span class="detail-label">Audio Status:</span>
            <Tag
              v-if="selectedShow.audio?.filename"
              value="Audio Available"
              severity="success"
              icon="pi pi-volume-up"
            />
            <Tag
              v-else
              value="No Audio"
              severity="secondary"
              icon="pi pi-volume-off"
            />
          </div>
          <div v-if="selectedShow.audio?.filename" class="detail-row">
            <span class="detail-label">Filename:</span>
            <span class="detail-value">{{ selectedShow.audio.originalName || selectedShow.audio.filename }}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Metadata</h3>
          <div class="detail-row">
            <span class="detail-label">Created:</span>
            <span class="detail-value">{{ formatDate(selectedShow.createdAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Last Updated:</span>
            <span class="detail-value">{{ formatDate(selectedShow.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog></ConfirmDialog>
  </DashboardLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useShowsStore } from '@/stores/shows'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import DashboardLayout from '@/components/DashboardLayout.vue'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const showsStore = useShowsStore()
const authStore = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

// Artists state (gestito localmente invece che con store)
const artists = ref([])
const artistsLoading = ref(false)

// Computed
const isArtist = computed(() => {
  const role = authStore.user?.role
  console.log('Current user role:', role) // Debug log
  return role === 'artist'
})

const isAdmin = computed(() => {
  const role = authStore.user?.role
  return role === 'admin' || role === 'superadmin'
})

// Current filter
const currentFilter = ref('all')

// Filter counts
const pendingRequestsCount = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'pending').length
)

const activeShowsCount = computed(() =>
  showsStore.shows.filter(s => s.status === 'active').length
)

const inactiveShowsCount = computed(() =>
  showsStore.shows.filter(s => s.status === 'inactive').length
)

const rejectedRequestsCount = computed(() =>
  showsStore.shows.filter(s => s.requestStatus === 'rejected').length
)

// Filtered shows
const filteredShows = computed(() => {
  switch (currentFilter.value) {
    case 'pending':
      return showsStore.shows.filter(s => s.requestStatus === 'pending')
    case 'active':
      return showsStore.shows.filter(s => s.status === 'active')
    case 'inactive':
      return showsStore.shows.filter(s => s.status === 'inactive')
    case 'rejected':
      return showsStore.shows.filter(s => s.requestStatus === 'rejected')
    default:
      return showsStore.shows
  }
})

// Edit Dialog
const editDialogVisible = ref(false)
const editMode = ref(false)
const editingShowId = ref(null)
const formSubmitting = ref(false)
const formErrors = ref({})

// Form data
const showForm = ref({
  title: '',
  description: '',
  artistId: '',
  artistName: '',
  genres: [],
  frequency: '',
  duration: '',
  broadcastDay: '',
  broadcastTime: '',
  status: 'active',
  requestStatus: 'approved',
  featured: false,
  socialMedia: {
    facebook: '',
    instagram: '',
    twitter: '',
    website: ''
  }
})

// Form options
const availableGenres = [
  'Rock', 'Pop', 'Jazz', 'Classical', 'Electronic',
  'Hip Hop', 'R&B', 'Country', 'Blues', 'Reggae',
  'Metal', 'Punk', 'Soul', 'Funk', 'Disco',
  'House', 'Techno', 'Trance', 'Indie', 'Alternative'
]

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday'
]

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const requestStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' }
]

// View Dialog
const viewDialogVisible = ref(false)
const selectedShow = ref(null)

// Audio Dialog
const audioDialogVisible = ref(false)
const selectedShowForAudio = ref(null)
const audioFileInputRef = ref(null)
const selectedAudioFile = ref(null)
const audioUploading = ref(false)
const uploadProgress = ref(0)
const audioPlayerRef = ref(null)
const isPlaying = ref(false)

// Computed for audio management permissions
const canManageAudio = computed(() => {
  if (!selectedShowForAudio.value) return false

  // Admin can always manage
  if (!isArtist.value) return true

  // Artist can only manage if show is approved
  return selectedShowForAudio.value.requestStatus === 'approved'
})

// Helper computed for view dialog
const hasAnySocialMedia = computed(() => {
  if (!selectedShow.value?.socialMedia) return false
  const sm = selectedShow.value.socialMedia
  return sm.facebook || sm.instagram || sm.twitter || sm.website
})

// Helper functions
const getFilterLabel = () => {
  switch (currentFilter.value) {
    case 'pending': return 'with pending status'
    case 'active': return 'that are active'
    case 'inactive': return 'that are inactive'
    case 'rejected': return 'that are rejected'
    default: return ''
  }
}

const getRequestStatusLabel = (status) => {
  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected'
  }
  return labels[status] || status
}

const getRequestStatusSeverity = (status) => {
  const severities = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return severities[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = {
    active: 'Active',
    inactive: 'Inactive'
  }
  return labels[status] || status
}

const getStatusSeverity = (status) => {
  const severities = {
    active: 'success',
    inactive: 'info'
  }
  return severities[status] || 'info'
}

const getArtistName = (artistId) => {
  const artist = artists.value.find(a => a._id === artistId)
  return artist?.name || 'Unknown'
}

// Fetch artists
const fetchArtists = async () => {
  artistsLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_URL}/api/artists`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    artists.value = response.data
  } catch (error) {
    console.error('Error fetching artists:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load artists',
      life: 3000
    })
  } finally {
    artistsLoading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (seconds) => {
  if (!seconds) return 'Unknown'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  return `${minutes}m ${secs}s`
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Reset form
const resetForm = () => {
  showForm.value = {
    title: '',
    description: '',
    artistId: '',
    artistName: '',
    genres: [],
    frequency: '',
    duration: '',
    broadcastDay: '',
    broadcastTime: '',
    status: 'active',
    requestStatus: 'approved',
    featured: false,
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: '',
      website: ''
    }
  }
  formErrors.value = {}
}

// Validate form
const validateForm = () => {
  const errors = {}

  if (!showForm.value.title?.trim()) {
    errors.title = 'Title is required'
  }

  if (!showForm.value.description?.trim()) {
    errors.description = 'Description is required'
  }

  // artistId è richiesto solo per admin in creazione
  if (isAdmin.value && !editMode.value && !showForm.value.artistId) {
    errors.artistId = 'Artist is required'
  }

  if (!showForm.value.genres || showForm.value.genres.length === 0) {
    errors.genres = 'At least one genre is required'
  }

  // Status validation solo per admin
  if (isAdmin.value) {
    if (!showForm.value.status) {
      errors.status = 'Status is required'
    }

    if (!showForm.value.requestStatus) {
      errors.requestStatus = 'Request status is required'
    }
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// Open edit dialog (create mode)
const openDialog = () => {
  resetForm()
  editMode.value = false
  editingShowId.value = null
  editDialogVisible.value = true
}

// Open edit dialog (edit mode)
const openEditDialog = (show) => {
  // Controllo permessi: artisti possono editare solo i propri show
  if (isArtist.value) {
    const currentUserId = authStore.user?._id || authStore.user?.id

    // Lo show non ha artistId, ma ha createdBy che contiene l'ID dell'utente che l'ha creato
    let showArtistId = null

    if (show.createdBy) {
      if (typeof show.createdBy === 'object') {
        showArtistId = show.createdBy._id || show.createdBy.id
      } else {
        showArtistId = show.createdBy
      }
    }

    console.log('=== Edit Permission Check ===')
    console.log('Current User ID:', currentUserId)
    console.log('Show Artist ID (from createdBy):', showArtistId)
    console.log('============================')

    if (!showArtistId) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot determine show creator. Please contact admin.',
        life: 3000
      })
      return
    }

    if (currentUserId !== showArtistId) {
      toast.add({
        severity: 'error',
        summary: 'Permission Denied',
        detail: 'You can only edit your own shows',
        life: 3000
      })
      return
    }
  }

  resetForm()
  editMode.value = true
  editingShowId.value = show._id

  // Populate form with show data
  // Per artistId, usiamo createdBy visto che non c'è un campo artistId nello show
  let artistId = ''
  if (show.createdBy) {
    if (typeof show.createdBy === 'object') {
      artistId = show.createdBy._id || show.createdBy.id || ''
    } else {
      artistId = show.createdBy
    }
  }

  showForm.value = {
    title: show.title || '',
    description: show.description || '',
    artistId: artistId,
    artistName: show.artist?.name || show.createdBy?.name || '',
    genres: show.genres || [],
    frequency: show.schedule?.frequency || show.frequency || '',
    duration: show.duration || '',
    broadcastDay: show.schedule?.dayOfWeek || show.broadcastDay || '',
    broadcastTime: show.schedule?.timeSlot || show.broadcastTime || '',
    status: show.status || 'active',
    requestStatus: show.requestStatus || 'approved',
    featured: show.featured || false,
    socialMedia: {
      facebook: show.socialMedia?.facebook || '',
      instagram: show.socialMedia?.instagram || '',
      twitter: show.socialMedia?.twitter || '',
      website: show.socialMedia?.website || ''
    }
  }

  editDialogVisible.value = true
}

// Close edit dialog
const closeEditDialog = () => {
  if (!formSubmitting.value) {
    editDialogVisible.value = false
    resetForm()
  }
}

// Handle form submit
const handleSubmit = async () => {
  if (!validateForm()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please fix the errors in the form',
      life: 3000
    })
    return
  }

  formSubmitting.value = true

  try {
    // Prepara i dati da inviare
    let dataToSubmit = { ...showForm.value }

    // Se l'utente è un artista, rimuovi i campi che non può modificare
    if (isArtist.value && editMode.value) {
      // Gli artisti non possono modificare status, requestStatus e featured
      delete dataToSubmit.status
      delete dataToSubmit.requestStatus
      delete dataToSubmit.featured
    }

    if (editMode.value) {
      // Update existing show
      await showsStore.updateShow(editingShowId.value, dataToSubmit)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Show updated successfully',
        life: 3000
      })
    } else {
      // Create new show (solo admin)
      if (isArtist.value) {
        toast.add({
          severity: 'error',
          summary: 'Permission Denied',
          detail: 'Artists cannot create new shows',
          life: 3000
        })
        formSubmitting.value = false
        return
      }

      await showsStore.createShow(dataToSubmit)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Show created successfully',
        life: 3000
      })
    }

    closeEditDialog()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || `Failed to ${editMode.value ? 'update' : 'create'} show`,
      life: 3000
    })
  } finally {
    formSubmitting.value = false
  }
}

// View show details
const viewShow = (show) => {
  selectedShow.value = show
  viewDialogVisible.value = true
}

// Approve request
const approveRequest = async (show) => {
  try {
    await showsStore.approveShow(show._id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Show request approved',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to approve show request',
      life: 3000
    })
  }
}

// Reject request
const rejectRequest = async (show) => {
  try {
    await showsStore.rejectShow(show._id)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Show request rejected',
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to reject show request',
      life: 3000
    })
  }
}

// Confirm delete
const confirmDelete = (show) => {
  confirm.require({
    message: `Are you sure you want to delete "${show.title}"? This action cannot be undone.`,
    header: 'Delete Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await showsStore.deleteShow(show._id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Show deleted successfully',
          life: 3000
        })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete show',
          life: 3000
        })
      }
    }
  })
}

// Audio Dialog functions
const openAudioDialog = (show) => {
  selectedShowForAudio.value = show
  selectedAudioFile.value = null
  audioUploading.value = false
  uploadProgress.value = 0
  isPlaying.value = false
  audioDialogVisible.value = true
}

const triggerAudioFileInput = () => {
  audioFileInputRef.value?.click()
}

const handleAudioFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Please select an audio file',
        life: 3000
      })
      return
    }

    // Validate file size (200MB)
    if (file.size > 200 * 1024 * 1024) {
      toast.add({
        severity: 'error',
        summary: 'File Too Large',
        detail: 'Maximum file size is 200MB',
        life: 3000
      })
      return
    }

    selectedAudioFile.value = file
  }
}

const handleAudioUpload = async () => {
  if (!selectedAudioFile.value || !selectedShowForAudio.value) return

  audioUploading.value = true
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    formData.append('audio', selectedAudioFile.value)

    await showsStore.uploadShowAudio(selectedShowForAudio.value._id, formData, (progress) => {
      uploadProgress.value = progress
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Audio uploaded successfully',
      life: 3000
    })

    // Reset file input
    selectedAudioFile.value = null
    if (audioFileInputRef.value) {
      audioFileInputRef.value.value = ''
    }

    // Refresh show data
    selectedShowForAudio.value = showsStore.shows.find(s => s._id === selectedShowForAudio.value._id)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Upload Error',
      detail: error.message || 'Failed to upload audio',
      life: 3000
    })
  } finally {
    audioUploading.value = false
    uploadProgress.value = 0
  }
}

const getAudioUrl = (show) => {
  if (!show?.audio?.filename) return ''
  return `${import.meta.env.VITE_API_URL}/uploads/audio/${show.audio.filename}`
}

const playAudio = () => {
  audioPlayerRef.value?.play()
}

const pauseAudio = () => {
  audioPlayerRef.value?.pause()
}

const downloadAudio = () => {
  if (!selectedShowForAudio.value?.audio?.filename) return

  const url = getAudioUrl(selectedShowForAudio.value)
  const link = document.createElement('a')
  link.href = url
  link.download = selectedShowForAudio.value.audio.originalName || selectedShowForAudio.value.audio.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleAudioError = (event) => {
  console.error('Audio playback error:', event)
  toast.add({
    severity: 'error',
    summary: 'Playback Error',
    detail: 'Failed to load audio file',
    life: 3000
  })
}

const confirmDeleteAudio = () => {
  confirm.require({
    message: 'Are you sure you want to delete this audio file? This action cannot be undone.',
    header: 'Delete Audio Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await showsStore.deleteShowAudio(selectedShowForAudio.value._id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Audio deleted successfully',
          life: 3000
        })

        // Refresh show data
        selectedShowForAudio.value = showsStore.shows.find(s => s._id === selectedShowForAudio.value._id)
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete audio',
          life: 3000
        })
      }
    }
  })
}

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([
      showsStore.fetchShows(),
      fetchArtists()
    ])
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error loading data',
      life: 3000
    })
  }
})
</script>

<style scoped>
.filters-card {
  margin-bottom: 2rem;
}

.filters {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-state p {
  margin: 1rem 0;
  color: #6b7280;
  font-size: 1.125rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.genres-tags {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.genre-tag {
  font-size: 0.75rem;
}

.more-genres {
  color: #6b7280;
  font-size: 0.875rem;
}

.audio-status {
  display: flex;
  justify-content: center;
}

/* Audio Dialog Styles */
.audio-dialog-content {
  padding: 0.5rem 0;
}

.show-info-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.show-info-header h4 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  color: #1f2937;
}

.show-info-header .artist-name {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.approval-warning {
  margin-bottom: 1rem;
}

.current-audio-section {
  margin-bottom: 1.5rem;
}

.audio-info-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.audio-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-icon i {
  font-size: 1.5rem;
  color: white;
}

.audio-details {
  flex: 1;
}

.audio-filename {
  display: block;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.25rem;
  word-break: break-all;
}

.audio-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.audio-meta i {
  margin-right: 0.25rem;
}

.audio-player-wrapper {
  margin-bottom: 1rem;
}

.audio-player {
  width: 100%;
  height: 40px;
}

.audio-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.no-audio-section {
  text-align: center;
  padding: 2rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.no-audio-icon {
  width: 64px;
  height: 64px;
  background: #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.no-audio-icon i {
  font-size: 2rem;
  color: #9ca3af;
}

.no-audio-section p {
  margin: 0;
  color: #6b7280;
}

.upload-section {
  margin-top: 1rem;
}

.upload-section h5 {
  margin: 0 0 0.5rem;
  color: #1f2937;
}

.upload-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.file-upload-wrapper {
  margin-bottom: 1rem;
}

.file-input {
  display: none;
}

.select-file-button {
  width: 100%;
}

.selected-file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #eff6ff;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.selected-file-info i {
  color: #3b82f6;
}

.file-size {
  color: #6b7280;
  font-size: 0.75rem;
}

.upload-button {
  width: 100%;
}

.upload-progress {
  text-align: center;
  padding: 1rem;
}

.upload-progress p {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.no-upload-message {
  text-align: center;
  padding: 1rem;
  background: #fef3c7;
  border-radius: 6px;
  margin-top: 1rem;
}

.no-upload-message p {
  margin: 0;
  color: #92400e;
  font-size: 0.875rem;
}

/* Form Styles */
.dialog-content {
  padding: 1rem 0;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section h3 {
  margin: 0 0 1rem;
  color: #1f2937;
  font-size: 1.125rem;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}

.form-field small {
  display: block;
  margin-top: 0.4rem;
  color: #6b7280;
  font-size: 0.85rem;
}

.form-field small.p-error {
  color: #ef4444;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.w-full {
  width: 100%;
}

/* View Dialog Styles */
.view-dialog-content {
  padding: 0.5rem 0;
}

.detail-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h3 {
  margin: 0 0 1rem;
  color: #1f2937;
  font-size: 1.125rem;
}

.detail-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  align-items: center;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-weight: 600;
  color: #6b7280;
  min-width: 140px;
}

.detail-value {
  color: #1f2937;
  flex: 1;
}

.detail-link {
  color: #3b82f6;
  text-decoration: none;
  flex: 1;
}

.detail-link:hover {
  text-decoration: underline;
}
</style>
