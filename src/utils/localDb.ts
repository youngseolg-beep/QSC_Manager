export type InspectionRecord = {
  id: string;
  created_at: string;
  inspection_date: string;
  country?: string;
  branch_name: string;
  inspector_name: string;
  kitchen_score: number;
  kitchen_grade: string;
  hall_score: number;
  hall_grade: string;
  final_score: number;
  final_grade: string;
  manager_signature?: string;
  owner_signature?: string;
  manager_comment?: string;
  owner_comment?: string;
  details?: Record<string, number>;
  evidence_photos?: Record<string, string[]>;
  language?: 'ko' | 'en';
};

const DB_NAME = 'qsc-manager-local';
const DB_VERSION = 1;
const STORE_NAME = 'inspections';
const META_STORE_NAME = 'meta';
const SEED_VERSION = '2026-09-15-v1';

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at');
      }

      if (!db.objectStoreNames.contains(META_STORE_NAME)) {
        db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB를 열 수 없습니다.'));
  });
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 요청에 실패했습니다.'));
  });
};

const initializeHardcodedData = async (hardcodedData: InspectionRecord[]) => {
  const db = await openDb();

  try {
    const readTx = db.transaction(META_STORE_NAME, 'readonly');
    const metaStore = readTx.objectStore(META_STORE_NAME);
    const meta = await requestToPromise<any>(metaStore.get('seed_version'));

    if (meta?.value === SEED_VERSION) return;

    const writeTx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
    const inspectionStore = writeTx.objectStore(STORE_NAME);
    const writeMetaStore = writeTx.objectStore(META_STORE_NAME);

    hardcodedData.forEach(item => inspectionStore.put(item));
    writeMetaStore.put({ key: 'seed_version', value: SEED_VERSION });

    await new Promise<void>((resolve, reject) => {
      writeTx.oncomplete = () => resolve();
      writeTx.onerror = () => reject(writeTx.error || new Error('초기 데이터 저장에 실패했습니다.'));
      writeTx.onabort = () => reject(writeTx.error || new Error('초기 데이터 저장이 중단되었습니다.'));
    });
  } finally {
    db.close();
  }
};

export const getInspections = async (hardcodedData: InspectionRecord[] = []): Promise<InspectionRecord[]> => {
  await initializeHardcodedData(hardcodedData);
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const data = await requestToPromise<InspectionRecord[]>(store.getAll());

    return [...data].sort((a, b) =>
      new Date(b.created_at || b.inspection_date).getTime() -
      new Date(a.created_at || a.inspection_date).getTime()
    );
  } finally {
    db.close();
  }
};

export const saveInspection = async (payload: Omit<InspectionRecord, 'id' | 'created_at'>) => {
  const db = await openDb();

  try {
    const record: InspectionRecord = {
      ...payload,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.put(record));
    return record;
  } finally {
    db.close();
  }
};

export const updateInspection = async (id: string, changes: Partial<InspectionRecord>) => {
  const db = await openDb();

  try {
    const readTx = db.transaction(STORE_NAME, 'readonly');
    const current = await requestToPromise<InspectionRecord | undefined>(
      readTx.objectStore(STORE_NAME).get(id)
    );

    if (!current) {
      throw new Error('수정할 점검 데이터를 찾을 수 없습니다.');
    }

    const updated = { ...current, ...changes, id: current.id, created_at: current.created_at };
    const writeTx = db.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(writeTx.objectStore(STORE_NAME).put(updated));
    return updated;
  } finally {
    db.close();
  }
};

export const deleteInspection = async (id: string) => {
  const db = await openDb();

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.delete(id));
  } finally {
    db.close();
  }
};
