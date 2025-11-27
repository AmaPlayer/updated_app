/**
 * Admin Setup Script
 *
 * This script helps set up an admin user in the /admins Firestore collection.
 * Run this once to initialize your admin account for the connection request dashboard.
 *
 * Requirements:
 * - Firebase Admin SDK initialized with service account
 * - Admin user already exists in Firebase Authentication
 *
 * Usage:
 * node setup-admin.js <USER_UID> <USER_EMAIL> <ADMIN_ROLE>
 *
 * Example:
 * node setup-admin.js abc123def456 admin@example.com admin
 *
 * Valid admin roles:
 * - super_admin (can manage other admins, full access)
 * - admin (full access, cannot manage admins)
 * - moderator (can moderate content and manage reports)
 * - content_moderator (can moderate content only)
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// Make sure you have GOOGLE_APPLICATION_CREDENTIALS set to your service account JSON
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, 'serviceAccountKey.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK');
  console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS is set to your service account JSON path');
  process.exit(1);
}

const db = admin.firestore();

// Valid admin roles
const VALID_ROLES = ['super_admin', 'admin', 'moderator', 'content_moderator'];

async function setupAdmin(uid, email, role) {
  // Validation
  if (!uid || !email || !role) {
    console.error('❌ Missing required parameters');
    console.error('Usage: node setup-admin.js <UID> <EMAIL> <ROLE>');
    console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`❌ Invalid admin role: ${role}`);
    console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  try {
    // Check if user exists in Firebase Auth
    console.log(`🔍 Checking if user ${uid} exists in Firebase Auth...`);
    const user = await admin.auth().getUser(uid);
    console.log(`✅ User found: ${user.displayName || email}`);

    // Create or update admin record
    console.log(`\n📝 Setting up admin record for ${email} with role: ${role}...`);
    const adminDocRef = db.collection('admins').doc(uid);

    // Check if admin record already exists
    const existingAdmin = await adminDocRef.get();
    if (existingAdmin.exists) {
      console.log(`⚠️  Admin record already exists. Updating...`);
      await adminDocRef.update({
        role: role,
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: uid
      });
      console.log(`✅ Admin record updated successfully`);
    } else {
      // Create new admin record
      await adminDocRef.set({
        uid: uid,
        email: email,
        role: role,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: uid // Initial setup
      });
      console.log(`✅ Admin record created successfully`);
    }

    // Set custom claims on auth user (optional but recommended for faster client-side checks)
    console.log(`\n🔐 Setting custom claims on auth user...`);
    await admin.auth().setCustomUserClaims(uid, {
      admin: true,
      role: role
    });
    console.log(`✅ Custom claims set successfully`);

    // Log the action
    console.log(`\n📋 Logging admin setup action...`);
    await db.collection('adminLogs').add({
      action: 'admin_setup',
      targetUserId: uid,
      targetEmail: email,
      targetRole: role,
      performedBy: uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Setup action logged`);

    console.log(`\n✨ Admin setup completed successfully!`);
    console.log(`\n📊 Admin Details:`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`\n🔐 Security Rules Updated:`);
    console.log(`   ✅ isAdminUser() now checks /admins collection`);
    console.log(`   ✅ Admins can read all organization connections`);
    console.log(`   ✅ Admins can view connection analytics`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error setting up admin:`, error.message);
    if (error.code === 'auth/user-not-found') {
      console.error(`   User ${uid} does not exist in Firebase Authentication`);
      console.error(`   Please create the user first in Firebase Console`);
    }
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const [uid, email, role] = args;

console.log(`\n🚀 AmaPlayer Admin Setup Script\n`);
setupAdmin(uid, email, role);
