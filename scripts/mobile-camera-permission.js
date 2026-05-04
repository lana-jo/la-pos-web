// Mobile Camera Permission Script
// Script ini bisa dijalankan di browser mobile untuk meminta izin kamera

// Fungsi untuk mendeteksi tipe browser mobile
function detectMobileBrowser() {
  const userAgent = navigator.userAgent;
  
  if (/CriOS/i.test(userAgent)) return 'Chrome iOS';
  if (/FxiOS/i.test(userAgent)) return 'Firefox iOS';
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
  if (/Chrome/i.test(userAgent)) return 'Chrome';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  if (/Edge/i.test(userAgent)) return 'Edge';
  if (/Opera/i.test(userAgent)) return 'Opera';
  
  return 'Unknown';
}

// Fungsi untuk mendapatkan instruksi per browser
function getBrowserInstructions() {
  const browser = detectMobileBrowser();
  
  const instructions = {
    'Chrome iOS': {
      name: 'Chrome iOS',
      icon: '📱',
      steps: [
        'Tap ikon ⋮ (tiga titik) di pojok kanan atas',
        'Pilih "Settings" (Pengaturan)',
        'Tap "Content Settings" atau "Site Settings"',
        'Tap "Camera" (Kamera)',
        'Pilih "Allow" untuk situs ini'
      ],
      alternative: 'Atau tap ikon gembok 🔒 di address bar dan izinkan kamera'
    },
    'Safari': {
      name: 'Safari iOS',
      icon: '📱',
      steps: [
        'Buka app "Settings" (Pengaturan) di iPhone/iPad',
        'Scroll ke bawah dan tap "Safari"',
        'Tap "Camera" (Kamera)',
        'Pilih "Allow" (Izinkan)',
        'Kembali ke Safari dan refresh halaman'
      ],
      alternative: 'Pastikan Safari tidak dalam mode Private Browsing'
    },
    'Chrome': {
      name: 'Chrome Android',
      icon: '📱',
      steps: [
        'Tap ikon ⋮ (tiga titik) di pojok kanan atas',
        'Pilih "Settings" (Pengaturan)',
        'Tap "Site settings" (Pengaturan situs)',
        'Tap "Camera" (Kamera)',
        'Cari situs ini dan tap "Allow" (Izinkan)'
      ],
      alternative: 'Atau tap ikon gembok 🔒 di address bar dan ubah permission kamera'
    },
    'Firefox': {
      name: 'Firefox Mobile',
      icon: '📱',
      steps: [
        'Tap ikon ⋮ (tiga titik) di pojok kanan atas',
        'Pilih "Settings" (Pengaturan)',
        'Tap "Site Permissions" (Izin Situs)',
        'Tap "Camera" (Kamera)',
        'Izinkan situs ini'
      ],
      alternative: 'Atau tap ikon shield 🛡️ di address bar untuk permission cepat'
    },
    'Edge': {
      name: 'Edge Mobile',
      icon: '📱',
      steps: [
        'Tap ikon ⋮ (tiga titik) di pojok bawah',
        'Pilih "Settings"',
        'Tap "Site permissions"',
        'Tap "Camera"',
        'Izinkan situs ini'
      ],
      alternative: 'Cek address bar untuk ikon permission'
    },
    'Unknown': {
      name: 'Browser Mobile',
      icon: '📱',
      steps: [
        'Cari menu pengaturan (biasanya ikon ⋮)',
        'Cari "Settings" atau "Pengaturan"',
        'Cari "Permissions" atau "Izin"',
        'Cari "Camera" atau "Kamera"',
        'Izinkan situs ini'
      ],
      alternative: 'Cek address bar untuk ikon permission kamera'
    }
  };
  
  return instructions[browser] || instructions['Unknown'];
}

