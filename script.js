// Global variables
let currentUser = null;
let pendingAttendance = null;

// Default PIN configuration
let pinsConfig = {
    owner: "123456",
    defaultTeacher: "111111",
    defaultStudent: "000000"
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sistem Absensi Dimuat');
    loadPinsConfig();
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
});

// Load PIN configuration from Firebase
function loadPinsConfig() {
    database.ref('pinsConfig').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            pinsConfig = snapshot.val();
            // Update form fields
            document.getElementById('ownerPin').value = pinsConfig.owner || '';
            document.getElementById('defaultTeacherPin').value = pinsConfig.defaultTeacher || '';
            document.getElementById('defaultStudentPin').value = pinsConfig.defaultStudent || '';
        }
    });
}

// Save PIN configuration to Firebase
function savePinsConfig() {
    const ownerPin = document.getElementById('ownerPin').value.trim();
    const defaultTeacherPin = document.getElementById('defaultTeacherPin').value.trim();
    const defaultStudentPin = document.getElementById('defaultStudentPin').value.trim();

    if (!ownerPin || !defaultTeacherPin || !defaultStudentPin) {
        showAlert('الرجاء ملء جميع الحقول', 'error');
        return;
    }

    if (ownerPin.length !== 6 || defaultTeacherPin.length !== 6 || defaultStudentPin.length !== 6) {
        showAlert('يجب أن يكون الرقم السري 6 أرقام', 'error');
        return;
    }

    const newConfig = {
        owner: ownerPin,
        defaultTeacher: defaultTeacherPin,
        defaultStudent: defaultStudentPin
    };

    showLoading(true);
    
    database.ref('pinsConfig').set(newConfig)
        .then(() => {
            pinsConfig = newConfig;
            showLoading(false);
            showAlert('تم حفظ الإعدادات بنجاح', 'success');
        })
        .catch(error => {
            showLoading(false);
            showAlert('خطأ في الحفظ: ' + error.message, 'error');
        });
}

// Login Function
function login() {
    const userType = document.getElementById('userType').value;
    const pin = document.getElementById('pinInput').value.trim();
    
    if (!pin) {
        showAlert('الرجاء إدخال الرقم السري', 'error');
        return;
    }
    
    if (userType === 'owner') {
        if (pin === pinsConfig.owner) {
            currentUser = { 
                type: userType, 
                name: getUserTitle(userType),
                id: 'owner'
            };
            showDashboard(userType);
            showAlert(`مرحبا بك ${getUserTitle(userType)}`, 'success');
        } else {
            showAlert('الرقم السري غير صحيح', 'error');
        }
        return;
    }
    
    // Check for teachers and students
    const userPath = `users/${userType}s`;
    let userFound = false;
    
    database.ref(userPath).once('value').then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.pin === pin) {
                userFound = true;
                currentUser = {
                    type: userType,
                    name: user.name,
                    id: childSnapshot.key,
                    userData: user
                };
                showDashboard(userType);
                showAlert(`مرحبا بك ${user.name}`, 'success');
                return true;
            }
        });
        
        if (!userFound) {
            showAlert('الرقم السري غير صحيح أو المستخدم غير مسجل', 'error');
        }
    });
}

// Show appropriate dashboard
function showDashboard(userType) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('ownerDashboard').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'none';
    
    if (userType === 'owner') {
        document.getElementById('ownerDashboard').style.display = 'block';
        loadAllData();
    } else if (userType === 'teacher') {
        document.getElementById('teacherDashboard').style.display = 'block';
        document.getElementById('teacherName').textContent = currentUser.name;
        loadStudentsAttendance();
    } else if (userType === 'student') {
        document.getElementById('studentDashboard').style.display = 'block';
        document.getElementById('studentName').textContent = currentUser.name;
        loadStudentHistory();
    }
}

// Tab management
function openTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

