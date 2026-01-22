import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  limit,
  startAfter,
  orderBy,
  type Firestore,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';

export interface SiteSettings {
  id: string;
  loginBackgroundUrl: string;
  aboutImage: string;
  aboutText: string;
  updatedAt: string;
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  const firebaseConfig = {
    apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
    measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID
  };

  // Initialize Firebase if not already initialized
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    // Initialize services
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

// Auth utilities
export interface AuthError {
  code: string;
  message: string;
}

export const getCurrentUser = (): Promise<User | null> => {
  if (!auth) return Promise.resolve(null);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const checkAdminStatus = async (user: User): Promise<boolean> => {
  if (!db || !user) return false;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists() && userDoc.data()?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  if (!auth) throw new Error('Authentication is not initialized');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw formatAuthError(error as AuthError);
  }
};

export const logoutUser = async (): Promise<void> => {
  if (!auth) throw new Error('Authentication is not initialized');

  try {
    await signOut(auth);
  } catch (error) {
    throw formatAuthError(error as AuthError);
  }
};

// Image utilities
export interface ImageUploadProgress {
  progress: number;
  status: 'running' | 'error' | 'success';
  error?: string;
}

export interface ImageMetadata {
  id: string;
  url: string;
  fileName: string;
  description: string;
  labels: string[];
  createdAt: string;
  position: number;
}

export const uploadImage = async (
  file: File,
  onProgress?: (progress: ImageUploadProgress) => void
): Promise<ImageMetadata> => {
  if (!storage || !db) throw new Error('Firebase services not initialized');

  try {
    const storageRef = ref(storage, `images/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress,
            status: 'running'
          });
        },
        (error) => {
          onProgress?.({
            progress: 0,
            status: 'error',
            error: error.message
          });
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const imageData: Omit<ImageMetadata, 'id'> = {
              url: downloadURL,
              fileName: file.name,
              description: '',
              labels: [],
              createdAt: new Date().toISOString(),
              position: 0
            };

            const docRef = doc(collection(db, 'images'));
            await setDoc(docRef, imageData);

            onProgress?.({
              progress: 100,
              status: 'success'
            });

            resolve({ id: docRef.id, ...imageData });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    throw new Error(`Failed to upload image: ${error}`);
  }
};

// Pagination result type
export interface PaginatedImagesResult {
  images: ImageMetadata[];
  lastVisible: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const getPaginatedImages = async (
  pageSize: number,
  lastVisible: QueryDocumentSnapshot | null = null,
  category: string | null = null
): Promise<PaginatedImagesResult> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    let imagesQuery;
    const imagesCollection = collection(db, 'images');

    // Base constraints
    const constraints: any[] = [];

    if (category) {
      constraints.push(where('labels', 'array-contains', category));
    }

    // Ordering
    // Note: If filtering by array-contains (labels), you often need the index to match. 
    // Usually 'position' asc, 'createdAt' desc is what we want.
    // However, array-contains queries require the field to be the first orderBy field? 
    // No, but composite indexes might be needed.
    // Let's stick to the original order: orderBy('position', 'asc'), orderBy('createdAt', 'desc')
    // constraints.push(orderBy('position', 'asc')); // Commented out to prevent hiding images without 'position'
    constraints.push(orderBy('createdAt', 'desc'));

    // Pagination
    if (lastVisible) {
      constraints.push(startAfter(lastVisible));
    }

    constraints.push(limit(pageSize));

    console.log('Fetching images with constraints:', { category, pageSize, lastVisible });


    imagesQuery = query(imagesCollection, ...constraints);

    const querySnapshot = await getDocs(imagesQuery);
    const images = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ImageMetadata));

    const newLastVisible = querySnapshot.docs.length > 0
      ? querySnapshot.docs[querySnapshot.docs.length - 1]
      : null;

    // Simple check: if we got fewer than requested, there's definitely no more.
    // If we got exactly pageSize, there MIGHT be more. 
    // A robust way works by fetching pageSize + 1, but for now this is standard.
    const hasMore = querySnapshot.docs.length === pageSize;

    return {
      images,
      lastVisible: newLastVisible,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching paginated images:', error);
    throw new Error(`Failed to fetch images: ${error}`);
  }
};

export const updateImageMetadata = async (
  imageId: string,
  metadata: Partial<ImageMetadata>
): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    await updateDoc(doc(db, 'images', imageId), metadata);
  } catch (error) {
    throw new Error(`Failed to update image metadata: ${error}`);
  }
};

export const deleteImages = async (imageIds: string[]): Promise<void> => {
  if (!db || !storage) throw new Error('Firebase services not initialized');

  try {
    for (const imageId of imageIds) {
      const imageDoc = await getDoc(doc(db, 'images', imageId));
      if (!imageDoc.exists()) continue;

      const imageData = imageDoc.data() as ImageMetadata;

      const storageRef = ref(storage, imageData.url);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'images', imageId));
    }
  } catch (error) {
    throw new Error(`Failed to delete images: ${error}`);
  }
};

export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const settingsRef = doc(db, 'settings', 'site');
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      await setDoc(settingsRef, {
        loginBackgroundUrl: 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81',
        aboutImage: '',
        aboutText: '',
        updatedAt: new Date().toISOString()
      });
    }

    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    throw new Error(`Failed to update site settings: ${error}`);
  }
};

export const getSiteSettings = async (): Promise<SiteSettings | null> => {
  if (!db) throw new Error('Firestore is not initialized');

  try {
    const settingsRef = doc(db, 'settings', 'site');
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      return settingsDoc.data() as SiteSettings;
    }

    return null;
  } catch (error) {
    console.error('Failed to get site settings:', error);
    return null;
  }
};

// Error handling utilities
const formatAuthError = (error: AuthError): AuthError => {
  let message: string;

  switch (error.code) {
    case 'auth/invalid-email':
      message = 'Invalid email address';
      break;
    case 'auth/user-disabled':
      message = 'This account has been disabled';
      break;
    case 'auth/user-not-found':
      message = 'No account found with this email';
      break;
    case 'auth/wrong-password':
      message = 'Incorrect password';
      break;
    case 'auth/email-already-in-use':
      message = 'An account with this email already exists';
      break;
    case 'auth/operation-not-allowed':
      message = 'Operation not allowed';
      break;
    case 'auth/weak-password':
      message = 'Password should be at least 6 characters';
      break;
    default:
      message = 'An error occurred. Please try again';
  }

  return {
    code: error.code,
    message
  };
};

// Initialize admin user
const initializeAdminUser = async () => {
  if (!auth || !db) {
    console.warn('Firebase services not initialized. Skipping admin user creation.');
    return;
  }

  try {
    const adminEmail = 'chagai33@gmail.com';
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, 'temporaryPassword123');

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: adminEmail,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    if (error.code !== 'auth/email-already-in-use') {
      console.error('Failed to initialize admin user:', error);
    }
  }
};

// Export Firebase instances
export { auth, db, storage };