const LIFF_ID='PUT_YOUR_LIFF_ID';
async function init(){try{await liff.init({liffId:LIFF_ID});if(!liff.isLoggedIn()){liff.login();return;}
const p=await liff.getProfile();displayName.value=p.displayName;userId.value=p.userId;
navigator.geolocation.getCurrentPosition(pos=>{latitude.value=pos.coords.latitude;longitude.value=pos.coords.longitude;});
}catch(e){console.log(e)}}
init();
function saveData(){const data={displayName:displayName.value,userId:userId.value,project:project.value,developer:developer.value,contact:contact.value,summary:summary.value};
console.log(data);alert('พร้อมเชื่อม Power Automate');}