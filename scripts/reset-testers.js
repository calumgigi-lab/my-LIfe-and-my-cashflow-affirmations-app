#!/usr/bin/env node
/**
 * Reset all NON-ADMIN users to a fresh, unpaid state:
 *   - wipe reward_points (points balance) and reward_history
 *   - delete every monthly_purchases row (locks all booklets)
 *   - delete related payment_audit_log rows first (FK safety)
 *
 * Admin accounts (users.is_admin = true) are left untouched.
 * A full backup of the affected tables is written to backups/ before deleting.
 *
 * Usage: node scripts/reset-testers.js --yes
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const CONFIRMED = process.argv.includes('--yes');
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

(async () => {
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');

    const admins = await sql`SELECT id, username FROM users WHERE is_admin = true ORDER BY id`;
    const adminIds = admins.map((a) => a.id);
    console.log('Admin accounts spared:', admins.map((a) => `#${a.id} ${a.username}`).join(', ') || '(none)');

    // --- BACKUP everything we are about to touch ---
    const backup = {
      takenAt: new Date().toISOString(),
      adminIdsSpared: adminIds,
      reward_points: await sql`SELECT * FROM reward_points`.catch(() => []),
      reward_history: await sql`SELECT * FROM reward_history`.catch(() => []),
      monthly_purchases: await sql`SELECT * FROM monthly_purchases`.catch(() => []),
      payment_audit_log: await sql`SELECT * FROM payment_audit_log`.catch(() => []),
    };
    const backupDir = path.join(__dirname, '..', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const stamp = backup.takenAt.replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `reset-testers-backup-${stamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`\nBackup written: ${backupPath}`);
    console.log(`  reward_points: ${backup.reward_points.length} rows`);
    console.log(`  reward_history: ${backup.reward_history.length} rows`);
    console.log(`  monthly_purchases: ${backup.monthly_purchases.length} rows`);
    console.log(`  payment_audit_log: ${backup.payment_audit_log.length} rows`);

    if (!CONFIRMED) {
      console.log('\nDRY RUN (no --yes flag). Nothing was deleted. Re-run with --yes to apply.');
      await sql.end();
      return;
    }

    // --- RESET (transaction) ---
    const result = await sql.begin(async (tx) => {
      const audit = await tx`
        DELETE FROM payment_audit_log
        WHERE payment_id IN (
          SELECT id FROM monthly_purchases
          WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)
        )
      `;
      const purchases = await tx`
        DELETE FROM monthly_purchases
        WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)
      `;
      const history = await tx`
        DELETE FROM reward_history
        WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)
      `;
      const pts = await tx`
        DELETE FROM reward_points
        WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)
      `;
      return {
        audit: audit.count,
        purchases: purchases.count,
        history: history.count,
        pts: pts.count,
      };
    });

    console.log('\n✅ Reset complete (non-admin users):');
    console.log(`   payment_audit_log deleted: ${result.audit}`);
    console.log(`   monthly_purchases deleted: ${result.purchases}`);
    console.log(`   reward_history deleted: ${result.history}`);
    console.log(`   reward_points deleted: ${result.pts}`);

    // --- VERIFY ---
    const remaining = {
      rp: (await sql`SELECT COUNT(*)::int n FROM reward_points WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)`)[0].n,
      rh: (await sql`SELECT COUNT(*)::int n FROM reward_history WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)`)[0].n,
      mp: (await sql`SELECT COUNT(*)::int n FROM monthly_purchases WHERE user_id NOT IN (SELECT id FROM users WHERE is_admin = true)`)[0].n,
      adminMp: (await sql`SELECT COUNT(*)::int n FROM monthly_purchases WHERE user_id IN (SELECT id FROM users WHERE is_admin = true)`)[0].n,
    };
    console.log('\nVerification (should be 0 for non-admins):');
    console.log(`   non-admin reward_points: ${remaining.rp}`);
    console.log(`   non-admin reward_history: ${remaining.rh}`);
    console.log(`   non-admin monthly_purchases: ${remaining.mp}`);
    console.log(`   admin monthly_purchases preserved: ${remaining.adminMp}`);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
