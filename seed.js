// seed.js
// Script to seed the default Admin account for TicketRush.
// Requires Node 18+ (uses native fetch).
// Note: Ensure the Backend server is running at http://localhost:8080 before executing this script.

const API_URL = 'http://localhost:8080/api/v1/auth/seed-admin';

const adminCredentials = {
  email: 'admin@ticketrush.com',
  password: 'AdminPassword123!',
};

async function seedAdmin() {
  console.log('Seeding admin account...');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminCredentials),
    });

    if (res.ok) {
      console.log('✅ Admin account seeded successfully!');
      console.log('=================================');
      console.log(`Email: ${adminCredentials.email}`);
      console.log(`Password: ${adminCredentials.password}`);
      console.log('=================================');
    } else {
      console.error('❌ Failed to seed admin account. Server responded with:', res.status, res.statusText);
    }
  } catch (error) {
    console.error('❌ Error calling backend API:', error.message);
    console.log('Make sure your Spring Boot backend is running at http://localhost:8080');
  }
}

seedAdmin();
