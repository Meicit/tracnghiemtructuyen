// NHỚ THAY ĐỔI ĐƯỜNG DẪN NÀY THÀNH TÊN MIỀN CỦA BẠN TRÊN VIETTEL
const API_URL = "https://xabinhhung.gov.vn/api_tracnghiem"; 

let candidateData = {};
let examDuration = 300; // 5 phút (300 giây)
let timerInterval;
let examQuestions = []; 
let userAnswers = {};

// 1. TỰ ĐỘNG KHÔI PHỤC BÀI THI KHI TẢI TRANG (F5 HOẶC MỞ LẠI TAB)
window.onload = function() {
    const savedState = localStorage.getItem('quiz_state');
    
    if (savedState) {
        const state = JSON.parse(savedState);
        candidateData = state.candidate;
        examQuestions = state.questions;
        userAnswers = state.answers || {};
        examDuration = state.timeRemaining;

        if (examDuration > 0) {
            alert("Bạn có bài thi đang làm dở. Hệ thống đã tự động khôi phục!");
            document.getElementById('register-screen').classList.add('hidden');
            document.getElementById('exam-screen').classList.remove('hidden');
            
            renderExam(examQuestions); // Render lại đúng đề cũ
            restoreAnswers();          // Tick lại các đáp án đã chọn
            startTimer();              // Chạy tiếp đồng hồ
        } else {
            // Nếu hết giờ mà lỡ tắt web, vào lại nó sẽ tự động nộp bài luôn
            submitExam();
        }
    }
};

// 2. HÀM LƯU NHÁP VÀO BỘ NHỚ TRÌNH DUYỆT (LOCAL STORAGE)
function saveState() {
    const state = {
        candidate: candidateData,
        questions: examQuestions,
        answers: userAnswers,
        timeRemaining: examDuration
    };
    localStorage.setItem('quiz_state', JSON.stringify(state));
}

