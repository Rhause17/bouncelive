import { supabase } from './supabase.js';

/**
 * Cloud save schema (maps to `saves` table):
 *   user_id        uuid PK references auth.users
 *   highest_level  int
 *   trajectory_ct  int
 *   remove_ct      int
 *   widen_ct       int
 *   total_stars    int
 *   updated_at     timestamptz
 */

export async function loadSave(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('saves')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('Load save failed:', error.message);
  }
  return data;
}

export async function writeSave(userId, saveData) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('saves')
    .upsert({
      user_id: userId,
      highest_level: saveData.highestLevel,
      trajectory_ct: saveData.trajectoryCt,
      remove_ct: saveData.removeCt,
      widen_ct: saveData.widenCt,
      total_stars: saveData.totalStars,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) console.error('Write save failed:', error.message);
}
