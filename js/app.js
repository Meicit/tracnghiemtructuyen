// Thay đổi thành tên miền chứa API trên Viettel của bạn
const API_URL = "https://xabinhhung.gov.vn/api_tracnghiem"; 

let candidateData = {};
let examDuration = 300; // 5 phút
let timerInterval;

function startExam() {
    candidateData.full_name = document.getElementById('full_name').value.trim();
    candidateData.birth_year = document.getElementById('birth_year').value.trim();
    candidateData.school = document.getElementById('school').value.trim();

    if(!candidateData.full_name || !candidateData.birth_year || !candidateData.school) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    // Tạm đổi nút thành "Đang kiểm tra..."
    const startBtn = document.querySelector('#register-screen button');
    startBtn.innerText = "Đang kiểm tra dữ liệu...";
    startBtn.disabled = true;

    // Gửi thông tin lên API kiểm tra
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
            // Chặn lại nếu đã thi
            alert("Bạn đã hoàn thành bài thi trước đó rồi. Mỗi thí sinh chỉ được thi 1 lần!");
        } else if (data.status === "success" && data.exists === false) {
            // Cho phép thi
            document.getElementById('register-screen').classList.add('hidden');
            document.getElementById('exam-screen').classList.remove('hidden');
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
                renderExam(res.data);
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
    questions.sort(() => Math.random() - 0.5);

    questions.forEach((q, index) => {
        let html = `<div class="question-box" data-id="${q.id}">
                        <div class="question-title">
                            Câu ${index + 1}: ${q.question_text}
                        </div>
                        <div class="options">`;
        
        let optionsArray = [
            { key: 'A', text: q.option_a },
            { key: 'B', text: q.option_b },
            { key: 'C', text: q.option_c },
            { key: 'D', text: q.option_d }
        ];

        // Nếu is_fixed == 0 (không gắn thẻ [FIX]) thì xáo trộn đáp án
        if (q.is_fixed == 0) {
            optionsArray.sort(() => Math.random() - 0.5);
        }

        optionsArray.forEach(opt => {
            html += `<label class="option-row">
                        <span class="option-text"><b>${opt.key}.</b> ${opt.text}</span>
                        <input type="radio" name="q_${q.id}" value="${opt.key}"> 
                     </label>`;
        });

        html += `</div></div>`;
        container.innerHTML += html;
    });
}

function startTimer() {
    const display = document.getElementById('timer-display');
    timerInterval = setInterval(() => {
        let m = Math.floor(examDuration / 60);
        let s = examDuration % 60;
        display.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        
        if (--examDuration < 0) {
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

    const payload = { candidate: candidateData, answers: answers };
    document.querySelector('.btn-success').innerText = "Đang chấm điểm...";

    fetch(`${API_URL}/api_submit_exam.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
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
    });
}
