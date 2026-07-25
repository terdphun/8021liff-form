let rawData = [];
let uploadedFiles = []; // ตัวแปรเก็บไฟล์แนบเตรียมส่งไป O365

// โหลดข้อมูลจากไฟล์ csvjson.json เมื่อเปิดเว็บ
window.addEventListener('DOMContentLoaded', () => {
  fetch('csvjson.json')
    .then(response => response.json())
    .then(data => {
      rawData = data;
      setupDeveloperDropdown();
      setupFileUpload(); // เรียกใช้ระบบไฟล์แนบ
    })
    .catch(error => console.error('Error loading JSON:', error));
});

// ตั้งค่าระบบค้นหา Developer
function setupDeveloperDropdown() {
  const devInput = document.getElementById('developer');
  const devDropdown = document.getElementById('developerDropdown');
  const projInput = document.getElementById('project');
  
  // ดึงรายชื่อ Developer แบบไม่ซ้ำกัน
  const developers = [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean);

  function renderList(filterText = '') {
    devDropdown.innerHTML = '';
    const filtered = developers.filter(d => d.toLowerCase().includes(filterText.toLowerCase()));
    
    if (filtered.length === 0) {
      devDropdown.style.display = 'none';
      return;
    }

    filtered.forEach(dev => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.textContent = dev;
      div.onclick = () => {
        devInput.value = dev;
        devDropdown.style.display = 'none';
        
        // เปิดใช้งานช่อง Project และตั้งค่าระบบเลือกโครงการ
        projInput.value = '';
        projInput.disabled = false;
        projInput.placeholder = 'พิมพ์เพื่อค้นหาโครงการ...';
        setupProjectDropdown(dev);
      };
      devDropdown.appendChild(div);
    });
    devDropdown.style.display = 'block';
  }

  devInput.addEventListener('input', (e) => {
    renderList(e.target.value);
    projInput.value = '';
    projInput.disabled = true;
    projInput.placeholder = 'รอเลือก Developer...';
  });

  devInput.addEventListener('focus', () => renderList(devInput.value));

  // ปิด dropdown เมื่อคลิกพื้นที่อื่น
  document.addEventListener('click', (e) => {
    if (!devInput.contains(e.target) && !devDropdown.contains(e.target)) {
      devDropdown.style.display = 'none';
    }
  });
}

// ตั้งค่าระบบค้นหา Project ตาม Developer ที่เลือก
function setupProjectDropdown(selectedDeveloper) {
  const projInput = document.getElementById('project');
  const projDropdown = document.getElementById('projectDropdown');
  
  // ดึงรายชื่อโครงการตาม Developer
  const projects = rawData
    .filter(item => item.cDeveloper === selectedDeveloper)
    .map(item => item.cCampDesc)
    .filter(Boolean);

  function renderProjList(filterText = '') {
    projDropdown.innerHTML = '';
    const filtered = projects.filter(p => p.toLowerCase().includes(filterText.toLowerCase()));

    if (filtered.length === 0) {
      projDropdown.style.display = 'none';
      return;
    }

    filtered.forEach(proj => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.textContent = proj;
      div.onclick = () => {
        projInput.value = proj;
        projDropdown.style.display = 'none';
      };
      projDropdown.appendChild(div);
    });
    projDropdown.style.display = 'block';
  }

  projInput.oninput = (e) => renderProjList(e.target.value);
  projInput.onfocus = () => renderProjList(projInput.value);

  document.addEventListener('click', (e) => {
    if (!projInput.contains(e.target) && !projDropdown.contains(e.target)) {
      projDropdown.style.display = 'none';
    }
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
        
        // เก็บไฟล์ในรูปแบบ Base64 เตรียมส่งเข้า O365
        uploadedFiles.push({
          name: file.name,
          type: file.type,
          data: base64String 
        });

        // แสดงผลตัวอย่างบนหน้าเว็บ
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
      reader.readAsDataURL(file); // อ่านไฟล์เป็น Base64
    });
  });
}

// ฟังก์ชันปุ่มบันทึกข้อมูล (แบบจำลองการส่งข้อมูล)
function saveData() {
  const developer = document.getElementById('developer').value;
  const project = document.getElementById('project').value;
  
  if (!developer || !project) {
    alert('กรุณากรอกข้อมูล Developer และ โครงการ ให้ครบถ้วน');
    return;
  }

  // รวบรวมข้อมูลทั้งหมดจากฟอร์ม
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
    attachments: uploadedFiles, // แนบไฟล์ที่แปลงเป็น Base64 ไปด้วย
    timestamp: new Date().toISOString()
  };

  // แสดงผลใน Console และ Alert เพื่อการทดสอบ
  console.log('Data to send:', formData);
  alert(`จำลองการบันทึกสำเร็จ! ข้อมูลพร้อมส่งไป O365 แล้ว\nมีไฟล์แนบจำนวน: ${uploadedFiles.length} ไฟล์`);
  
  clearForm();
}

// ฟังก์ชันล้างฟอร์ม
function clearForm() {
  document.querySelectorAll('input:not([type="button"]), textarea').forEach(el => el.value = '');
  document.getElementById('projectStatus').selectedIndex = 0;
  document.getElementById('project').disabled = true;
  document.getElementById('project').placeholder = 'รอเลือก Developer...';
  
  // ล้างไฟล์แนบ
  uploadedFiles = [];
  document.getElementById('previewContainer').innerHTML = '';
  document.getElementById('fileUpload').value = '';
}
