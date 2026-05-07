require("dotenv").config();

const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const config = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "ems",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "50023080",
  },
  admin: {
    email: process.env.ADMIN_EMAIL || "admin2@ticketrush.io",
    password: process.env.ADMIN_PASSWORD || "Admin@123456",
    fullName: process.env.ADMIN_FULL_NAME || "TicketRush Admin 2",
  },
};

async function main() {
  const client = new Client(config.db);

  try {
    await client.connect();

    const existing = await client.query(
      `
      select id, email, role
      from users
      where lower(email) = lower($1)
      limit 1
      `,
      [config.admin.email]
    );

    if (existing.rowCount > 0) {
      const user = existing.rows[0];

      if (user.role !== "ADMIN") {
        await client.query(
          `
          update users
          set role = 'ADMIN',
              full_name = $2,
              updated_at = now()
          where id = $1
          `,
          [user.id, config.admin.fullName]
        );

        console.log(`User existed and was promoted to ADMIN: ${config.admin.email}`);
      } else {
        console.log(`Admin already exists: ${config.admin.email}`);
      }

      return;
    }

    const passwordHash = await bcrypt.hash(config.admin.password, 12);

    const inserted = await client.query(
      `
      insert into users (
        email,
        password,
        full_name,
        role,
        created_at,
        updated_at
      )
      values (
        $1,
        $2,
        $3,
        'ADMIN',
        now(),
        now()
      )
      returning id, email, full_name, role, created_at
      `,
      [config.admin.email, passwordHash, config.admin.fullName]
    );

    console.log("Admin created successfully:");
    console.table(inserted.rows);
    console.log("");
    console.log("Login credential:");
    console.log(`Email: ${config.admin.email}`);
    console.log(`Password: ${config.admin.password}`);
  } catch (error) {
    console.error("Failed to seed admin.");
    console.error(error.message);

    if (error.code === "42P01") {
      console.error("Table `users` does not exist. Make sure database schema is initialized.");
    }

    if (error.code === "42704") {
      console.error("Enum value or type may be missing. Make sure `user_role` enum exists.");
    }

    if (error.code === "23505") {
      console.error("Email already exists.");
    }

    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();