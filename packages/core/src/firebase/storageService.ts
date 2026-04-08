import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export interface UploadProgress {
    progress: number;
    url: string | null;
    error: Error | null;
}

export async function uploadVideoFile(
    uid: string,
    matchId: string,
    file: File,
    onProgress?: (p: number) => void
): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const storageRef = ref(storage, `users/${uid}/matches/${matchId}/video_${timestamp}.${fileExtension}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(Math.round(p));
            },
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadUrl);
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
}

export async function deleteVideoFile(fileUrl: string): Promise<void> {
    if (!fileUrl.includes('firebasestorage')) {
        return; // It's a local or external URL, do nothing
    }

    try {
        const fileRef = ref(storage, fileUrl);
        await deleteObject(fileRef);
    } catch (err) {
        console.error('Failed to delete video file:', err);
    }
}
