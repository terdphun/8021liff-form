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

// ================= Smart Defaults =================
function setDefaultDate() {
  const dateInput = document.getElementById('nextFollowUpDate');
  if (dateInput && !dateInput.value) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dateInput.value = nextWeek.toISOString().split('T')[0];
  }
}

// ================= Step Wizard (แบ่งหน้า) =================
function changeStep(stepChange) {
  if (stepChange === 1 && !validateCurrentStep()) {
    alert('กรุณากรอกข้อมูล Developer และ โครงการ ให้ครบถ้วน');
    return;
  }

  currentStep += stepChange;

  document.querySelectorAll('.form-section').forEach((el, index) => {
    el.classList.toggle('active', index + 1 === currentStep);
  });

  const progressPercent = (currentStep / totalSteps) * 100;
  document.getElementById('progressBar').style.width = progressPercent + '%';
  document.getElementById('stepIndicator').innerText = `ขั้นตอนที่ ${currentStep} จาก ${totalSteps}`;

  document.getElementById('btnPrev').style.display = currentStep === 1 ? 'none' : 'block';
  document.getElementById('btnNext').style.display = currentStep === totalSteps ? 'none' : 'block';
  document.getElementById('btnSave').style.display = currentStep === totalSteps ? 'block' : 'none';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

// ================= Voice-to-Text (พิมพ์ด้วยเสียง) =================
function startDictation(elementId, btnElement) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("ขออภัย เบราว์เซอร์หรือแอปพลิเคชันนี้ไม่รองรับระบบไมโครโฟน\n💡 แนะนำให้เปิดลิงก์ใน Google Chrome หรือ Safari ภายนอกครับ");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "th-TH";

  recognition.onstart = function() {
    if (btnElement) {
      btnElement.classList.add('recording');
      btnElement.innerText = '🔴';
    }
  };

  recognition.onresult = function(e) {
    const text = e.results[0][0].transcript;
    const input = document.getElementById(elementId);
    if (input) {
      input.value = input.value ? input.value + ' ' + text : text;
      saveDraft();
    }
  };

  recognition.onerror = function(e) {
    console.error('Speech error:', e.error);
    if (e.error === 'not-allowed') {
      alert("ถูกปฏิเสธการเข้าถึงไมโครโฟน กรุณาอนุญาตสิทธิ์ก่อนใช้งาน");
    }
  };

  recognition.onend = function() {
    if (btnElement) {
      btnElement.classList.remove('recording');
      btnElement.innerText = '🎙️';
    }
  };

  try {
    recognition.start();
  } catch (err) {
    console.error("Speech recognition start error", err);
  }
}

// ================= Auto-Save (บันทึกร่างอัตโนมัติ) =================
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
    
    if (draftData.developer) {
      const projInput = document.getElementById('project');
      projInput.disabled = false;
      setupProjectDropdown(draftData.developer);
      projInput.value = draftData.project || '';
    }
  }
}

function clearFormAndDraft() {
  if(confirm('ต้องการเริ่มฟอร์มใหม่และล้างข้อมูลที่พิมพ์ค้างไว้ทั้งหมดหรือไม่?')) {
    localStorage.removeItem('visitReportDraft');
    location.reload();
  }
}

// ================= Developer & Project Dropdowns =================
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
      document.getElementById('projectList').innerHTML = '';
    }
    saveDraft();
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

// ================= File Uploads & Preview with Delete =================
function setupFileUploads() {
  const cameraInput = document.getElementById('cameraUpload');
  const fileInput = document.getElementById('fileUpload');
  if(cameraInput) cameraInput.addEventListener('change', (e) => handleFiles(e.target.files));
  if(fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedFiles.push({ name: file.name, type: file.type, data: e.target.result });
      renderPreviews();
    };
    reader.readAsDataURL(file); 
  });
}

function renderPreviews() {
  const previewContainer = document.getElementById('previewContainer');
  previewContainer.innerHTML = '';

  uploadedFiles.forEach((fileObj, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = fileObj.type.startsWith('image/') ? 'preview-item' : 'file-badge-wrapper';
    
    if (fileObj.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = fileObj.data;
      wrapper.appendChild(img);
    } else {
      const badge = document.createElement('div');
      badge.className = 'file-name-badge';
      badge.textContent = '📄 ' + fileObj.name;
      wrapper.appendChild(badge);
    }
    
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-delete-preview';
    delBtn.innerHTML = '×';
    delBtn.onclick = () => removeFile(index);

    wrapper.appendChild(delBtn);
    previewContainer.appendChild(wrapper);
  });
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderPreviews();
}

function saveData() {
  if (!document.getElementById('developer').value || !document.getElementById('project').value) {
    alert('กรุณากรอกข้อมูล Developer และ โครงการ ให้ครบถ้วน');
    currentStep = 1;
    changeStep(0);
    return;
  }

  const formData = {
    developer: document.getElementById('developer').value,
    project: document.getElementById('project').value,
    contact: document.getElementById('contact').value,
    projectStatus: document.getElementById('projectStatus').value,
    saleStatus: document.getElementById('saleStatus').value,
    competitorPromotion: document.getElementById('competitorPromotion').value,
    summary: document.getElementById('summary').value,
    actionItems: document.getElementById('actionItems').value,
    nextFollowUpDate: document.getElementById('nextFollowUpDate').value,
    attachments: uploadedFiles, 
    timestamp: new Date().toISOString()
  };

  console.log('Data to send:', formData);
  alert(`บันทึกข้อมูลสำเร็จ!\nแนบไฟล์/รูปภาพรวม: ${uploadedFiles.length} ไฟล์`);
  
  localStorage.removeItem('visitReportDraft');
  location.reload();
}
