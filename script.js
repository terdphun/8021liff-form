// นำรหัส LIFF ID ตัวเต็มมาใส่ในเครื่องหมายคำพูด (ตัวอย่างด้านล่างใช้รหัสเดิม หากรหัสนี้ถูกลบไปแล้ว ให้เปลี่ยนเป็นรหัสใหม่)
const LIFF_ID = "2010839050-03sJnJz"; 

async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
    
    const p = await liff.getProfile();
    document.getElementById("displayName").value = p.displayName;
    document.getElementById("userId").value = p.userId;
    
    // แก้ geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          document.getElementById("latitude").value = pos.coords.latitude;
          document.getElementById("longitude").value = pos.coords.longitude;
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  } catch (e) {
    console.error(e);
  }
}

init();

function saveData() {
  const data = {
    displayName: document.getElementById("displayName").value,
    userId: document.getElementById("userId").value,
    project: document.getElementById("project").value,
    developer: document.getElementById("developer").value,
    contact: document.getElementById("contact").value,
    summary: document.getElementById("summary").value
  };
  console.log(data);
  alert("พร้อมเชื่อม Power Automate");
}