function startExam() {
    candidateData.full_name = document.getElementById('full_name').value.trim();
    candidateData.birth_year = document.getElementById('birth_year').value.trim();
    candidateData.school = document.getElementById('school').value.trim();

    if(!candidateData.full_name || !candidateData.birth_year || !candidateData.school) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    const startBtn = document.querySelector('#register-screen button');
    startBtn.innerText = "Đang kiểm tra dữ liệu...";
    startBtn.disabled = true;

    // Kiểm tra xem thí sinh đã nộp bài trong DB chưa
    fetch(`${API_URL}/api_check_candidate.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidateData)
    })
    .then(response => response.json())
    .then(data => {
        startBtn.innerText = "Bắt đầu thi";
        startBtn.disabled = false;

        if (data.status === "success" && data.exists === true) {
            alert("Bạn đã hoàn thành bài thi trước đó rồi. Mỗi thí sinh chỉ được thi 1 lần!");
        } else if (data.status === "success" && data.exists === false) {
            document.getElementById('register-screen').classList.add('hidden');
            document.getElementById('exam-screen').classList.remove('hidden');
            
            // Khởi tạo mới hoàn toàn
            localStorage.removeItem('quiz_state');
            userAnswers = {};
            examDuration = 300; 
            
            fetchExam();
        } else {
            alert("Lỗi kiểm tra thông tin!");
        }
    })
    .catch(error => {
        startBtn.innerText = "Bắt đầu thi";
        startBtn.disabled = false;
        alert("Không thể kết nối tới máy chủ kiểm tra!");
    });
}

function fetchExam() {
    document.getElementById('quiz-container').innerHTML = "<p style='text-align:center;'>Đang tải đề thi...</p>";
    
    fetch(`${API_URL}/api_get_exam.php`)
        .then(response => response.json())
        .then(res => {
            if(res.status === "success") {
                examQuestions = res.data;
                
                // LƯU Ý: Tiến hành xáo trộn (Shuffle) ngay tại đây CHỈ 1 LẦN DUY NHẤT
                examQuestions.sort(() => Math.random() - 0.5);
                
                examQuestions.forEach(q => {
                    let opts = [
                        { key: 'A', text: q.option_a },
                        { key: 'B', text: q.option_b },
                        { key: 'C', text: q.option_c },
                        { key: 'D', text: q.option_d }
                    ];
                    if (q.is_fixed == 0) {
                        opts.sort(() => Math.random() - 0.5);
                    }
                    // Lưu cấu trúc đáp án đã xáo trộn vào mảng để dùng cố định
                    q.displayOptions = opts; 
                });

                saveState(); // Lưu ngay vào localStorage
                renderExam(examQuestions);
                startTimer();
            } else {
                alert("Lỗi tải đề thi!");
            }
        })
        .catch(error => alert("Không thể kết nối tới máy chủ!"));
}

function renderExam(questions) {
    const container = document.getElementById('quiz-container');
    container.innerHTML = "";

    questions.forEach((q, index) => {
        let cleanQuestionText = q.question_text.replace(/^Câu\s*\d+[\.\:\-]?\s*/i, '').trim();

        let html = `<div class="question-box" data-id="${q.id}">
                        <div class="question-title">
                            Câu ${index + 1}: ${cleanQuestionText}
                        </div>
                        <div class="options">`;
        
        const displayLabels = ['A', 'B', 'C', 'D'];

        q.displayOptions.forEach((opt, optIndex) => {
            let displayLetter = displayLabels[optIndex]; 
            html += `<label class="option-row">
                        <span class="option-text"><b>${displayLetter}.</b> ${opt.text}</span>
                        <!-- Gọi hàm handleAnswerChange mỗi khi thí sinh tick chọn -->
                        <input type="radio" name="q_${q.id}" value="${opt.key}" onchange="handleAnswerChange('${q.id}', '${opt.key}')"> 
                     </label>`;
        });

        html += `</div></div>`;
        container.innerHTML += html;
    });
}

// 3. LƯU ĐÁP ÁN NGAY KHI THÍ SINH TICK CHỌN
function handleAnswerChange(qId, selectedValue) {
    userAnswers[qId] = selectedValue;
    saveState(); // Cập nhật lại localStorage
}

// 4. HÀM PHỤC HỒI CÁC ĐÁP ÁN ĐÃ CHỌN (NẾU F5 TRANG)
function restoreAnswers() {
    for (let qId in userAnswers) {
        let radio = document.querySelector(`input[name="q_${qId}"][value="${userAnswers[qId]}"]`);
        if (radio) {
            radio.checked = true;
        }
    }
}

function startTimer() {
    const display = document.getElementById('timer-display');
    
    // In giờ ra ngay giây đầu tiên tránh độ trễ
    let m = Math.floor(examDuration / 60);
    let s = examDuration % 60;
    display.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

    timerInterval = setInterval(() => {
        examDuration--;
        saveState(); // Cứ 1 giây lại lưu tiến độ 1 lần

        let m = Math.floor(examDuration / 60);
        let s = examDuration % 60;
        display.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        
        if (examDuration <= 0) {
            clearInterval(timerInterval);
            alert("Hết giờ! Hệ thống tự động nộp bài.");
            submitExam();
        }
    }, 1000);
}

function submitExam() {
    clearInterval(timerInterval);
    
    let answers = {};
    document.querySelectorAll('.question-box').forEach(box => {
        let qId = box.getAttribute('data-id');
        let selected = box.querySelector(`input[name="q_${qId}"]:checked`);
        if (selected) {
            answers[qId] = selected.value;
        }
    });

    const payload = {
        candidate: candidateData,
        answers: answers
    };

    document.querySelector('.btn-success').innerText = "Đang chấm điểm...";
    document.querySelector('.btn-success').disabled = true;

    fetch(`${API_URL}/api_submit_exam.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        // --- NỘP THÀNH CÔNG -> XÓA BỘ NHỚ TẠM ---
        localStorage.removeItem('quiz_state');

        document.getElementById('exam-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        
        document.getElementById('result-content').innerHTML = `
            <p>Họ và tên: <b>${candidateData.full_name}</b></p>
            <p>Trường: <b>${candidateData.school}</b></p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">
            <p>Số câu đúng: <b>${data.correct_count} / ${data.total}</b></p>
            <h1 style="color: #28a745; font-size: 40px; margin: 10px 0;">${data.score} <span style="font-size: 20px; color:#555;">điểm</span></h1>
        `;
    })
    .catch(error => {
        alert("Lỗi nộp bài! Vui lòng thử lại.");
        document.querySelector('.btn-success').innerText = "Nộp bài";
        document.querySelector('.btn-success').disabled = false;
        // LƯU Ý: Nếu mạng rớt không nộp được, bộ nhớ tạm KHÔNG bị xóa. Học sinh có thể bấm Nộp lại.
    });
}
