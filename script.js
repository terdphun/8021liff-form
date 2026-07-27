// ================= Global States =================
let rawData = [];
let uploadedFiles = []; 
let currentStep = 1;
const totalSteps = 4;

let activeRecognition = null;
let activeMicBtn = null;

window.addEventListener('DOMContentLoaded', () => {
  // 1. โหลดข้อมูล JSON
  fetch('csvjson.json')
    .then(response => response.json())
    .then(data => {
      rawData = data;
      
      // ติดตั้ง Autocomplete เพียงครั้งเดียว (ป้องกัน Memory Leak)
      initDropdowns();
      setupFileUploads(); 
      setDefaultDate();
      loadDraft();
      setupAutoSave();
    })
    .catch(error => {
      console.error('Error loading JSON:', error);
      setupFileUploads();
      setDefaultDate();
      loadDraft();
      setupAutoSave();
    });
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

// ================= Step Wizard (แบ่งหน้า + Dynamic Validation) =================
function changeStep(stepChange) {
  if (stepChange === 1) {
    const validation = validateCurrentStep();
    if (!validation.isValid) {
      alert(`กรุณากรอกข้อมูลในช่องที่จำเป็น (*) ให้ครบถ้วน:\n- ${validation.missingFields.join('\n- ')}`);
      return;
    }
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
  const requiredInputs = currentSection.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;
  let missingFields = [];

  requiredInputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('is-invalid');
      isValid = false;
      
      // ดึง Label ของ Input นั้นๆ มาแสดงผลใน Alert
      const labelEl = currentSection.querySelector(`label[for="${input.id}"]`);
      const fieldName = labelEl ? labelEl.innerText.replace('*', '').trim() : input.id;
      missingFields.push(fieldName);
    } else {
      input.classList.remove('is-invalid');
    }
  });

  return { isValid, missingFields };
}

// ================= Voice-to-Text (พิมพ์ด้วยเสียง ป้องกันการรันซ้ำ) =================
function startDictation(elementId, btnElement) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("ขออภัย เบราว์เซอร์หรือแอปพลิเคชันนี้ไม่รองรับระบบไมโครโฟน\n💡 แนะนำให้เปิดลิงก์ใน Google Chrome หรือ Safari ภายนอกครับ");
    return;
  }

  // หากกดปุ่มเดิมซ้ำขณะกำลังอัดเสียง ให้ทำการปิดใช้งาน
  if (activeRecognition && activeMicBtn === btnElement) {
    activeRecognition.stop();
    return;
  }

  // หากมีตัวบันทึกอื่นทำงานอยู่ ให้สั่งหยุดก่อน
  if (activeRecognition) {
    activeRecognition.stop();
  }

  const recognition = new SpeechRecognition();
  activeRecognition = recognition;
  activeMicBtn = btnElement;

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
    if (activeRecognition === recognition) {
      activeRecognition = null;
      activeMicBtn = null;
    }
  };

  try {
    recognition.start();
  } catch (err) {
    console.error("Speech recognition start error:", err);
  }
}

// ================= Auto-Save (บันทึกร่างอัตโนมัติ) =================
function setupAutoSave() {
  const inputs = document.querySelectorAll('#visitForm input:not([type="file"]), #visitForm textarea, #visitForm select');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      saveDraft();
    });
    input.addEventListener('change', () => {
      input.classList.remove('is-invalid');
      saveDraft();
    });
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
    try {
      const draftData = JSON.parse(saved);
      Object.keys(draftData).forEach(key => {
        const el = document.getElementById(key);
        if (el) el.value = draftData[key];
      });
      
      if (draftData.developer) {
        syncProjectInputState(draftData.developer);
        const projInput = document.getElementById('project');
        if (projInput) projInput.value = draftData.project || '';
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
  }
}

function clearFormAndDraft() {
  if (confirm('ต้องการเริ่มฟอร์มใหม่และล้างข้อมูลที่พิมพ์ค้างไว้ทั้งหมดหรือไม่?')) {
    localStorage.removeItem('visitReportDraft');
    location.reload();
  }
}

