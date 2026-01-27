import { supabase } from './supabase.js';

/**
 * Leaderboard schema (maps to `leaderboard` table):
 *   id             uuid PK default gen_random_uuid()
 *   user_id        uuid references auth.users
 *   display_name   text
 *   highest_level  int
 *   total_stars    int
 *   updated_at     timestamptz
 *
 * RLS: anyone can read, users can update their own row.
 */

export async function fetchLeaderboard(limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('leaderboard')
    .select('display_name, highest_level, total_stars')
    .order('highest_level', { ascending: false })
    .order('total_stars', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Fetch leaderboard failed:', error.message);
    return [];
  }
  return data;
}

export async function updateLeaderboardEntry(userId, displayName, highestLevel, totalStars) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('leaderboard')
    .upsert({
      user_id: userId,
      display_name: displayName || 'Anonymous',
      highest_level: highestLevel,
      total_stars: totalStars,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) console.error('Update leaderboard failed:', error.message);
}
