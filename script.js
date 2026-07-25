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

// ระบบ Dropdown อัตโนมัติ
document.addEventListener('DOMContentLoaded', () => {
  const developerDropdown = document.getElementById('developer');
  const projectDropdown = document.getElementById('project');
  
  let developerData = {};

  // โหลดข้อมูลจาก data.json
  fetch('data.json')
      .then(response => {
          if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ data.json ได้');
          return response.json();
      })
      .then(data => {
          developerData = data;
          developerDropdown.innerHTML = '<option value="">-- กรุณาเลือก Developer --</option>';
          
          for (const developerName in developerData) {
              const option = document.createElement('option');
              option.value = developerName;
              option.textContent = developerName;
              developerDropdown.appendChild(option);
          }
      })
      .catch(error => console.error('เกิดข้อผิดพลาด:', error));

  // เมื่อเลือก Developer ให้แสดง Project
  developerDropdown.addEventListener('change', function() {
      const selectedDev = this.value;

      projectDropdown.innerHTML = '<option value="">-- กรุณาเลือก โครงการ --</option>';
      projectDropdown.disabled = true;

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

    const projectDropdown = document.getElementById('project');
    if(projectDropdown) {
        projectDropdown.innerHTML = '<option value="">-- กรุณาเลือก โครงการ --</option>';
        projectDropdown.disabled = true;
    }
  }
}
