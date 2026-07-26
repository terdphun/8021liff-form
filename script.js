let rawData = [];
let uploadedFiles = []; 
let currentStep = 1;
const totalSteps = 4;

window.addEventListener('DOMContentLoaded', () => {
  // 1. โหลดข้อมูล JSON
  fetch('csvjson.json')
    .then(response => response.json())
    .then(data => {
      rawData = data;
      setupDeveloperDropdown();
      setupFileUploads(); 
      
      // 2. ตั้งค่า Smart Default (วันที่ +7 วัน)
      setDefaultDate();
      
      // 3. โหลดข้อมูล Draft ที่เคยพิมพ์ค้างไว้ (Auto-Save)
      loadDraft();
      
      // 4. ติดตั้งตัวดักจับการพิมพ์ เพื่อบันทึก Auto-save
      setupAutoSave();
    })
    .catch(error => console.error('Error loading JSON:', error));
});

// ================= ฟีเจอร์ที่ 1: Smart Defaults =================
function setDefaultDate() {
  const dateInput = document.getElementById('nextFollowUpDate');
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  dateInput.value = nextWeek.toISOString().split('T')[0];
}

// ================= ฟีเจอร์ที่ 2: Step Wizard (แบ่งหน้า) =================
function changeStep(stepChange) {
  // ตรวจสอบความถูกต้องของข้อมูลในหน้าปัจจุบันก่อนไปหน้าถัดไป
  if (stepChange === 1 && !validateCurrentStep()) {
    alert('กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน');
    return;
  }

  currentStep += stepChange;

  // อัปเดต UI หน้าจอ
  document.querySelectorAll('.form-section').forEach((el, index) => {
    el.classList.toggle('active', index + 1 === currentStep);
  });

  // อัปเดต Progress Bar
  const progressPercent = (currentStep / totalSteps) * 100;
  document.getElementById('progressBar').style.width = progressPercent + '%';
  document.getElementById('stepIndicator').innerText = `ขั้นตอนที่ ${currentStep} จาก ${totalSteps}`;

  // ซ่อน/แสดง ปุ่มควบคุม
  document.getElementById('btnPrev').style.display = currentStep === 1 ? 'none' : 'block';
  document.getElementById('btnNext').style.display = currentStep === totalSteps ? 'none' : 'block';
  document.getElementById('btnSave').style.display = currentStep === totalSteps ? 'block' : 'none';
}

function validateCurrentStep() {
  const currentSection = document.getElementById(`step${currentStep}`);
  const requiredInputs = currentSection.querySelectorAll('input[required], select[required]');
  let isValid = true;
  requiredInputs.forEach(input => {
    if (!input.value.trim()) {
      input.style.borderColor = 'red';
      isValid = false;
    } else {
      input.style.borderColor = '#cbd5e0';
    }
  });
  return isValid;
}

// ================= ฟีเจอร์ที่ 3: Voice-to-Text (พิมพ์ด้วยเสียง) =================
function startDictation(elementId) {
  if (window.hasOwnProperty('webkitSpeechRecognition')) {
    const recognition = new webkitSpeechRecognition();
    const btn = document.activeElement;
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "th-TH"; // รองรับภาษาไทย

    recognition.onstart = function() {
      btn.classList.add('recording');
      btn.innerText = '🔴'; // เปลี่ยนไอคอนตอนกำลังฟัง
    };

    recognition.onresult = function(e) {
      const text = e.results[0][0].transcript;
      const input = document.getElementById(elementId);
      // นำข้อความที่พูดมาต่อท้ายข้อความเดิม
      input.value = input.value ? input.value + ' ' + text : text; 
      saveDraft(); // บันทึกร่างอัตโนมัติ
    };

    recognition.onerror = function(e) { console.log('Speech error:', e); };
    recognition.onend = function() {
      btn.classList.remove('recording');
      btn.innerText = '🎙️';
    };

    recognition.start();
  } else {
    alert("ขออภัย เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง (แนะนำให้ใช้ Chrome หรือ Edge)");
  }
}

// ================= ฟีเจอร์ที่ 4: Auto-Save (บันทึกร่างอัตโนมัติ) =================
function setupAutoSave() {
  const inputs = document.querySelectorAll('#visitForm input:not([type="file"]), #visitForm textarea, #visitForm select');
  inputs.forEach(input => {
    input.addEventListener('input', saveDraft);
    input.addEventListener('change', saveDraft);
  });
}

function saveDraft() {
  const draftData = {};
  const inputs = document.querySelectorAll('#visitForm input:not([type="file"]), #visitForm textarea, #visitForm select');
  inputs.forEach(input => {
    draftData[input.id] = input.value;
  });
  localStorage.setItem('visitReportDraft', JSON.stringify(draftData));
}

function loadDraft() {
  const saved = localStorage.getItem('visitReportDraft');
  if (saved) {
    const draftData = JSON.parse(saved);
    Object.keys(draftData).forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = draftData[key];
    });
    
    // หากเคยเลือก Developer ไว้ ให้เปิดช่อง Project ด้วย
    if (draftData.developer) {
      document.getElementById('project').disabled = false;
      setupProjectDropdown(draftData.developer);
      document.getElementById('project').value = draftData.project || '';
    }
  }
}

function clearFormAndDraft() {
  if(confirm('ต้องการเริ่มฟอร์มใหม่และล้างข้อมูลที่พิมพ์ค้างไว้ทั้งหมดหรือไม่?')) {
    localStorage.removeItem('visitReportDraft');
    location.reload();
  }
}

// ================= ฟังก์ชันพื้นฐาน (ดรอปดาวน์ และ ไฟล์) =================
function setupDeveloperDropdown() {
  const devInput = document.getElementById('developer');
  const devList = document.getElementById('developerList');
  const projInput = document.getElementById('project');
  
  const developers = [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean);
  devList.innerHTML = '';
  developers.forEach(dev => devList.appendChild(new Option(dev, dev)));

  const validateDeveloper = (e) => {
    const selectedText = e.target.value.trim();
    if (developers.includes(selectedText)) {
      projInput.disabled = false;
      projInput.placeholder = 'พิมพ์ค้นหา หรือ เลือกโครงการ...';
      setupProjectDropdown(selectedText);
    } else {
      projInput.disabled = true;
      projInput.value = '';
    }
  };
  devInput.addEventListener('input', validateDeveloper);
  devInput.addEventListener('change', validateDeveloper);
}

function setupProjectDropdown(selectedDeveloper) {
  const projList = document.getElementById('projectList');
  projList.innerHTML = ''; 
  const projects = rawData.filter(item => item.cDeveloper === selectedDeveloper).map(item => item.cCampDesc).filter(Boolean);
  projects.forEach(proj => projList.appendChild(new Option(proj, proj)));
}

function setupFileUploads() {
  const cameraInput = document.getElementById('cameraUpload');
  const fileInput = document.getElementById('fileUpload');
  if(cameraInput) cameraInput.addEventListener('change', (e) => handleFiles(e.target.files));
  if(fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
}

function handleFiles(files) {
  const previewContainer = document.getElementById('previewContainer');
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedFiles.push({ name: file.name, type: file.type, data: e.target.result });
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = e.target.result;
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
}

function saveData() {
  if (!validateCurrentStep()) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนบันทึก');
    return;
  }
  
  alert('บันทึกข้อมูลสำเร็จ! ระบบกำลังเตรียมส่งไป O365...');
  localStorage.removeItem('visitReportDraft'); // เคลียร์ Draft เมื่อส่งสำเร็จ
  location.reload(); // รีเซ็ตหน้าเว็บ
}
