import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      username,
      email,
      passwordHash: password,
    });

    const token = generateToken(user._id);

    await Session.create({
      userId: user._id,
      token,
      deviceInfo: {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or Password" });
    }

    user.lastActive = Date.now();
    await user.save();

    const token = generateToken(user._id);

    await Session.create({
      userId: user._id,
      token,
      deviceInfo: {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
      expiresAt: new Date(Date.now()+30*24*60*60*1000)
    });

    res.json({
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      await Session.deleteOne({ token });
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res;
  }
};
