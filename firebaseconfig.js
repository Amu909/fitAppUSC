import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWzuIQeiqXrnbzuMpF1lgOOZdH4av64ow",
  authDomain: "my-fitapp-pro.firebaseapp.com",
  projectId: "my-fitapp-pro",
  storageBucket: "my-fitapp-pro.appspot.com", // <-- corregido también aquí
  messagingSenderId: "532829391167",
  appId: "1:532829391167:web:2eda4d53137d5557f02b8a"
};

const appfirebase = initializeApp(firebaseConfig);
const auth = getAuth(appfirebase); // CORRECTO

export { appfirebase, auth };
