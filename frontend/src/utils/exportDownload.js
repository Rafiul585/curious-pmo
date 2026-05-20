const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export async function downloadExport(url, filename, token) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const res = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok)
        throw new Error('Export failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
}
