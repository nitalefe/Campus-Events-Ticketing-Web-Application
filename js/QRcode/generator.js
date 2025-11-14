import { auth, db, /*app*/ } from "../../js/Shared/firebase-config.js";
// import {signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { setDoc, doc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


/*const currentUser = auth.currentUser;
const uid = currentUser.uid;


const userDocRef = doc(db, "users", uid);
const userSnap = await getDoc(userDocRef);


const params = new URLSearchParams(window.location.search);
const eid = params.get("id");


var attendeeID = uid;
var eventID = eid;


eventID = eventID.slice(0,15);
attendeeID = attendeeID.slice(0,15);*/
//var eventID = "6w3Q4k4LRLazZzJnHjil"; //for testinggit
//var attendeeID = "ze-yu-huang-benoyo8489_reifide_com";


onAuthStateChanged(auth, async (user) => {
 if (!user) {
   console.warn("⚠️ No user signed in.");
   alert("You must be logged in to view your ticket.");
   window.location.href = "../Registration/website.html"; // redirect to login if needed
   return;
 }


 console.log("✅ Authenticated user:", user.uid);


 const uid = user.uid;
 /*const userDocRef = doc(db, "users", uid);
 const userSnap = await getDoc(userDocRef);


 if (!userSnap.exists()) {
   console.warn("User document not found in Firestore.");
   return;
 }


 const userData = userSnap.data();
 console.log("User data loaded:", userData);
*/
 // Retrieve event ID from URL
 const params = new URLSearchParams(window.location.search);
 const eid = params.get("id");


 if (!eid) {
   console.error("❌ No event ID found in URL.");
   return;
 }


 // Slice to avoid overflow if needed
  const attendeeID = uid.slice(0, 15);
 const eventID = eid.slice(0, 15);


 // Generate QR
 readEvent(eventID, attendeeID);
});




async function readEvent(eventID, attendeeID) { //I may be stupid but wouldnt we have attendeeID already? since we are generating the qr as the attendee




 var qrText = eventID+'/'+attendeeID;
 qrText = encryption(qrText, 3);
 qrText = initializeQRCode(qrText);
 return qrText;
}


function encryption(str, increment) {
 let result = '';
  for (let i = 0; i < str.length; i++) {
   const charCode = str.charCodeAt(i);         // get ASCII code
   const newChar = String.fromCharCode(charCode + increment); // add increment
   result += newChar;
 }
 return result;
}


// 2. Main function to initialize the QR code
function initializeQRCode(FIXED_DATA_STRING) {
   const qrCodeContainer = document.getElementById('qrcode');


   // Check if the container element exists and the string is not empty
   if (!qrCodeContainer || !FIXED_DATA_STRING) {
       console.error("QR Code container not found or data string is empty.");
       return;
   }


   // Clear any previous content (though unnecessary on initial load)
   qrCodeContainer.innerHTML = '';


   // Generate the QR code using the qrcode.js library
   new QRCode(qrCodeContainer, {
       text: FIXED_DATA_STRING,
       width: 300,             // Set your desired size
       height: 300,
       colorDark: "#000000",
       colorLight: "#ffffff",
       correctLevel: QRCode.CorrectLevel.H
   });


   console.log(`QR Code displayed for: ${FIXED_DATA_STRING}`);
}
