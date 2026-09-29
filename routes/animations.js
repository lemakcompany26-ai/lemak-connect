const express = require('express');
const router = express.Router();

// Opay-style animations config - used by frontend
const animations = {
  success: {
    lottie: "https://lottie.host/embed/9f2b2b3e-.../success.json",
    colors: { primary: "#0DBF6A", bg: "#E6F9EF" },
    duration: 2000
  },
  loading: {
    type: "shimmer",
    colors: ["#f0f0f0", "#e0e0e0"]
  },
  bottomSheet: {
    spring: { damping: 25, stiffness: 300 },
    borderRadius: "28px 28px 0 0"
  },
  transitions: {
    page: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, duration: 0.3 }
  }
};

// GET all animations config
router.get('/', (req,res)=>{
  res.json({ success:true, animations });
});

// GET Opay success Lottie URL
router.get('/success', (req,res)=>{
  res.json({
    success: true,
    lottieUrl: "https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json", // Opay checkmark
    confettiUrl: "https://assets5.lottiefiles.com/packages/lf20_rovf9g
