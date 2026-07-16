import mongoose, { Schema, Document, Model } from "mongoose";


export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  profileImage: string;
  role: "user" | "admin";
  isVerified: boolean;

  // Email verification
  verifyToken?: string;           // SHA-256 hash of the raw token
  verifyTokenExpiry?: Date;

  // Password reset
  forgotPasswordToken?: string;   // SHA-256 hash of the raw token
  forgotPasswordTokenExpiry?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phoneNumber: {
      type: String,
      sparse: true,   // Allows multiple documents with no phoneNumber (null ≠ duplicate)
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    profileImage: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // --- Token fields ---
    // We store the SHA-256 hash of the raw token.
    // The raw token is sent to the user via email; it never touches the DB.
    // On verification, we hash the incoming token and compare it to this field.

    verifyToken: {
      type: String,
      select: false,  // Never returned in queries unless explicitly requested
    },
    verifyTokenExpiry: {
      type: Date,
      select: false,
    },
    forgotPasswordToken: {
      type: String,
      select: false,
    },
    forgotPasswordTokenExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true, // Adds createdAt + updatedAt automatically
  }
);

// Index for token lookups (used in verify-email and reset-password routes)
UserSchema.index({ verifyToken: 1 });
UserSchema.index({ forgotPasswordToken: 1 });

/**
 * Prevent model re-compilation on hot-reload in development.
 * mongoose.models caches compiled models; we reuse the cached version
 * if it already exists.
 */
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;