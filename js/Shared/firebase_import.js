// Import Firebase modules from npm (Node)
import {
    doc,
    query,
    where,
    getDoc,
    setDoc,
    getDocs,
    updateDoc,
    increment,
    collection,
    serverTimestamp,
    arrayUnion
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Import your Firebase config
import { app, db, auth } from "./firebase-config.js";

// Re-export Firestore functions for convenience
export {
    app,
    db,
    auth,
    doc,
    query,
    where,
    getDoc,
    setDoc,
    getDocs,
    updateDoc,
    increment,
    collection,
    serverTimestamp,
    arrayUnion,
    onAuthStateChanged
};
