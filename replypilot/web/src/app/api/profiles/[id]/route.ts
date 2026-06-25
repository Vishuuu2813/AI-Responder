import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import connectDB from "@/lib/db/connect";
import { Profile } from "@/models/Profile";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// PUT /api/profiles/[id] - Update a profile's configuration
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const profile = await Profile.findOne({ _id: id, user: userId });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await req.json();

    // Prevent direct modification of user and apiKey
    delete body.user;
    delete body.apiKey;

    // Helper to flatten nested updates
    const flattenObject = (obj: any, prefix = ""): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const path = prefix ? `${prefix}.${key}` : key;
        
        // If it's an array, keep it as is
        if (Array.isArray(value)) {
          result[path] = value;
        } else if (value && typeof value === "object") {
          Object.assign(result, flattenObject(value, path));
        } else {
          result[path] = value;
        }
      }
      return result;
    };

    const flatBody = flattenObject(body);
    for (const key of Object.keys(flatBody)) {
      profile.set(key, flatBody[key]);
    }

    await profile.save();

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error("PUT /api/profiles/[id] error:", error);
    return NextResponse.json(
      { error: "Server error", details: error?.message || error?.toString() },
      { status: 500 }
    );
  }
}

// DELETE /api/profiles/[id] - Delete a profile
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    const result = await Profile.deleteOne({ _id: id, user: userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Profile deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/profiles/[id] error:", error);
    return NextResponse.json(
      { error: "Server error", details: error?.message || error?.toString() },
      { status: 500 }
    );
  }
}
