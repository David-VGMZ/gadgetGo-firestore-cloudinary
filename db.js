// ====================================
// ARCHIVO NUEVO: db.js
// Manejo de IndexedDB para funcionamiento offline
// ====================================

const DB_NAME = 'GadgetGoDB';
const DB_VERSION = 1;
const STORE_PRODUCTOS = 'productos';
const STORE_CARRITO = 'carrito';
const STORE_PEDIDOS = 'pedidos';

let db = null;

// Inicializar la base de datos
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error abriendo IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('✅ IndexedDB inicializada correctamente');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('🔄 Actualizando estructura de IndexedDB...');

            // Store de Productos
            if (!db.objectStoreNames.contains(STORE_PRODUCTOS)) {
                const productosStore = db.createObjectStore(STORE_PRODUCTOS, { keyPath: 'id' });
                productosStore.createIndex('categoria', 'categoria', { unique: false });
                productosStore.createIndex('nombre', 'nombre', { unique: false });
                console.log('✅ Store "productos" creado');
            }

            // Store de Carrito
            if (!db.objectStoreNames.contains(STORE_CARRITO)) {
                db.createObjectStore(STORE_CARRITO, { keyPath: 'id' });
                console.log('✅ Store "carrito" creado');
            }

            // Store de Pedidos (para sincronizar cuando vuelva online)
            if (!db.objectStoreNames.contains(STORE_PEDIDOS)) {
                const pedidosStore = db.createObjectStore(STORE_PEDIDOS, { keyPath: 'id', autoIncrement: true });
                pedidosStore.createIndex('sincronizado', 'sincronizado', { unique: false });
                pedidosStore.createIndex('fecha', 'fecha', { unique: false });
                console.log('✅ Store "pedidos" creado');
            }
        };
    });
}

// ============================================
// OPERACIONES CON PRODUCTOS
// ============================================

// Guardar productos en IndexedDB
async function guardarProductosOffline(productos) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readwrite');
        const store = transaction.objectStore(STORE_PRODUCTOS);

        // Limpiar productos antiguos
        store.clear();

        // Agregar nuevos productos
        productos.forEach(producto => {
            store.put(producto);
        });

        transaction.oncomplete = () => {
            console.log(`✅ ${productos.length} productos guardados offline`);
            resolve();
        };

        transaction.onerror = () => {
            console.error('❌ Error guardando productos:', transaction.error);
            reject(transaction.error);
        };
    });
}

// Obtener todos los productos de IndexedDB
async function obtenerProductosOffline() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log(`📦 ${request.result.length} productos cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo productos offline:', request.error);
            reject(request.error);
        };
    });
}

// Obtener productos por categoría
async function obtenerProductosPorCategoria(categoria) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const index = store.index('categoria');
        const request = index.getAll(categoria);

        request.onsuccess = () => {
            console.log(`📦 ${request.result.length} productos de "${categoria}" cargados desde IndexedDB`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error filtrando productos:', request.error);
            reject(request.error);
        };
    });
}

// Obtener un producto específico
async function obtenerProductoPorId(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PRODUCTOS], 'readonly');
        const store = transaction.objectStore(STORE_PRODUCTOS);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo producto:', request.error);
            reject(request.error);
        };
    });
}

// ============================================
// OPERACIONES CON CARRITO
// ============================================

// Guardar carrito en IndexedDB
async function guardarCarritoOffline(carrito) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CARRITO], 'readwrite');
        const store = transaction.objectStore(STORE_CARRITO);

        // Limpiar carrito antiguo
        store.clear();

        // Agregar items del carrito
        carrito.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => {
            console.log('✅ Carrito guardado en IndexedDB');
            resolve();
        };

        transaction.onerror = () => {
            console.error('❌ Error guardando carrito:', transaction.error);
            reject(transaction.error);
        };
    });
}

// Obtener carrito de IndexedDB
async function obtenerCarritoOffline() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_CARRITO], 'readonly');
        const store = transaction.objectStore(STORE_CARRITO);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log('🛒 Carrito cargado desde IndexedDB');
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo carrito:', request.error);
            reject(request.error);
        };
    });
}

// ============================================
// OPERACIONES CON PEDIDOS (para sincronización)
// ============================================

// Guardar pedido pendiente de sincronización
async function guardarPedidoOffline(pedido) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PEDIDOS], 'readwrite');
        const store = transaction.objectStore(STORE_PEDIDOS);

        const pedidoOffline = {
            ...pedido,
            sincronizado: false,
            fechaCreacion: new Date().toISOString()
        };

        const request = store.add(pedidoOffline);

        request.onsuccess = () => {
            console.log('✅ Pedido guardado offline, se sincronizará cuando haya conexión');
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error guardando pedido offline:', request.error);
            reject(request.error);
        };
    });
}

// Obtener pedidos no sincronizados
async function obtenerPedidosNoSincronizados() {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PEDIDOS], 'readonly');
        const store = transaction.objectStore(STORE_PEDIDOS);
        const index = store.index('sincronizado');
        const request = index.getAll(false);

        request.onsuccess = () => {
            console.log(`📤 ${request.result.length} pedidos pendientes de sincronización`);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('❌ Error obteniendo pedidos no sincronizados:', request.error);
            reject(request.error);
        };
    });
}

// Marcar pedido como sincronizado
async function marcarPedidoSincronizado(id) {
    if (!db) await initDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PEDIDOS], 'readwrite');
        const store = transaction.objectStore(STORE_PEDIDOS);
        const request = store.get(id);

        request.onsuccess = () => {
            const pedido = request.result;
            if (pedido) {
                pedido.sincronizado = true;
                pedido.fechaSincronizacion = new Date().toISOString();
                store.put(pedido);
            }
        };

        transaction.oncomplete = () => {
            console.log(`✅ Pedido ${id} marcado como sincronizado`);
            resolve();
        };

        transaction.onerror = () => {
            console.error('❌ Error marcando pedido sincronizado:', transaction.error);
            reject(transaction.error);
        };
    });
}

// ============================================
// UTILIDADES
// ============================================

// Verificar si hay conexión a internet
function estaOnline() {
    return navigator.onLine;
}

// Detectar cambios en la conexión
function monitorearConexion(callbackOnline, callbackOffline) {
    window.addEventListener('online', () => {
        console.log('🌐 Conexión restaurada');
        if (callbackOnline) callbackOnline();
    });

    window.addEventListener('offline', () => {
        console.log('📡 Sin conexión a internet');
        if (callbackOffline) callbackOffline();
    });
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================

// Para uso con módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDB,
        guardarProductosOffline,
        obtenerProductosOffline,
        obtenerProductosPorCategoria,
        obtenerProductoPorId,
        guardarCarritoOffline,
        obtenerCarritoOffline,
        guardarPedidoOffline,
        obtenerPedidosNoSincronizados,
        marcarPedidoSincronizado,
        estaOnline,
        monitorearConexion
    };
}