/**
 * IndexedDB Wrapper for Event PWA
 * Provides MongoDB-like API for local storage and analytics
 */

class EventDB {
    constructor() {
        this.dbName = 'EventPWA';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open database'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores (similar to MongoDB collections)

                // Events store
                if (!db.objectStoreNames.contains('events')) {
                    const eventsStore = db.createObjectStore('events', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    eventsStore.createIndex('category', 'category', { unique: false });
                    eventsStore.createIndex('startDate', 'startDate', { unique: false });
                    eventsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Reminders store
                if (!db.objectStoreNames.contains('reminders')) {
                    const remindersStore = db.createObjectStore('reminders', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    remindersStore.createIndex('category', 'category', { unique: false });
                    remindersStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Media store (for camera/audio captures)
                if (!db.objectStoreNames.contains('media')) {
                    const mediaStore = db.createObjectStore('media', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    mediaStore.createIndex('type', 'type', { unique: false });
                    mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Activity log for analytics
                if (!db.objectStoreNames.contains('activity')) {
                    const activityStore = db.createObjectStore('activity', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    activityStore.createIndex('type', 'type', { unique: false });
                    activityStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('Database schema created');
            };
        });
    }

    /**
     * Add a record to a store
     */
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Add timestamp if not present
            if (!data.createdAt) {
                data.createdAt = new Date().toISOString();
            }

            const request = store.add(data);

            request.onsuccess = () => {
                resolve(request.result); // Returns the key/id
            };

            request.onerror = () => {
                reject(new Error(`Failed to add to ${storeName}`));
            };
        });
    }

    /**
     * Get all records from a store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get all from ${storeName}`));
            };
        });
    }

    /**
     * Get a single record by ID
     */
    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get from ${storeName}`));
            };
        });
    }

    /**
     * Update a record
     */
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Add updated timestamp
            data.updatedAt = new Date().toISOString();

            const request = store.put(data);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to update in ${storeName}`));
            };
        });
    }

    /**
     * Delete a record
     */
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to delete from ${storeName}`));
            };
        });
    }

    /**
     * Query by index
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to query ${storeName} by ${indexName}`));
            };
        });
    }

    /**
     * Count records in a store
     */
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to count ${storeName}`));
            };
        });
    }

    /**
     * Clear all records from a store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear ${storeName}`));
            };
        });
    }

    /**
     * Clear all data from database
     */
    async clearAll() {
        const stores = ['events', 'reminders', 'media', 'activity'];
        const promises = stores.map(store => this.clear(store));
        return Promise.all(promises);
    }

    /**
     * Export all data as JSON
     */
    async exportData() {
        const events = await this.getAll('events');
        const reminders = await this.getAll('reminders');
        const media = await this.getAll('media');
        const activity = await this.getAll('activity');

        return {
            events,
            reminders,
            media,
            activity,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Get analytics data
     */
    async getAnalytics() {
        const events = await this.getAll('events');
        const reminders = await this.getAll('reminders');
        const activity = await this.getAll('activity');

        const now = new Date();
        const upcomingEvents = events.filter(event => new Date(event.startDate) > now);

        // Count events by category
        const categoryCount = {};
        events.forEach(event => {
            categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
        });

        // Recent activity (last 10)
        const recentActivity = activity
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        return {
            totalEvents: events.length,
            upcomingEvents: upcomingEvents.length,
            totalReminders: reminders.length,
            categoryBreakdown: categoryCount,
            recentActivity
        };
    }

    /**
     * Log activity for analytics
     */
    async logActivity(type, description, metadata = {}) {
        const activity = {
            type,
            description,
            metadata,
            timestamp: new Date().toISOString()
        };

        return this.add('activity', activity);
    }
}

// Create a singleton instance
const db = new EventDB();

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => db.init());
} else {
    db.init();
}
