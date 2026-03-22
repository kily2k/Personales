import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCrNKe4dDVxu9RWv27yWJmRhbDIFsfs95I",
  authDomain: "nantys-9f6dc.firebaseapp.com",
  projectId: "nantys-9f6dc",
  storageBucket: "nantys-9f6dc.firebasestorage.app",
  messagingSenderId: "596984743552",
  appId: "1:596984743552:web:171a1fed1de50607584865",
  measurementId: "G-G7KXWKBXRB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);