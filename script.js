// นำรหัส LIFF ID ตัวเต็มมาใส่ในเครื่องหมายคำพูด
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
    
    // ดึงวันที่ปัจจุบัน
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("visitDate").value = today;
    
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
  // ตรวจสอบข้อมูลที่จำเป็น
  const project = document.getElementById("project").value.trim();
  const developer = document.getElementById("developer").value.trim();
  const contact = document.getElementById("contact").value.trim();
  
  if (!project || !developer || !contact) {
    alert("กรุณากรอกข้อมูล โครงการ Developer และผู้ติดต่อให้ครบถ้วน");
    return;
  }
  
  const data = {
    // ข้อมูลผู้เข้าพบ
    displayName: document.getElementById("displayName").value,
    userId: document.getElementById("userId").value,
    visitDate: document.getElementById("visitDate").value,
    latitude: document.getElementById("latitude").value,
    longitude: document.getElementById("longitude").value,
    
    // ข้อมูลโครงการ
    project: project,
    developer: developer,
    contact: contact,
    
    // 1. สถานะโครงการ
    projectStatus: document.getElementById("projectStatus").value,
    
    // 2. สถานะการขาย
    saleStatus: document.getElementById("saleStatus").value,
    
    // 3. ราคาและโปรโมชั่น
    pricePromotion: document.getElementById("pricePromotion").value,
    
    // 4. ข้อมูลตลาด / คู่แข่ง
    competitorBank: document.getElementById("competitorBank").value,
    competitorPromotion: document.getElementById("competitorPromotion").value,
    marketInfo: document.getElementById("marketInfo").value,
    
    // 5. ประเด็นสำคัญจากการเข้าพบ
    keyIssues: document.getElementById("keyIssues").value,
    
    // 6. ความเสี่ยง / ประเด็นที่ต้องเฝ้าระวัง
    risks: document.getElementById("risks").value,
    
    // 7. สิ่งที่โครงการต้องการจากธนาคาร
    projectRequests: document.getElementById("projectRequests").value,
    
    // 8. สิ่งที่ต้องดำเนินการ
    actionItems: document.getElementById("actionItems").value,
    
    // 9. วันติดตามครั้งถัดไป
    nextFollowUpDate: document.getElementById("nextFollowUpDate").value
  };
  
  console.log(data);
  
  // ส่งข้อมูลไปยัง Power Automate
  fetch('YOUR_POWER_AUTOMATE_WEBHOOK_URL', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (response.ok) {
      alert("บันทึกข้อมูลสำเร็จ พร้อมเชื่อม Power Automate");
      // ลบข้อมูลออกหลังจากบันทึกสำเร็จ
      // location.reload();
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  })
  .catch(error => {
    console.error("Error:", error);
    alert("เกิดข้อผิดพลาด: " + error);
  });
}

function clearForm() {
  if (confirm("คุณต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
    document.querySelectorAll('input[type="text"], input[type="date"], textarea, select').forEach(element => {
      if (!element.readOnly) {
        element.value = '';
      }
    });
  }
}
