let rawData = [];
let uploadedFiles = []; 

// โหลดข้อมูลจากไฟล์ csvjson.json 
window.addEventListener('DOMContentLoaded', () => {
  fetch('csvjson.json')
    .then(response => response.json())
    .then(data => {
      rawData = data;
      setupDeveloperDropdown();
      setupFileUpload(); 
    })
    .catch(error => console.error('Error loading JSON:', error));
});

// ตั้งค่าระบบค้นหา Developer เข้า Datalist
function setupDeveloperDropdown() {
  const devInput = document.getElementById('developer');
  const devList = document.getElementById('developerList');
  const projInput = document.getElementById('project');
  
  // ดึงชื่อ Developer มาใส่ Option
  const developers = [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean);
  devList.innerHTML = '';
  developers.forEach(dev => {
    const option = document.createElement('option');
    option.value = dev;
    devList.appendChild(option);
  });

  // เมื่อเลือกหรือพิมพ์ Developer ให้เปิดช่อง Project
  devInput.addEventListener('change', (e) => {
    const selectedDev = e.target.value;
    if (selectedDev) {
      projInput.disabled = false;
      projInput.placeholder = 'พิมพ์หรือเลือกโครงการ...';
      projInput.value = '';
      setupProjectDropdown(selectedDev);
    } else {
      projInput.disabled = true;
      projInput.placeholder = 'รอเลือก Developer...';
      projInput.value = '';
    }
  });
}

// ตั้งค่าระบบค้นหา Project เข้า Datalist ตาม Developer ที่เลือก
function setupProjectDropdown(selectedDeveloper) {
  const projList = document.getElementById('projectList');
  projList.innerHTML = ''; 
  
  const projects = rawData
    .filter(item => item.cDeveloper === selectedDeveloper)
    .map(item => item.cCampDesc)
    .filter(Boolean);

  projects.forEach(proj => {
    const option = document.createElement('option');
    option.value = proj;
    projList.appendChild(option);
  });
}

// ระบบจัดการไฟล์แนบและการแสดงตัวอย่างภาพ
function setupFileUpload() {
  document.getElementById('fileUpload').addEventListener('change', function(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = ''; 
    uploadedFiles = []; 

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const base64String = e.target.result;
        
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          data: base64String 
        });

        if (file.type.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = base64String;
          previewContainer.appendChild(img);
        } else {
          const div = document.createElement('div');
          div.className = 'file-name-badge';
          div.textContent = '📄 ' + file.name;
          previewContainer.appendChild(div);
        }
      };
      reader.readAsDataURL(file); 
    });
  });
}

// ฟังก์ชันปุ่มบันทึกข้อมูล (จำลอง)
function saveData() {
  const developer = document.getElementById('developer').value;
  const project = document.getElementById('project').value;
  
  if (!developer || !project) {
    alert('กรุณากรอกข้อมูล Developer และ โครงการ ให้ครบถ้วน');
    return;
  }

  const formData = {
    developer: developer,
    project: project,
    contact: document.getElementById('contact').value,
    summary: document.getElementById('summary').value,
    projectStatus: document.getElementById('projectStatus').value,
    saleStatus: document.getElementById('saleStatus').value,
    pricePromotion: document.getElementById('pricePromotion').value,
    competitorBank: document.getElementById('competitorBank').value,
    competitorPromotion: document.getElementById('competitorPromotion').value,
    marketInfo: document.getElementById('marketInfo').value,
    keyIssues: document.getElementById('keyIssues').value,
    risks: document.getElementById('risks').value,
    projectRequests: document.getElementById('projectRequests').value,
    actionItems: document.getElementById('actionItems').value,
    nextFollowUpDate: document.getElementById('nextFollowUpDate').value,
    attachments: uploadedFiles, 
    timestamp: new Date().toISOString()
  };

  console.log('Data to send:', formData);
  alert(`จำลองการบันทึกสำเร็จ! ข้อมูลพร้อมส่งไป O365 แล้ว\nมีไฟล์แนบจำนวน: ${uploadedFiles.length} ไฟล์`);
  
  clearForm();
}

// ล้างฟอร์ม
function clearForm() {
  document.querySelectorAll('input:not([type="button"]), textarea').forEach(el => el.value = '');
  document.getElementById('projectStatus').selectedIndex = 0;
  document.getElementById('project').disabled = true;
  document.getElementById('project').placeholder = 'รอเลือก Developer...';
  
  uploadedFiles = [];
  document.getElementById('previewContainer').innerHTML = '';
  document.getElementById('fileUpload').value = '';
}