// Fungsi untuk meminta izin kamera
async function requestCameraPermission() {
  try {
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser tidak mendukung akses kamera');
    }
    
    // Check HTTPS
    if (location.protocol !== 'https:' && 
        location.hostname !== 'localhost' && 
        location.hostname !== '127.0.0.1') {
      throw new Error('Memerlukan HTTPS untuk akses kamera');
    }
    
    // Request camera permission
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
    // Stop the stream immediately (just for permission test)
    stream.getTracks().forEach(track => track.stop());
    
    return { success: true, message: 'Izin kamera berhasil diberikan!' };
    
  } catch (error) {
    let message = 'Gagal meminta izin kamera';
    
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      message = 'Izin kamera ditolak. Silakan ikuti instruksi di bawah.';
    } else if (error.name === 'NotFoundError' || error.message.includes('No camera')) {
      message = 'Tidak ada kamera yang terdeteksi.';
    } else if (error.name === 'NotSupportedError') {
      message = 'Browser tidak mendukung kamera.';
    } else if (error.name === 'NotReadableError') {
      message = 'Kamera sedang digunakan aplikasi lain.';
    } else if (error.message.includes('HTTPS')) {
      message = error.message;
    }
    
    return { success: false, message, error };
  }
}

// Fungsi untuk menampilkan UI helper
function showPermissionHelper() {
  const browser = detectMobileBrowser();
  const instructions = getBrowserInstructions();
  
  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 12px;
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 20px;
    ">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 10px;">📷</div>
        <h2 style="margin: 0; color: #333;">Izin Kamera Diperlukan</h2>
        <p style="margin: 10px 0; color: #666; font-size: 14px;">
          Scanner barcode memerlukan akses kamera untuk berfungsi
        </p>
      </div>
      
      <div style="
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 20px;
      ">
        <p style="margin: 0; font-weight: bold; color: #0ea5e9;">
          ${instructions.icon} ${instructions.name}
        </p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">Langkah-langkah:</h3>
        ${instructions.steps.map((step, index) => `
          <div style="display: flex; margin-bottom: 8px; align-items: flex-start;">
            <span style="
              background: #3b82f6;
              color: white;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              margin-right: 8px;
              flex-shrink: 0;
            ">${index + 1}</span>
            <span style="font-size: 14px; line-height: 1.4;">${step}</span>
          </div>
        `).join('')}
      </div>
      
      ${instructions.alternative ? `
        <div style="
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        ">
          <p style="margin: 0; font-size: 14px;">
            💡 <strong>Cara cepat:</strong> ${instructions.alternative}
          </p>
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 10px;">
        <button id="requestPermission" style="
          flex: 1;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">
          📱 Izinkan Kamera
        </button>
        <button id="closeModal" style="
          flex: 1;
          background: #e5e7eb;
          color: #333;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        ">
          Tutup
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('requestPermission').addEventListener('click', async () => {
    const button = document.getElementById('requestPermission');
    button.textContent = '⏳ Meminta izin...';
    button.disabled = true;
    
    const result = await requestCameraPermission();
    
    if (result.success) {
      modal.innerHTML = `
        <div style="
          background: white;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        ">
          <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
          <h2 style="margin: 0; color: #10b981;">Berhasil!</h2>
          <p style="margin: 10px 0; color: #666;">${result.message}</p>
          <button id="closeSuccess" style="
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          ">
            OK
          </button>
        </div>
      `;
      
      document.getElementById('closeSuccess').addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    } else {
      button.textContent = '📱 Izinkan Kamera';
      button.disabled = false;
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        background: #fef2f2;
        border: 1px solid #ef4444;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 20px;
        color: #dc2626;
        font-size: 14px;
      `;
      errorDiv.textContent = result.message;
      
      const modalContent = modal.querySelector('div > div');
      modalContent.insertBefore(errorDiv, modalContent.querySelector('div[style*="text-align"]'));
    }
  });
  
  document.getElementById('closeModal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Export functions untuk digunakan di aplikasi
window.MobileCameraHelper = {
  detectMobileBrowser,
  getBrowserInstructions,
  requestCameraPermission,
  showPermissionHelper
};

// Auto-run jika URL mengandung parameter khusus
if (location.search.includes('camera-permission=true')) {
  showPermissionHelper();
}

console.log('Mobile Camera Permission Helper loaded! Gunakan MobileCameraHelper.showPermissionHelper() untuk menampilkan bantuan izin kamera.');
