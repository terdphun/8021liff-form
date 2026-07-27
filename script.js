// ================= Global States =================
let rawData = [];
let uploadedFiles = []; 
let currentStep = 1;
const totalSteps = 4;

// **ใส่ URL ที่ได้จากการ Deploy Google Apps Script ที่นี่**
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyxgodNAOOYar7FuMyPeL76fsbWjV98EMfyy9FjZa_GcYyCOiErK8Ued79mDKeezWtZ1Q/exec";

window.addEventListener('DOMContentLoaded', () => {
  fetch('csvjson.json')
    .then(response => response.json())
    .then(data => {
      rawData = data;
      initDropdowns();
      setupFileUploads(); 
      setDefaultDate();
      setupSaleCodeFormatting();
      loadDraft();
      setupAutoSave();
    })
    .catch(error => {
      console.error('Error loading JSON:', error);
      initDropdowns();
      setupFileUploads();
      setDefaultDate();
      setupSaleCodeFormatting();
      loadDraft();
      setupAutoSave();
    });
});

// ================= Sale Code Auto-Uppercase =================
function setupSaleCodeFormatting() {
  const saleCodeInput = document.getElementById('saleCode');
  if (saleCodeInput) {
    saleCodeInput.addEventListener('input', function() {
      this.value = this.value.toUpperCase();
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

// ================= Step Wizard (แบ่งหน้า + Dynamic Validation) =================
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
    let fieldValid = true;

    // ตรวจสอบค่าว่าง
    if (!input.value.trim()) {
      fieldValid = false;
    }

    // ตรวจสอบความยาว Sale Code (บังคับ 6 หลัก)
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

// ================= แนะนำการพิมพ์ด้วยเสียงผ่านคีย์บอร์ดมือถือ =================
function startDictation(elementId, btnElement) {
  const inputEl = document.getElementById(elementId);
  
  // โฟกัสไปที่ช่องพิมพ์ทันทีเพื่อให้คีย์บอร์ดเด้งขึ้นมา
  if (inputEl) {
    inputEl.focus();
  }

  // แสดงป๊อปอัปคำแนะนำการกดไมค์บนคีย์บอร์ด
  Swal.fire({
    title: '💡 วิธีพิมพ์ด้วยเสียง',
    html: `
      <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #2d3748;">
        คีย์บอร์ดถูกเปิดขึ้นมาแล้ว สามารถกดปุ่มไมโครโฟนบนคีย์บอร์ดเพื่อพูดได้เลยครับ:<br><br>
        🍎 <b>iOS (iPhone / iPad):</b><br>
        แตะไอคอน 🎙️ ที่มุมขวาล่างของคีย์บอร์ด<br><br>
        🤖 <b>Android (Gboard):</b><br>
        แตะไอคอน 🎙️ ที่มุมขวาบนของคีย์บอร์ด
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'เข้าใจแล้ว',
    confirmButtonColor: '#1e3c72',
    timer: 5000,
    timerProgressBar: true
  });
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

// ================= Developer & Project Custom Dropdowns =================
function initDropdowns() {
  bindAutocomplete('developer', 'developerDropdown', 
    () => {
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
  const devTrimmed = developerValue.trim();
  const projInput = document.getElementById('project');
  
  if (!projInput) return;

  if (devTrimmed) {
    projInput.disabled = false;
    const developers = [...new Set(rawData.map(item => item.cDeveloper))].filter(Boolean);
    const matchedDev = developers.find(d => d.toLowerCase() === devTrimmed.toLowerCase());
    
    if (matchedDev) {
      projInput.placeholder = 'พิมพ์ค้นหา หรือ เลือกโครงการ...';
    } else {
      projInput.placeholder = 'พิมพ์ค้นหา หรือ กรอกชื่อโครงการ...';
    }
  } else {
    projInput.disabled = true;
    projInput.placeholder = 'รอเลือก Developer...';
    projInput.value = '';
  }
}

// ================= File Uploads & Preview =================
function setupFileUploads() {
  const cameraInput = document.getElementById('cameraUpload');
  const fileInput = document.getElementById('fileUpload');
  
  if (cameraInput) {
    cameraInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = ''; 
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      e.target.value = ''; 
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

// ================= บันทึกและส่งข้อมูลไปยัง Email =================
async function saveData() {
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
      document.querySelectorAll('.form-section').forEach((el, index) => {
        el.classList.toggle('active', index === 0);
      });
      document.getElementById('progressBar').style.width = '25%';
      document.getElementById('stepIndicator').innerText = `ขั้นตอนที่ 1 จาก ${totalSteps}`;
      document.getElementById('btnPrev').style.display = 'none';
      document.getElementById('btnNext').style.display = 'block';
      document.getElementById('btnSave').style.display = 'none';
    });
    return;
  }

  // เตรียมโครงสร้างข้อมูล JSON
  const formData = {
    salesTeam: salesTeam,
    saleCode: saleCode,
    developer: devValue,
    project: projValue,
    contact: document.getElementById('contact').value,
    projectStatus: document.getElementById('projectStatus').value,
    saleStatus: document.getElementById('saleStatus').value,
    competitorPromotion: document.getElementById('competitorPromotion').value,
    summary: document.getElementById('summary').value,
    actionItems: document.getElementById('actionItems').value,
    nextFollowUpDate: document.getElementById('nextFollowUpDate').value,
    attachmentsCount: uploadedFiles.length,
    timestamp: new Date().toLocaleString('th-TH')
  };

  // แสดง Loading ป๊อปอัป
  Swal.fire({
    title: 'กำลังส่งรายงาน...',
    text: 'ระบบกำลังนำส่งข้อมูลไปยัง MDS.Admin@bangkokbank.com',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
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
      text: 'ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      icon: 'error',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#1e3c72'
    });
  }
}
