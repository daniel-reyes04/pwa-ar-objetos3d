// @ts-ignore
import { cifrarTexto } from './crypto';

export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open('atlas3d-progreso-db', 2);
 
    peticion.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (event.oldVersion < 1) {
        const store = db.createObjectStore("progreso", { keyPath: "modeloId" });
        store.createIndex("porFavorito", "favorito", { unique: false });
        store.createIndex("porUltimaVisita", "ultimaVisita", { unique: false });
      }
      
      if (event.oldVersion < 2) {
        db.createObjectStore("descargas", { keyPath: "modeloId" });
      }
    };
 
    peticion.onsuccess = event => resolve((event.target as IDBOpenDBRequest).result);
    peticion.onerror = event => reject((event.target as IDBOpenDBRequest).error);
  });
}

export function marcarModeloVisto(db: IDBDatabase, modeloId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progreso', 'readwrite');
    const store = tx.objectStore('progreso');
    const peticion = store.get(modeloId);
 
    peticion.onsuccess = () => {
      const registro = peticion.result || { modeloId, favorito: false, notaCifrada: null, notaIv: null };
      registro.ultimaVisita = Date.now();
      const escritura = store.put(registro);  
      escritura.onsuccess = () => resolve(registro);
      escritura.onerror = () => reject(escritura.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function alternarFavorito(db: IDBDatabase, modeloId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progreso', 'readwrite');
    const store = tx.objectStore('progreso');
    const peticion = store.get(modeloId);
 
    peticion.onsuccess = () => {
      const registro = peticion.result || { modeloId, favorito: false, ultimaVisita: null, notaCifrada: null, notaIv: null };
      registro.favorito = !registro.favorito;
      const escritura = store.put(registro);
      escritura.onsuccess = () => resolve(registro.favorito);
      escritura.onerror = () => reject(escritura.error);
    };
    peticion.onerror = () => reject(peticion.error);
  });
}

export function obtenerFavoritos(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve) => {
    const resultado: any[] = [];
    const indice = db.transaction('progreso', 'readonly').objectStore('progreso').index('porFavorito');
    const cursor = indice.openCursor(IDBKeyRange.only(true));
 
    cursor.onsuccess = event => {
      const c = (event.target as IDBRequest).result;
      if (c) { 
        resultado.push(c.value); 
        c.continue(); 
      } else {
        resolve(resultado);
      }
    };
  });
}

export async function guardarNotaDeEstudio(db: IDBDatabase, clave: CryptoKey, modeloId: string, texto: string): Promise<void> {
  const { cifrado, iv } = await cifrarTexto(clave, texto);  
  const tx = db.transaction('progreso', 'readwrite');
  const store = tx.objectStore('progreso');
  
  const registro: any = (await new Promise(r => { store.get(modeloId).onsuccess = e => r((e.target as IDBRequest).result); }))
    || { modeloId, favorito: false, ultimaVisita: null };
    
  registro.notaCifrada = cifrado;
  registro.notaIv = iv;
  
  return new Promise((resolve, reject) => {
    const escritura = store.put(registro);
    escritura.onsuccess = () => resolve();
    escritura.onerror = () => reject(escritura.error);
  });
}

export interface Descarga {
  modeloId: string;
  estado: "pendiente" | "listo";
}

export function encolarDescargas(db: IDBDatabase, ids: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("descargas", "readwrite");
    const store = tx.objectStore("descargas");
    ids.forEach((modeloId) => store.put({ modeloId, estado: "pendiente" } satisfies Descarga));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function obtenerDescargas(db: IDBDatabase): Promise<Descarga[]> {
  return new Promise((resolve, reject) => {
    const peticion = db.transaction("descargas", "readonly").objectStore("descargas").getAll();
    peticion.onsuccess = () => resolve(peticion.result as Descarga[]);
    peticion.onerror = () => reject(peticion.error);
  });
}

export function marcarDescargaLista(db: IDBDatabase, modeloId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("descargas", "readwrite");
    tx.objectStore("descargas").put({ modeloId, estado: "listo" } satisfies Descarga);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}