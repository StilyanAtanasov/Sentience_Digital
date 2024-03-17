"use strict";

const dotenv = require("dotenv");
dotenv.config({ path: `${__dirname}/config.env` });

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: procces.env.FIREBASE_API_KEY,
  authDomain: procces.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: procces.env.FIREBASE_DATABASE_URL,
  projectId: procces.env.FIREBASE_PROJECT_ID,
  storageBucket: procces.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: procces.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: procces.env.FIREBASE_APP_ID,
  measurementId: procces.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Database connections
const database = getDatabase(app);
const rootRef = ref(database, "users");

function writeUserData(name, points) {
  // Generate a unique key for the new data
  const newChildRef = push(rootRef);

  set(newChildRef, {
    username: name,
    score: points,
  });
}

writeUserData("test2", 100);
console.log(14);
