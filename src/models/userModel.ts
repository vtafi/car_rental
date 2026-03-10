import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  username: string;
  password: string;
  role: "admin" | "staff";
  comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username phải ít nhất 3 ký tự"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password phải ít nhất 6 ký tự"],
    },
    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff",
    },
  },
  { timestamps: true },
);

// Hash password before save
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = function (
  plain: string,
): Promise<boolean> {
  return bcrypt.compare(plain, this.password as string);
};

export const User = mongoose.model<IUser>("User", UserSchema);
