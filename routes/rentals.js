const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lemak_100k_secret_123';

// In-memory rentals - replace with Supabase for 100k users
let rentals = [
  {
    id: "1",
    type: "apartment",
    title: "2-Bed Lekki Apartment",
    price: 800000,
    per: "year",
    location: "Lekki Phase 1, Lagos",
    bedrooms: 2,
    bathrooms: 2,
    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
    owner: "owner@lemak.com",
    ownerPhone: "08101234567",
    available: true,
    verified: true,
    createdAt: new Date()
  },
  {
    id: "2",
    type: "car",
    title: "Toyota Camry 2020",
    price: 25000,
    per: "day",
    location: "Ibadan, Oyo",
    images: ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7"],
    owner: "owner@lemak.com",
    ownerPhone: "081012