function openTeacherTab(tabName) {
    document.querySelectorAll('#teacherDashboard .tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('#teacherDashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Owner functions
function toggleRegisterFields() {
    const type = document.getElementById('registerType').value;
    document.getElementById('classField').style.display = type === 'student' ? 'block' : 'none';
    document.getElementById('subjectField').style.display = type === 'teacher' ? 'block' : 'none';
    
    // Set default PIN based on user type
    const defaultPin = type === 'teacher' ? pinsConfig.defaultTeacher : pinsConfig.defaultStudent;
    document.getElementById('registerPin').value = defaultPin;
}

function registerUser() {
    const type = document.getElementById('registerType').value;
    const name = document.getElementById('registerName').value.trim();
    const className = document.getElementById('registerClass').value.trim();
    const subject = document.getElementById('registerSubject').value.trim();
    const pin = document.getElementById('registerPin').value.trim();
    
    if (!name) {
        showAlert('الرجاء إدخال الاسم الكامل', 'error');
        return;
    }
    
    if (!pin || pin.length !== 6) {
        showAlert('الرجاء إدخال رقم سري صحيح (6 أرقام)', 'error');
        return;
    }
    
    if (type === 'student' && !className) {
        showAlert('الرجاء إدخال الصف الدراسي', 'error');
        return;
    }
    
    if (type === 'teacher' && !subject) {
        showAlert('الرجاء إدخال المادة الدراسية', 'error');
        return;
    }
    
    const userData = {
        name: name,
        type: type,
        class: type === 'student' ? className : null,
        subject: type === 'teacher' ? subject : null,
        pin: pin,
        registeredAt: new Date().toISOString()
    };
    
    showLoading(true);
    
    const newUserRef = database.ref('users/' + type + 's').push();
    newUserRef.set(userData)
        .then(() => {
            showAlert(`تم تسجيل ${getUserTitle(type)} "${name}" بنجاح!`, 'success');
            clearRegisterForm();
            loadAllData();
        })
        .catch(error => {
            showAlert('خطأ في التسجيل: ' + error.message, 'error');
        })
        .finally(() => {
            showLoading(false);
        });
}

function loadAllData() {
    // Load teachers
    database.ref('users/teachers').on('value', (snapshot) => {
        const teachersList = document.getElementById('teachersList');
        teachersList.innerHTML = '';
        
        if (!snapshot.exists()) {
            teachersList.innerHTML = '<div class="no-data">لا يوجد معلمون مسجلون بعد</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const teacher = childSnapshot.val();
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = `
                <div class="user-header">
                    <strong>${teacher.name}</strong>
                </div>
                <div class="user-details">
                    ${teacher.subject ? `<span>المادة: ${teacher.subject}</span>` : ''}
                    <span>الرقم السري: ******</span>
                    <small>مسجل في: ${new Date(teacher.registeredAt).toLocaleDateString('ar-EG')}</small>
                </div>
            `;
            teachersList.appendChild(div);
        });
    });
    
    // Load students
    database.ref('users/students').on('value', (snapshot) => {
        const studentsList = document.getElementById('studentsList');
        studentsList.innerHTML = '';
        
        if (!snapshot.exists()) {
            studentsList.innerHTML = '<div class="no-data">لا يوجد طلاب مسجلون بعد</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const student = childSnapshot.val();
            const div = document.createElement('div');
            div.className = 'data-item';
            div.innerHTML = `
                <div class="user-header">
                    <strong>${student.name}</strong>
                </div>
                <div class="user-details">
                    ${student.class ? `<span>الصف: ${student.class}</span>` : ''}
                    <span>الرقم السري: ******</span>
                    <small>مسجل في: ${new Date(student.registeredAt).toLocaleDateString('ar-EG')}</small>
                </div>
            `;
            studentsList.appendChild(div);
        });
    });
}

