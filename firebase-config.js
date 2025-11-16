const firebaseConfig = {
  apiKey: "AIzaSyDT5t1Cp46SXngmNlAptTcSmtuOAoGBRVo",
  authDomain: "absensi-sekolah-46657.firebaseapp.com",
  databaseURL: "https://absensi-sekolah-46657-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "absensi-sekolah-46657",
  storageBucket: "absensi-sekolah-46657.firebasestorage.app",
  messagingSenderId: "1061158300214",
  appId: "1:1061158300214:web:cfb0fe13791e1e09988697"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.log("Firebase already initialized");
}

const database = firebase.database();
const auth = firebase.auth();