const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");

/**
 * - user register controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { email, password, username } = req.body;

  const isExist = await userModel.findOne({
    email: email,
  });

  if (isExist) {
    return res.status(422).json({
      message: "User already Exists with this email",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    username,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      username: user.username,
    },
    token,
  });

  await emailService.sendRegistrationEmail(user.email, user.username);
}

/**
 * - user login controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Email or password is Invalid",
    });
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Email or password is Invalid",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      username: user.username,
    },
    token,
  });
}

async function userLogoutController(req, res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(400).json({
      message: "User logged out successfully",
    });
  }

  await tokenBlackListModel.create({
    token: token,
  });

  res.clearCookie("token");

  return res.status(200).json({
    message: "User Logged out successfully",
  });
}

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
};
