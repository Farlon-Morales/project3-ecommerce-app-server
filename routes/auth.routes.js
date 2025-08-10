// routes/auth.routes.js

// ℹ️ Get the Express router
const express = require("express");
const router = express.Router();

// ℹ️ Handles password encryption
const bcrypt = require("bcrypt");

// ℹ️ Handles creation and verification of JSON Web Tokens
const jwt = require("jsonwebtoken");

// ℹ️ Require the User model to interact with the database
const User = require("../models/User.model");

// ℹ️ Require the authentication middleware to protect certain routes
const { isAuthenticated } = require("../middleware/jwt.middleware.js");

// How many rounds should bcrypt run the salt (default - 10 rounds)
const saltRounds = 10;

/**
 * POST /auth/signup
 * Creates a new user in the database
 */
router.post("/signup", (req, res, next) => {
  const { email, password, name } = req.body;

  // Check if email, password or name are empty
  if (email === "" || password === "" || name === "") {
    res.status(400).json({ message: "Provide email, password and name" });
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "Provide a valid email address." });
    return;
  }

  // Validate password complexity
  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      message:
        "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
    });
    return;
  }

  // Check if the email already exists in the database
  User.findOne({ email })
    .then((foundUser) => {
      if (foundUser) {
        res.status(400).json({ message: "User already exists." });
        return;
      }

      // Hash the password before saving
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Create the new user
      return User.create({ email, password: hashedPassword, name });
    })
    .then((createdUser) => {
      const { email, name, _id } = createdUser;

      // Return user data without password
      res.status(201).json({ user: { email, name, _id } });
    })
    .catch((err) => next(err));
});

/**
 * POST /auth/login
 * Verifies email and password and returns a JWT
 */
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;

  // Check for empty fields
  if (email === "" || password === "") {
    res.status(400).json({ message: "Provide email and password." });
    return;
  }

  // Check if the user exists
  User.findOne({ email })
    .then((foundUser) => {
      if (!foundUser) {
        res.status(401).json({ message: "User not found." });
        return;
      }

      // Compare password with the hashed one
      const passwordCorrect = bcrypt.compareSync(password, foundUser.password);

      if (passwordCorrect) {
        const { _id, email, name } = foundUser;

        // Create JWT payload
        const payload = { _id, email, name };

        // Sign token
        const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
          algorithm: "HS256",
          expiresIn: "6h",
        });

        res.status(200).json({ authToken });
      } else {
        res.status(401).json({ message: "Unable to authenticate the user" });
      }
    })
    .catch((err) => next(err));
});

/**
 * GET /auth/verify
 * Verifies stored JWT and returns payload
 */
router.get("/verify", isAuthenticated, (req, res, next) => {
  console.log("req.payload", req.payload);
  res.status(200).json(req.payload);
});

// ℹ️ Export the router so it can be mounted in app.js
module.exports = router;