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

// ระบบ Autocomplete (พิมพ์แล้วมีตัวเลือกเด้งขึ้นมา)
document.addEventListener('DOMContentLoaded', () => {
  const developerInput = document.getElementById('developer');
  const developerList = document.getElementById('developerList');
  const projectInput = document.getElementById('project');
  const projectList = document.getElementById('projectList');
  
  let developerData = {};

  // โหลดข้อมูลจาก data.json
  fetch('data.json')
      .then(response => {
          if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ data.json ได้');
          return response.json();
      })
      .then(data => {
          developerData = data;
          
          // นำรายชื่อ Developer ทั้งหมดมาใส่ใน Datalist
          for (const developerName in developerData) {
              const option = document.createElement('option');
              option.value = developerName;
              developerList.appendChild(option);
          }
      })
      .catch(error => console.error('เกิดข้อผิดพลาด:', error));

  // ตรวจจับเมื่อผู้ใช้พิมพ์หรือเลือก Developer
  developerInput.addEventListener('input', function() {
      const selectedDev = this.value.trim();

      // ล้างข้อมูลโครงการเดิมออกก่อน และล็อคช่องไว้
      projectInput.value = '';
      projectList.innerHTML = '';
      projectInput.disabled = true;
      projectInput.placeholder = 'รอเลือก Developer...';

      // ถ้าชื่อที่พิมพ์มา ตรงกับฐานข้อมูล (ครบถ้วน)
      if (selectedDev && developerData[selectedDev]) {
          const projects = developerData[selectedDev];
          
          // นำโครงการของ Developer เจ้านั้นมาใส่เป็นตัวเลือก
          projects.forEach(project => {
              const option = document.createElement('option');
              option.value = project;
              projectList.appendChild(option);
          });
          
          // ปลดล็อคให้พิมพ์หรือเลือกโครงการได้
          projectInput.disabled = false;
          projectInput.placeholder = 'พิมพ์เพื่อค้นหาโครงการ...';
      }
  });
});

// ฟังก์ชันบันทึกข้อมูล
function saveData() {
  const project = document.getElementById("project").value.trim();
  const developer = document.getElementById("developer").value.trim();
  const contact = document.getElementById("contact").value.trim();
  
  if (!project || !developer || !contact) {
    alert("กรุณากรอกข้อมูล Developer, โครงการ และผู้ติดต่อ ให้ครบถ้วน");
    return;
  }
  
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
  
  const saveBtn = document.getElementById("btnSave");
  if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = "กำลังบันทึกข้อมูล...";
  }

  // >>> นำ Webhook URL มาใส่ตรงนี้ <<<
  const webhookUrl = 'YOUR_POWER_AUTOMATE_WEBHOOK_URL';

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(response => {
    if (response.ok) {
      alert("บันทึกข้อมูลสำเร็จ!");
      clearForm();
    } else {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  })
  .catch(error => {
    console.error("Error:", error);
    alert("เกิดข้อผิดพลาด: " + error.message);
  })
  .finally(() => {
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = "บันทึกข้อมูล";
    }
  });
}

// ฟังก์ชันล้างฟอร์ม
function clearForm() {
  if (confirm("คุณต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
    document.querySelectorAll('input[type="text"], input[type="date"], textarea, select').forEach(element => {
      if (!element.readOnly) {
        element.value = '';
      }
    });

    // รีเซ็ตสถานะช่อง Project ให้กลับไปโดนล็อคเหมือนตอนเปิดหน้าแรก
    const projectInput = document.getElementById('project');
    const projectList = document.getElementById('projectList');
    if(projectInput) {
        projectInput.disabled = true;
        projectInput.placeholder = 'รอเลือก Developer...';
        projectList.innerHTML = '';
    }
  }
}
