const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required for creating a user"],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Invalid Email Address",
      ],
      unique: [true, "Email already exists"],
    },
    username: {
      type: String,
      required: [true, "Please enter a username"],
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Please enter a valid password"],
      minlength: [6, "Password must be longer than 6 characters"],
      select: false,
    },
    systemUser: {
      type: Boolean,
      default: false,
      immutable: true,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return;
  }

  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;

  return;
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
