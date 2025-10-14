import { auth, db } from "../../Shared/firebase-config.js";
import {signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { setDoc, doc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const eventID = "";
const attendeeID = "";

async function readEvent(eventID){
//read event, need to validate
  const eventRef = doc(db, "events", eventID);
  const eventSnap = await getDoc(eventRef);
  if(!eventSnap.exists()){return -1;}
  const eventData = snap.data();


//read attendee
  attendeeMap = eventData.attendees;
  if(!(attendeeMap.hasOwnProperty(attendeeID))){return -1;}
  
  qrText = eventID+'/'+attendeeID;
  qrText = initializeQRCode(qrText, 7);
  
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

// 3. Call the function to run when the script loads
initializeQRCode(readEvent(eventID));