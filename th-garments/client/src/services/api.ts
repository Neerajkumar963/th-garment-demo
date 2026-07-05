const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Configure fetch with credentials for JWT cookies
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include', // Important for JWT cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        try {
            const error = JSON.parse(text);
            throw new Error(error.message || `HTTP ${response.status}`);
        } catch (e: any) {
            // If it was already our erro thrown above, rethrow it
            if (e.message && e.message !== 'Unexpected token < in JSON at position 0' && !e.message.includes('JSON')) {
                throw e;
            }

            console.error('API Error (Non-JSON):', text);
            // Check if it's HTML
            const isHtml = text.trim().startsWith('<');
            const preview = isHtml ? 'Server Error (HTML Page)' : text.substring(0, 100);
            throw new Error(`Request failed (${response.status}): ${preview}`);
        }
    }

    return response.json();
};

export const api = {
    get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
    post: (endpoint: string, data: any) =>
        fetchWithAuth(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint: string, data: any) =>
        fetchWithAuth(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};

export const labelAPI = {
    getAllTypes: () => api.get('/labels/types'),
    getTypesByItem: (itemId: number) => api.get(`/labels/types/${itemId}`),
    getStockableLabels: () => api.get('/labels/stockable'),
    getAvailableLabels: () => api.get('/labels/available'),
    addStock: (labellingId: number, quantity: number) => api.post('/labels/add-stock', { labellingId, quantity }),
    updateStatus: (labellingId: number, stockable: boolean) => api.put('/labels/status', { labellingId, stockable }),
    createType: (label_type: string, item_id: number) => api.post('/labels/types', { label_type, item_id }),
    deleteType: (id: number) => api.delete(`/labels/types/${id}`),
};

export const processingAPI = {
    getHistory: (params: any) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/processing/history?${query}`);
    }
};

export const extensionAPI = {
    getAllTypes: () => api.get('/extensions'),
    getByItem: (itemId: number) => api.get(`/extensions/item/${itemId}`),
};

export const itemAPI = {
    getAll: () => api.get('/items'),
    getArchived: () => api.get('/items/archived'),
    restore: (id: number) => api.put(`/items/restore/${id}`, {}),
};
