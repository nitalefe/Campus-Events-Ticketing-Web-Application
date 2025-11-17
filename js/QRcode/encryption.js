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
module.exports = encryption;