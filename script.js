// 1. ตั้งค่า LIFF ID
const LIFF_ID = "2010839050-03sJnJz"; 

async function init() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }
  } catch (e) {
    console.error("LIFF Init Error:", e);
  }
}
init();

// 2. จัดการระบบ Dropdown (Developer -> Project)
document.addEventListener('DOMContentLoaded', () => {
  const developerDropdown = document.getElementById('developer');
  const projectDropdown = document.getElementById('project');
  
  let developerData = {};

  // โหลดข้อมูลจากไฟล์ JSON
  fetch('data.json')
      .then(response => {
          if (!response.ok) {
              throw new Error('ไม่สามารถโหลดไฟล์ data.json ได้');
          }
          return response.json();
      })
      .then(data => {
          developerData = data;
          
          // นำรายชื่อ Developer มาใส่ใน Dropdown
          developerDropdown.innerHTML = '<option value="">-- กรุณาเลือก Developer --</option>';
          for (const developerName in developerData) {
              const option = document.createElement('option');
              option.value = developerName;
              option.textContent = developerName;
              developerDropdown.appendChild(option);
          }
      })
      .catch(error => console.error('เกิดข้อผิดพลาดในการดึงข้อมูล Developer:', error));

  // เมื่อเลือก Developer
  developerDropdown.addEventListener('change', function() {
      const selectedDev = this.value;

      // ล้างและล็อค Dropdown Project ไว้ก่อน
      projectDropdown.innerHTML = '<option value="">-- กรุณาเลือก Project --</option>';
      projectDropdown.disabled = true;

      // ถ้ามีการเลือก Developer ให้ดึง Project มาใส่และปลดล็อค
      if (selectedDev && developerData[selectedDev]) {
          const projects = developerData[selectedDev];
          
          projects.forEach(project => {
              const option = document.createElement('option');
              option.value = project;
              option.textContent = project;
              projectDropdown.appendChild(option);
          });
          
          projectDropdown.disabled = false;
      }
  });
});

// 3. ฟังก์ชันบันทึกและส่งข้อมูล
function saveData() {
  const project = document.getElementById("project").value.trim();
  const developer = document.getElementById("developer").value.trim();
  const contact = document.getElementById("contact").value.trim();
  
  // ตรวจสอบค่าบังคับ
  if (!project || !developer || !contact) {
    alert("กรุณากรอกข้อมูล Developer, Project และผู้ติดต่อ ให้ครบถ้วน");
    return;
  }
  
  // รวบรวมข้อมูลทั้งหมด
  const data = {
    project: project,
    developer: developer,
    contact: contact,
    summary: document.getElementById("summary").value,
    projectStatus: document.getElementById("projectStatus").value,
    saleStatus: document.getElementById("saleStatus").value,
    pricePromotion: document.getElementById("pricePromotion").value,
    competitorBank: document.getElementById("competitorBank").value,
    competitorPromotion: document.getElementById("competitorPromotion").value,
    marketInfo: document.getElementById("marketInfo").value,
    keyIssues: document.getElementById("keyIssues").value,
    risks: document.getElementById("risks").value,
    projectRequests: document.getElementById("projectRequests").value,
    actionItems: document.getElementById("actionItems").value,
    nextFollowUpDate: document.getElementById("nextFollowUpDate").value
  };
  
  // ปรับ UI ปุ่มเป็นสถานะกำลังโหลด
  const saveBtn = document.getElementById("btnSave");
  if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = "กำลังบันทึกข้อมูล...";
  }

  // ส่งข้อมูลไป Power Automate (อย่าลืมเปลี่ยน URL ตรงนี้)
  const webhookUrl = 'YOUR_POWER_AUTOMATE_WEBHOOK_URL';

  fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (response.ok) {
      alert("บันทึกข้อมูลสำเร็จ!");
      clearForm(); // ล้างข้อมูลอัตโนมัติเมื่อส่งผ่าน
    } else {
      alert("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ กรุณาลองใหม่");
    }
  })
  .catch(error => {
    console.error("Error:", error);
    alert("ไม่สามารถเชื่อมต่อระบบได้: " + error.message);
  })
  .finally(() => {
    // คืนค่าปุ่มกลับมาเหมือนเดิม
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = "บันทึกข้อมูล";
    }
  });
}

// 4. ฟังก์ชันล้างฟอร์ม
function clearForm() {
  if (confirm("คุณต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
    // ล้างค่า input, textarea และ select ทุกตัว
    document.querySelectorAll('input[type="text"], input[type="date"], textarea, select').forEach(element => {
      if (!element.readOnly) {
        element.value = '';
      }
    });

    // รีเซ็ตสถานะ Dropdown Project ให้กลับไปถูกล็อคตามเดิม
    const projectDropdown = document.getElementById('project');
    if(projectDropdown) {
        projectDropdown.innerHTML = '<option value="">-- กรุณาเลือก Project --</option>';
        projectDropdown.disabled = true;
    }
  }
}
