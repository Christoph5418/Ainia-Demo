import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzM7zoN_HPnwW2T3dBCZWpvFOaOFRPAko",
  authDomain: "ainia-demo.firebaseapp.com",
  projectId: "ainia-demo",
  storageBucket: "ainia-demo.firebasestorage.app",
  messagingSenderId: "369335474029",
  appId: "1:369335474029:web:276d9ba4b7a21b740dec64"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
});