// Teacher functions
function loadStudentsAttendance() {
    const selectedDate = document.getElementById('attendanceDate').value;
    const dateToShow = selectedDate || new Date().toISOString().split('T')[0];
    
    database.ref('attendance/students').orderByChild('date').equalTo(dateToShow).on('value', (snapshot) => {
        const container = document.getElementById('studentsAttendance');
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
            container.innerHTML = '<div class="no-data">لا يوجد حضور مسجل لهذا اليوم</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const attendance = childSnapshot.val();
            const div = document.createElement('div');
            div.className = `attendance-item ${attendance.status}`;
            
            let statusText = '';
            let statusIcon = '';
            
            switch(attendance.status) {
                case 'hadir':
                    statusText = 'حضور';
                    statusIcon = 'fas fa-check-circle';
                    break;
                case 'izin':
                    statusText = 'إذن';
                    statusIcon = 'fas fa-clock';
                    break;
                case 'sakit':
                    statusText = 'مرض';
                    statusIcon = 'fas fa-procedures';
                    break;
            }
            
            div.innerHTML = `
                <div class="attendance-header">
                    <strong>${attendance.userName}</strong>
                    <span class="status ${attendance.status}">
                        <i class="${statusIcon}"></i> ${statusText}
                    </span>
                </div>
                <div class="attendance-details">
                    <span>وقت التسجيل: ${attendance.timeIn}</span>
                    ${attendance.reason ? `<span>السبب: ${attendance.reason}</span>` : ''}
                    ${attendance.location ? `
                        <span class="location">
                            <i class="fas fa-map-marker-alt"></i> 
                            موقع: ${attendance.location.latitude.toFixed(4)}, ${attendance.location.longitude.toFixed(4)}
                        </span>
                    ` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// Student functions
function loadStudentHistory() {
    database.ref('attendance/students').orderByChild('timestamp').limitToLast(5).on('value', (snapshot) => {
        const container = document.getElementById('studentAttendanceHistory');
        container.innerHTML = '';
        
        if (!snapshot.exists()) {
            container.innerHTML = '<div class="no-data">لا توجد سجلات حضور سابقة</div>';
            return;
        }
        
        const attendances = [];
        snapshot.forEach(childSnapshot => {
            attendances.push(childSnapshot.val());
        });
        
        // Reverse to show latest first
        attendances.reverse().forEach(attendance => {
            const div = document.createElement('div');
            div.className = `attendance-item ${attendance.status}`;
            
            let statusText = '';
            switch(attendance.status) {
                case 'hadir': statusText = 'حضور'; break;
                case 'izin': statusText = 'إذن'; break;
                case 'sakit': statusText = 'مرض'; break;
            }
            
            div.innerHTML = `
                <div class="attendance-header">
                    <strong>${attendance.date}</strong>
                    <span class="status ${attendance.status}">${statusText}</span>
                </div>
                <div class="attendance-details">
                    <span>الوقت: ${attendance.timeIn}</span>
                    ${attendance.reason ? `<span>السبب: ${attendance.reason}</span>` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    });
}

// Attendance Process
function startAttendanceProcess(userType, status) {
    pendingAttendance = { userType, status, reason: '' };
    simulateAttendance();
}

function showReasonForm(userType, status) {
    pendingAttendance = { userType, status, reason: '' };
    
    const modal = document.getElementById('reasonModal');
    const title = document.getElementById('reasonModalTitle');
    const label = document.getElementById('reasonLabel');
    const input = document.getElementById('reasonInput');
    const example = document.getElementById('reasonExample');
    
    if (status === 'izin') {
        title.textContent = 'طلب إذن';
        label.textContent = 'سبب الإذن';
        input.placeholder = 'أدخل سبب طلب الإذن...';
        example.textContent = 'مثال: ظرف عائلي، زيارة طبيب، إلخ.';
    } else {
        title.textContent = 'إبلاغ عن مرض';
        label.textContent = 'نوع المرض';
        input.placeholder = 'أدخل نوع المرض أو الأعراض...';
        example.textContent = 'مثال: صداع، حمى، إنفلونزا، إلخ.';
    }
    
    modal.style.display = 'flex';
    input.focus();
}

function submitAttendanceWithReason() {
    const reason = document.getElementById('reasonInput').value.trim();
    
    if (!reason) {
        showAlert('الرجاء إدخال السبب', 'error');
        return;
    }
    
    pendingAttendance.reason = reason;
    closeReasonModal();
    simulateAttendance();
}

function closeReasonModal() {
    document.getElementById('reasonModal').style.display = 'none';
    document.getElementById('reasonInput').value = '';
}

function simulateAttendance() {
    showLoading(true);
    
    // Simulate API call with GPS and camera
    setTimeout(() => {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        
        const attendanceData = {
            userType: pendingAttendance.userType,
            userName: currentUser.name,
            userId: currentUser.id,
            status: pendingAttendance.status,
            date: dateStr,
            timeIn: timeStr,
            location: {
                latitude: -6.2088 + (Math.random() - 0.5) * 0.01,
                longitude: 106.8456 + (Math.random() - 0.5) * 0.01,
                accuracy: 50
            },
            reason: pendingAttendance.reason,
            timestamp: now.toISOString()
        };
        
        const attendanceRef = database.ref('attendance/' + pendingAttendance.userType + 's').push();
        attendanceRef.set(attendanceData)
            .then(() => {
                showLoading(false);
                showAlert('تم تسجيل الحضور بنجاح!', 'success');
                
                // Refresh relevant data
                if (pendingAttendance.userType === 'teacher') {
                    loadStudentsAttendance();
                } else if (pendingAttendance.userType === 'student') {
                    loadStudentHistory();
                }
            })
            .catch(error => {
                showLoading(false);
                showAlert('خطأ في التسجيل: ' + error.message, 'error');
            });
    }, 2000);
}

// Utility functions
function getUserTitle(type) {
    const titles = {
        owner: 'المالك',
        teacher: 'المعلم', 
        student: 'الطالب'
    };
    return titles[type] || type;
}

function clearRegisterForm() {
    document.getElementById('registerName').value = '';
    document.getElementById('registerClass').value = '';
    document.getElementById('registerSubject').value = '';
    // Don't clear PIN field, keep the default value
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideDown 0.3s ease;
    `;
    
    alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 3000);
}

// Add CSS for alerts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Logout function
function logout() {
    currentUser = null;
    pendingAttendance = null;
    
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('ownerDashboard').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'none';
    document.getElementById('pinInput').value = '';
    
    // Close any open modals
    document.getElementById('reasonModal').style.display = 'none';
    
    showAlert('تم تسجيل الخروج بنجاح', 'success');
}