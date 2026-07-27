// ================= Global States =================
let rawData = [];
let uploadedFiles = []; 
let currentStep = 1;
const totalSteps = 4;

// 🔗 Google Apps Script Web App URL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyel3vYNVIEiRC8yEiv14_uan5DYdUGFS3KgUmQvnplZ3NyFS7EOHoYOyHukfQLCOkXFw/exec";

// ================= Initialization =================
window.addEventListener('DOMContentLoaded', () => {
  fetch('csvjson.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      rawData = data;
      initApp();
    })
    .catch(error => {
      console.warn('ไม่สามารถโหลด csvjson.json ได้ หรือไม่มีไฟล์:', error);
      initApp();
    });
});

function initApp() {
  initDropdowns();
  setupFileUploads(); 
  setDefaultDate();
  setupSaleCodeFormatting();
  loadDraft();
  setupAutoSave();
}

// ================= Sale Code Auto-Uppercase & Filter =================
function setupSaleCodeFormatting() {
  const saleCodeInput = document.getElementById('saleCode');
  if (saleCodeInput) {
    saleCodeInput.addEventListener('input', function() {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }
}

// ================= Smart Defaults =================
function setDefaultDate() {
  const dateInput = document.getElementById('nextFollowUpDate');
  if (dateInput && !dateInput.value) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dateInput.value = nextWeek.toISOString().split('T')[0];
  }
}

// ================= Step Wizard (แบ่งหน้า + Validation) =================
function changeStep(stepChange) {
  if (stepChange === 1) {
    const validation = validateCurrentStep();
    if (!validation.isValid) {
      Swal.fire({
        title: '⚠️ คำเตือน',
        html: `กรุณากรอกข้อมูลในช่องที่จำเป็น (*) ให้ครบถ้วน:<br><br><div style="text-align: left; padding-left: 20px; color: #e53e3e;">- ${validation.missingFields.join('<br>- ')}</div>`,
        icon: 'warning',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#1e3c72'
      });
      return;
    }
  }

  currentStep += stepChange;
  if (currentStep < 1) currentStep = 1;
  if (currentStep > totalSteps) currentStep = totalSteps;

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
  if (!currentSection) return { isValid: true, missingFields: [] };

  const requiredInputs = currentSection.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;
  let missingFields = [];

  requiredInputs.forEach(input => {
    let fieldValid = true;

    if (!input.value.trim()) {
      fieldValid = false;
    }

    if (input.id === 'saleCode') {
      const codeVal = input.value.trim();
      if (codeVal.length !== 6) {
        fieldValid = false;
      }
    }

    if (!fieldValid) {
      input.classList.add('is-invalid');
      isValid = false;
      
      const labelEl = currentSection.querySelector(`label[for="${input.id}"]`);
      let fieldName = labelEl ? labelEl.innerText.replace('*', '').trim() : input.id;
      
      if (input.id === 'saleCode' && input.value.trim().length > 0 && input.value.trim().length !== 6) {
        fieldName += ' (ต้องระบุ 6 หลัก เช่น SAA001)';
      }

      if (!missingFields.includes(fieldName)) {
        missingFields.push(fieldName);
      }
    } else {
      input.classList.remove('is-invalid');
    }
  });

  return { isValid, missingFields };
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
        if (projInput && draftData.project) {
          projInput.value = draftData.project;
        }
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
  }
}

function clearFormAndDraft() {
  Swal.fire({
    title: '⚠️ คำเตือน',
    text: 'ต้องการเริ่มฟอร์มใหม่และล้างข้อมูลที่พิมพ์ค้างไว้ทั้งหมดหรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ใช่, ล้างข้อมูล',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem('visitReportDraft');
      location.reload();
    }
  });
}

// ================= Custom Dropdowns (รองรับ Touch & Desktop) =================
function initDropdowns() {
  bindAutocomplete('developer', 'developerDropdown', 
    () => {
      if (!rawData || rawData.length === 0) return ['อื่นๆ'];
      const devs = [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean);
      if (!devs.includes('อื่นๆ')) devs.push('อื่นๆ');
      return devs;
    },
    (selectedDev) => {
      syncProjectInputState(selectedDev);
    }
  );

  bindAutocomplete('project', 'projectDropdown', 
    () => {
      const currentDev = document.getElementById('developer').value.trim();
      if (!currentDev || !rawData || rawData.length === 0) return [];
      
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
      
      const handleSelect = (e) => {
        e.preventDefault();
        input.value = item;
        dropdown.style.display = 'none';
        saveDraft(); 
        if (onSelectCallback) onSelectCallback(item);
      };

      div.addEventListener('touchstart', handleSelect, { passive: false });
      div.addEventListener('mousedown', handleSelect);
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
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    if (inputId === 'developer') syncProjectInputState(this.value);
  });
}

function syncProjectInputState(developerValue) {
  const devTrimmed = developerValue.trim();
  const projInput = document.getElementById('project');
  
  if (!projInput) return;

  if (devTrimmed) {
    projInput.disabled = false;
    const developers = rawData.length > 0 ? [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean) : [];
    const matchedDev = developers.find(d => d.toLowerCase() === devTrimmed.toLowerCase());
    
    if (matchedDev) {
      projInput.placeholder = 'พิมพ์ค้นหา หรือ เลือกโครงการ...';
    } else {
      projInput.placeholder = 'พิมพ์ชื่อโครงการ...';
    }
  } else {
    projInput.disabled = true;
    projInput.placeholder = 'รอเลือก Developer...';
    projInput.value = '';
  }
}

