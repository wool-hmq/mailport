import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["nodemailer", "pg", "mysql2", "mongodb", "better-sqlite3"],
};

export default nextConfig;
