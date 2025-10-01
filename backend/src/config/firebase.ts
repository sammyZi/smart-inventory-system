import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App;
let firestoreDb: admin.firestore.Firestore;

export async function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0] as admin.app.App;
      firestoreDb = firebaseApp.firestore();
      logger.info('✅ Firebase already initialized');
      return;
    }

    // Check if Firebase configuration is provided
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Skip Firebase if configuration is missing or invalid
    if (!serviceAccount.projectId || 
        !serviceAccount.privateKey || 
        !serviceAccount.clientEmail ||
        serviceAccount.projectId === 'your-firebase-project-id' ||
        serviceAccount.privateKey.includes('your-firebase-private-key')) {
      logger.info('⚠️ Firebase configuration not provided - running without Firebase Auth');
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });

    // Initialize Firestore
    firestoreDb = firebaseApp.firestore();
    
    // Configure Firestore settings
    firestoreDb.settings({
      ignoreUndefinedProperties: true,
    });

    logger.info('✅ Firebase Admin SDK initialized');
    logger.info(`✅ Connected to Firestore project: ${serviceAccount.projectId}`);
    
    // Test Firestore connection
    await firestoreDb.collection('_health').doc('test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'connected'
    });
    
    logger.info('✅ Firestore connection test successful');
    
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase:', error);
    throw error;
  }
}

export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firebaseApp;
}

export function getFirestore(): admin.firestore.Firestore {
  if (!firestoreDb) {
    throw new Error('Firestore not initialized. Call initializeFirebase() first.');
  }
  return firestoreDb;
}

// Firebase Auth utilities
export class FirebaseAuthService {
  static async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Firebase token verification failed:', error);
      throw new Error('Invalid authentication token');
    }
  }

  static async createUser(userData: {
    email: string;
    password: string;
    displayName?: string;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().createUser(userData);
      logger.info(`Created Firebase user: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      logger.error('Firebase user creation failed:', error);
      throw error;
    }
  }

  static async updateUser(uid: string, userData: admin.auth.UpdateRequest): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().updateUser(uid, userData);
      logger.info(`Updated Firebase user: ${uid}`);
      return userRecord;
    } catch (error) {
      logger.error('Firebase user update failed:', error);
      throw error;
    }
  }

  static async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
      logger.info(`Deleted Firebase user: ${uid}`);
    } catch (error) {
      logger.error('Firebase user deletion failed:', error);
      throw error;
    }
  }

  static async setCustomClaims(uid: string, customClaims: object): Promise<void> {
    try {
      await admin.auth().setCustomUserClaims(uid, customClaims);
      logger.info(`Set custom claims for user: ${uid}`);
    } catch (error) {
      logger.error('Firebase custom claims failed:', error);
      throw error;
    }
  }
}

// Firestore utilities
export class FirestoreService {
  private static db = () => getFirestore();

  static collection(path: string) {
    return this.db().collection(path);
  }

  static doc(path: string) {
    return this.db().doc(path);
  }

  static async runTransaction<T>(updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>): Promise<T> {
    return this.db().runTransaction(updateFunction);
  }

  static batch() {
    return this.db().batch();
  }

  static FieldValue = admin.firestore.FieldValue;
  static Timestamp = admin.firestore.Timestamp;
}