import { auth, db, /*app*/} from "../../Shared/firebase-config.js";
// import {signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { setDoc, doc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

var eventID = "6w3Q4k4LRLazZzJnHjil";
var attendeeID = "ze-yu-huang-benoyo8489_reifide_com";
eventID = eventID.slice(0,15);
attendeeID = attendeeID.slice(0,15);

/*console.log("Firebase app initialized", app);*/

async function readEvent(eventID, attendeeID) { //I may be stupid but wouldnt we have attendeeID already? since we are generating the qr as the attendee
//read event, need to validate
//   const eventRef = doc(db, "events", eventID);
//   const eventSnap = await getDoc(eventRef);
//   if(!eventSnap.exists()){return -1;}
//   const eventData = snap.data();


// //read attendee
//   // attendeeMap = eventData.attendees;
//   const attendeesRef = collection(db, "events", eventID, "attendees");
//   if(!(attendeeMap.hasOwnProperty(attendeeID))){return -1;}
  

  var qrText = eventID+'/'+attendeeID;
  qrText = initializeQRCode(qrText, 7);
  
  return qrText;
}

//ok so easy way to bypass overflow is only read first 16 characters, could be changed later on
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

window.setIdsAndRenderQR = async function (eventID, attendeeID, options = {}) {
  const { encrypt } = options;
  let qrText = `${eventID}/${attendeeID}`;

  if (encrypt) {
    qrText = encryption(qrText, 7);
  }

  initializeQRCode(qrText);
};