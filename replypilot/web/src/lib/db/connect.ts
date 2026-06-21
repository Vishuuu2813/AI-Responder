import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in your environment variables.");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    await seedAdminUser();
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

async function seedAdminUser() {
  try {
    const { User } = await import("@/models/User");
    const { Settings } = await import("@/models/Settings");
    const bcrypt = await import("bcryptjs");

    const email = "vvishwas221@gmail.com";
    const existing = await User.findOne({ email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("Vish@2503@", 12);
      const admin = await User.create({
        name: "Admin",
        email,
        password: hashedPassword,
        role: "admin",
        isActive: true,
        onboardingCompleted: true,
      });

      // Create default settings for admin
      await Settings.create({
        user: admin._id,
        businessHours: {
          schedule: Array.from({ length: 7 }, (_, i) => ({
            day: i,
            isOpen: i > 0 && i < 6,
            openTime: "09:00",
            closeTime: "18:00",
          })),
        },
      });
      console.log("Admin user seeded successfully.");
    }
  } catch (err) {
    console.error("Admin seeding failed:", err);
  }
}

export default connectDB;

