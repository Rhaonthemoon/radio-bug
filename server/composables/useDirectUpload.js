// composables/useDirectUpload.js
// Composable per upload diretto a Backblaze B2

import { ref } from 'vue';
import api from '@/services/api';

export function useDirectUpload() {
    const uploading = ref(false);
    const progress = ref(0);
    const error = ref(null);

    /**
     * Upload diretto audio episodio a B2
     * @param {string} episodeId - ID episodio
     * @param {File} file - File audio
     * @param {Function} onProgress - Callback progresso (opzionale)
     */
    const uploadEpisodeAudio = async (episodeId, file, onProgress = null) => {
        uploading.value = true;
        progress.value = 0;
        error.value = null;

        try {
            // 1. Richiedi URL firmato dal backend
            console.log('📤 Richiesta URL firmato...');
            const presignRes = await api.post(`/upload/presign/episode/${episodeId}`, {
                filename: file.name,
                contentType: file.type || 'audio/mpeg'
            });

            const { presignedUrl, key, fileUrl } = presignRes.data;
            console.log('✔ URL firmato ottenuto');

            // 2. Upload diretto a B2
            console.log('📤 Upload diretto a B2...');
            await uploadToB2(presignedUrl, file, (p) => {
                progress.value = p;
                if (onProgress) onProgress(p);
            });
            console.log('✔ Upload completato');

            // 3. Ottieni metadata audio (durata, bitrate)
            const metadata = await getAudioMetadata(file);
            console.log('✔ Metadata:', metadata);

            // 4. Conferma upload al backend
            console.log('📤 Conferma upload...');
            const confirmRes = await api.post(`/upload/confirm/episode/${episodeId}`, {
                key,
                fileUrl,
                filename: file.name,
                size: file.size,
                duration: metadata.duration,
                bitrate: metadata.bitrate
            });

            console.log('✔ Upload confermato!');
            uploading.value = false;
            progress.value = 100;

            return confirmRes.data;

        } catch (err) {
            console.error('❌ Errore upload:', err);
            error.value = err.response?.data?.error || err.message;
            uploading.value = false;
            throw err;
        }
    };

    /**
     * Upload diretto audio show a B2
     * @param {string} showId - ID show
     * @param {File} file - File audio
     * @param {Function} onProgress - Callback progresso (opzionale)
     */
    const uploadShowAudio = async (showId, file, onProgress = null) => {
        uploading.value = true;
        progress.value = 0;
        error.value = null;

        try {
            // 1. Richiedi URL firmato dal backend
            console.log('📤 Richiesta URL firmato...');
            const presignRes = await api.post(`/upload/presign/show/${showId}`, {
                filename: file.name,
                contentType: file.type || 'audio/mpeg'
            });

            const { presignedUrl, key, fileUrl } = presignRes.data;
            console.log('✔ URL firmato ottenuto');

            // 2. Upload diretto a B2
            console.log('📤 Upload diretto a B2...');
            await uploadToB2(presignedUrl, file, (p) => {
                progress.value = p;
                if (onProgress) onProgress(p);
            });
            console.log('✔ Upload completato');

            // 3. Ottieni metadata audio
            const metadata = await getAudioMetadata(file);
            console.log('✔ Metadata:', metadata);

            // 4. Conferma upload al backend
            console.log('📤 Conferma upload...');
            const confirmRes = await api.post(`/upload/confirm/show/${showId}`, {
                key,
                fileUrl,
                filename: file.name,
                size: file.size,
                duration: metadata.duration,
                bitrate: metadata.bitrate
            });

            console.log('✔ Upload confermato!');
            uploading.value = false;
            progress.value = 100;

            return confirmRes.data;

        } catch (err) {
            console.error('❌ Errore upload:', err);
            error.value = err.response?.data?.error || err.message;
            uploading.value = false;
            throw err;
        }
    };

    /**
     * Upload file a B2 usando XMLHttpRequest (per progress)
     */
    const uploadToB2 = (presignedUrl, file, onProgress) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload fallito: ${xhr.status} ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Errore di rete durante upload'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload annullato'));
            });

            xhr.open('PUT', presignedUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
            xhr.send(file);
        });
    };

    /**
     * Ottieni metadata audio dal file
     */
    const getAudioMetadata = (file) => {
        return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';

            audio.onloadedmetadata = () => {
                const duration = Math.round(audio.duration);
                // Stima bitrate: (size in bits) / duration
                const bitrate = Math.round((file.size * 8) / audio.duration / 1000);
                
                URL.revokeObjectURL(audio.src);
                resolve({ duration, bitrate });
            };

            audio.onerror = () => {
                URL.revokeObjectURL(audio.src);
                resolve({ duration: null, bitrate: null });
            };

            audio.src = URL.createObjectURL(file);
        });
    };

    return {
        uploading,
        progress,
        error,
        uploadEpisodeAudio,
        uploadShowAudio
    };
}
