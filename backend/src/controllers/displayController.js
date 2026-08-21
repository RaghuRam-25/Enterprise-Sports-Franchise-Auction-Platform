import { getConfig, setConfig } from '../models/SystemConfig.js';

const DEFAULT_TABLE_OVERRIDE = { enabled: false, rows: [] };

export const getDisplayOverrides = async () => {
  try {
    const tableOverride = await getConfig('display.tableOverride', DEFAULT_TABLE_OVERRIDE);
    return { tableOverride };
  } catch (error) {
    console.error('Failed to fetch display overrides:', error);
    return { tableOverride: DEFAULT_TABLE_OVERRIDE };
  }
};

export const saveDisplayOverrides = async (updates, updatedBy = 'admin') => {
  try {
    if (updates.tableOverride !== undefined) {
      await setConfig('display.tableOverride', updates.tableOverride, updatedBy);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to save display overrides:', error);
    return { success: false, error: error.message };
  }
};
