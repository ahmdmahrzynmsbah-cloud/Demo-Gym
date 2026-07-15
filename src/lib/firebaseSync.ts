// Secure Local Storage & Independent Device Engine (Cloud Sync Disabled)
// This module once handled real-time Cloud Firestore replication.
// It has been fully decoupled to allow the system to run in a 100% standalone physical offline mode.
// Data is now isolated on each device in secure LocalStorage, running completely independently.

export let isIncomingFirestoreUpdate = false;
export let isWipingDatabase = false;

export function setIsWipingDatabase(val: boolean) {
  isWipingDatabase = val;
}

export interface PendingMutation {
  id: string;
  collection: string;
  docId: string;
  action: 'write' | 'delete';
  data?: any;
  timestamp: number;
}

export function getPendingMutations(): PendingMutation[] {
  return [];
}

export function savePendingMutations(mutations: PendingMutation[]) {
  // Local only - No-OP
}

export function addPendingMutation(collectionName: string, docId: string, action: 'write' | 'delete', data?: any) {
  // Local only - No-OP
}

export function removePendingMutation(collectionName: string, docId: string, action: 'write' | 'delete') {
  // Local only - No-OP
}

export async function processPendingMutations() {
  // Local only - No-OP
}

export function mergeCloudAndPending(key: string, cloudItems: any[]): any[] {
  return cloudItems;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

/**
 * Service initializer. Immediately flags database status as synced
 * to represent local offline state active & ready.
 */
export function startRealtimeSync(realmDBInstance: any) {
  // Instantly set local status to synced (meaning local-storage ready)
  setTimeout(() => {
    if (realmDBInstance) {
      realmDBInstance.setSyncStatus('synced');
    }
  }, 50);
}

/**
 * Sync operations are now complete NO-OPs as requested.
 * All records remain stored layout-level inside physical offline localStorage.
 */
export async function syncDocToFirestore(key: string, docId: string, data: any) {
  // Coupled Firestore writes discarded in offline mode
}

export async function deleteDocFromFirestore(key: string, docId: string) {
  // Coupled Firestore deletes discarded in offline mode
}

export async function deleteDocsFromFirestoreBatch(key: string, docIds: string[]) {
  // Coupled Firestore batched deletes discarded in offline mode
}

export async function syncLocalToFirestore(key: string, list: any[]) {
  // Coupled Firestore bulk syncs discarded in offline mode
}