// ================= File Uploads & Camera Handling =================
function setupFileUploads() {
  const cameraInput = document.getElementById('cameraUpload');
  const fileInput = document.getElementById('fileUpload');
  
  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = ''; // รีเซ็ตค่าเพื่อให้กดถ่ายรูปซ้ำหลายๆ ครั้งได้
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = ''; // รีเซ็ตค่าเพื่อให้เลือกไฟล์เดิมซ้ำได้
    });
  }
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    // จำกัดขนาดไฟล์ไม่เกิน 3MB
    if (file.size > 3 * 1024 * 1024) {
      Swal.fire({
        title: '⚠️ ขนาดไฟล์เกิน',
        text: `ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 3MB`,
        icon: 'warning',
        confirmButtonText: 'ตกลง'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      uploadedFiles.push({ 
        name: file.name, 
        type: file.type, 
        data: e.target.result 
      });
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
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    
    if (fileObj.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = fileObj.data;
      img.style.width = '80px';
      img.style.height = '80px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';
      img.style.border = '1px solid #ddd';
      wrapper.appendChild(img);
    } else {
      const badge = document.createElement('div');
      badge.style.padding = '8px 12px';
      badge.style.background = '#e2e8f0';
      badge.style.borderRadius = '6px';
      badge.style.fontSize = '12px';
      badge.textContent = '📄 ' + fileObj.name;
      wrapper.appendChild(badge);
    }
    
    // ปุ่มลบรูป [X]
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.innerHTML = '×';
    delBtn.style.position = 'absolute';
    delBtn.style.top = '-5px';
    delBtn.style.right = '-5px';
    delBtn.style.background = '#e53e3e';
    delBtn.style.color = '#fff';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '50%';
    delBtn.style.width = '22px';
    delBtn.style.height = '22px';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = () => removeFile(index);

    wrapper.appendChild(delBtn);
    previewContainer.appendChild(wrapper);
  });
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderPreviews();
}
// ================= บันทึกและส่งข้อมูลไปยัง Email =================
async function saveData() {
  if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("YOUR_SCRIPT_ID_HERE")) {
    Swal.fire({
      title: '⚠️ ระบบยังไม่พร้อมใช้งาน',
      html: 'กรุณานำ **Web App URL** ที่ได้จาก Google Apps Script มาวางในตัวแปร <code>GAS_WEB_APP_URL</code> ในไฟล์ <code>script.js</code> ก่อนใช้งานครับ',
      icon: 'error',
      confirmButtonText: 'เข้าใจแล้ว',
      confirmButtonColor: '#1e3c72'
    });
    return;
  }

  const salesTeam = document.getElementById('salesTeam').value;
  const saleCode = document.getElementById('saleCode').value.trim().toUpperCase();
  const devValue = document.getElementById('developer').value.trim();
  const projValue = document.getElementById('project').value.trim();

  if (!salesTeam || saleCode.length !== 6 || !devValue || !projValue) {
    Swal.fire({
      title: '⚠️ คำเตือน',
      text: 'กรุณากรอกข้อมูลในขั้นตอนที่ 1 ให้ถูกต้องและครบถ้วน (ทีมขาย, Sale Code 6 หลัก, Developer, โครงการ)',
      icon: 'warning',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#1e3c72'
    }).then(() => {
      currentStep = 1;
      changeStep(0);
    });
    return;
  }

  const formData = {
    salesTeam: salesTeam,
    saleCode: saleCode,
    developer: devValue,
    project: projValue,
    contact: document.getElementById('contact').value.trim(),
    projectStatus: document.getElementById('projectStatus').value,
    saleStatus: document.getElementById('saleStatus').value.trim(),
    competitorPromotion: document.getElementById('competitorPromotion').value.trim(),
    summary: document.getElementById('summary').value.trim(),
    actionItems: document.getElementById('actionItems').value.trim(),
    nextFollowUpDate: document.getElementById('nextFollowUpDate').value,
    attachmentsCount: uploadedFiles.length,
    attachmentsList: uploadedFiles.map(f => f.name),
    timestamp: new Date().toLocaleString('th-TH')
  };

  Swal.fire({
    title: 'กำลังส่งรายงาน...',
    text: 'ระบบกำลังนำส่งข้อมูลไปยัง MDS.Admin@bangkokbank.com',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(formData)
    });

    Swal.fire({
      title: 'ส่งรายงานสำเร็จ!',
      html: `ส่งข้อมูลไปยัง <b>MDS.Admin@bangkokbank.com</b> เรียบร้อยแล้ว<br><br><b>โครงการ:</b> ${projValue}`,
      icon: 'success',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#28a745'
    }).then(() => {
      localStorage.removeItem('visitReportDraft');
      location.reload();
    });

  } catch (error) {
    console.error('Error sending data:', error);
    Swal.fire({
      title: '⚠️ เกิดข้อผิดพลาด',
      text: 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
      icon: 'error',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#1e3c72'
    });
  }
}
