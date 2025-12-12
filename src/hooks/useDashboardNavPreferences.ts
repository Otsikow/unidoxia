import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook for managing dashboard navigation preferences.
 * 
 * NOTE: This hook uses localStorage for persistence since the dashboard_nav_preferences
 * table doesn't exist in the database. To enable database persistence, create the table
 * with the migration tool.
 */
export function useDashboardNavPreferences(menuKey: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  
  const storageKey = `dashboard_nav_preferences_${userId ?? 'anonymous'}_${menuKey}`;
  
  const [savedOrder, setSavedOrder] = useState<string[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const saveOrder = useCallback((order: string[]) => {
    setIsSaving(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(order));
      setSavedOrder(order);
    } catch (err) {
      console.error('Failed to save nav preferences:', err);
    } finally {
      setIsSaving(false);
    }
  }, [storageKey]);

  const resetToDefault = useCallback(() => {
    setIsSaving(true);
    try {
      localStorage.removeItem(storageKey);
      setSavedOrder(null);
    } catch (err) {
      console.error('Failed to reset nav preferences:', err);
    } finally {
      setIsSaving(false);
    }
  }, [storageKey]);

  return {
    savedOrder,
    isLoading: false,
    error: null,
    saveOrder,
    resetToDefault,
    isSaving,
  };
}