// ================= Developer & Project Custom Dropdowns (Refactored) =================
function initDropdowns() {
  // Bind Developer Dropdown
  bindAutocomplete('developer', 'developerDropdown', 
    () => [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean),
    (selectedDev) => {
      syncProjectInputState(selectedDev);
    }
  );

  // Bind Project Dropdown
  bindAutocomplete('project', 'projectDropdown', 
    () => {
      const currentDev = document.getElementById('developer').value.trim();
      if (!currentDev) return [];
      return rawData
        .filter(item => item.cDeveloper && item.cDeveloper.toLowerCase() === currentDev.toLowerCase())
        .map(item => item.cCampDesc)
        .filter(Boolean);
    },
    null
  );
}

function bindAutocomplete(inputId, dropdownId, getItemsCallback, onSelectCallback) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  function render(filterText) {
    dropdown.innerHTML = '';
    const items = getItemsCallback() || [];
    const filtered = items.filter(item => item.toLowerCase().includes(filterText.trim().toLowerCase()));
    
    if (filtered.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.textContent = item;
      // ใช้ mousedown ป้องกัน Event Blur ทำงานก่อนการคลิกเลือก
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item;
        dropdown.style.display = 'none';
        saveDraft(); 
        if (onSelectCallback) onSelectCallback(item);
      });
      dropdown.appendChild(div);
    });
    dropdown.style.display = 'block';
  }

  input.addEventListener('input', function() { 
    render(this.value); 
    if (inputId === 'developer') syncProjectInputState(this.value);
  });
  
  input.addEventListener('focus', function() { 
    render(this.value); 
  });

  input.addEventListener('blur', function() {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
    if (inputId === 'developer') syncProjectInputState(this.value);
  });
}

function syncProjectInputState(developerValue) {
  const developers = [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean);
  const matchedDev = developers.find(d => d.toLowerCase() === developerValue.trim().toLowerCase());
  const projInput = document.getElementById('project');
  
  if (!projInput) return;

  if (matchedDev) {
    if (projInput.disabled) {
      projInput.disabled = false;
      projInput.placeholder = 'พิมพ์ค้นหา หรือ เลือกโครงการ...';
    }
  } else {
    projInput.disabled = true;
    projInput.placeholder = 'รอเลือก Developer...';
    projInput.value = '';
  }
}

// ================= File Uploads & Preview with Delete (Fixed Reset Bug) =================
function setupFileUploads() {
  const cameraInput = document.getElementById('cameraUpload');
  const fileInput = document.getElementById('fileUpload');
  
  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset ค่า เพื่อให้อัปโหลดไฟล์เดิมซ้ำได้
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset ค่า เพื่อให้อัปโหลดไฟล์เดิมซ้ำได้
    });
  }
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
  if (!previewContainer) return;
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
    delBtn.title = 'ลบไฟล์นี้';
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
  const devValue = document.getElementById('developer').value.trim();
  const projValue = document.getElementById('project').value.trim();

  if (!devValue || !projValue) {
    alert('กรุณากรอกข้อมูล Developer และ โครงการ ให้ครบถ้วน');
    currentStep = 1;
    document.querySelectorAll('.form-section').forEach((el, index) => {
      el.classList.toggle('active', index === 0);
    });
    document.getElementById('progressBar').style.width = '25%';
    document.getElementById('stepIndicator').innerText = `ขั้นตอนที่ 1 จาก ${totalSteps}`;
    document.getElementById('btnPrev').style.display = 'none';
    document.getElementById('btnNext').style.display = 'block';
    document.getElementById('btnSave').style.display = 'none';
    return;
  }

  const formData = {
    developer: devValue,
    project: projValue,
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

  console.log('Data ready to transmit:', formData);
  alert(`บันทึกข้อมูลสำเร็จ!\nแนบไฟล์/รูปภาพรวม: ${uploadedFiles.length} ไฟล์`);
  
  localStorage.removeItem('visitReportDraft');
  location.reload();
}
