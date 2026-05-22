/**
 * Base URL for all backend API calls.
 * In production, points to the Render backend; in dev, uses Vite proxy.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || '';
