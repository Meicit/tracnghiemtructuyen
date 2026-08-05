// NHỚ THAY ĐỔI ĐƯỜNG DẪN NÀY THÀNH TÊN MIỀN CỦA BẠN TRÊN VIETTEL
const API_URL = "https://xabinhhung.gov.vn/api_tracnghiem"; 

let candidateData = {};
let examDuration = 300; 
let timerInterval;
let examQuestions = []; 
let userAnswers = {};

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
            
            renderExam(examQuestions); 
            restoreAnswers();          
            startTimer();              
        } else {
            submitExam();
        }
    }
};

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
    // Ép khoảng trắng dư thừa về 1 khoảng trắng duy nhất
    candidateData.full_name = document.getElementById('full_name').value.replace(/\s+/g, ' ').trim();
    candidateData.birth_year = document.getElementById('birth_year').value.trim();
    candidateData.school = document.getElementById('school').value.replace(/\s+/g, ' ').trim();

    if(!candidateData.full_name || !candidateData.birth_year || !candidateData.school) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    const startBtn = document.querySelector('#register-screen button');
    startBtn.innerText = "Đang kiểm tra dữ liệu...";
    startBtn.disabled = true;

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
                    q.displayOptions = opts; 
                });

                saveState(); 
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
                        <input type="radio" name="q_${q.id}" value="${opt.key}" onchange="handleAnswerChange('${q.id}', '${opt.key}')"> 
                     </label>`;
        });

        html += `</div></div>`;
        container.innerHTML += html;
    });
}

function handleAnswerChange(qId, selectedValue) {
    userAnswers[qId] = selectedValue;
    saveState(); 
}

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
    
    let m = Math.floor(examDuration / 60);
    let s = examDuration % 60;
    display.innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

    timerInterval = setInterval(() => {
        examDuration--;
        saveState(); 

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
        localStorage.removeItem('quiz_state');

        document.getElementById('exam-screen').classList.add('hidden');
        document.getElementById('result-screen').classList.remove('hidden');
        
        document.getElementById('result-content').innerHTML = `
            <p>Họ và tên: <b>${candidateData.full_name}</b></p>
            <p>Trường: <b>${candidateData.school}</b></p>
            <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">
            <p>Số câu đúng: <b>${data.correct_count} / ${data.total}</b></p>
            <h1 style="color: #28a745; font-size: 40px; margin: 10px 0;">${data.score} <span style="font-size: 20px; color:#555;">điểm</span></h1>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeeba; margin-top: 20px; color: #856404;">
                <p style="margin: 0 0 5px 0; font-size: 15px;"><b>MÃ XÁC THỰC BÀI THI:</b></p>
                <h3 style="margin: 0; color: #d39e00; letter-spacing: 2px; font-size: 24px;">${data.result_code}</h3>
                <p style="margin: 8px 0 0 0; font-size: 13px;"><i>* Bắt buộc: Vui lòng chụp ảnh màn hình hoặc ghi lại mã này để làm bằng chứng đối chiếu.</i></p>
            </div>
        `;
    })
    .catch(error => {
        alert("Lỗi nộp bài! Vui lòng thử lại.");
        document.querySelector('.btn-success').innerText = "Nộp bài";
        document.querySelector('.btn-success').disabled = false;
    });
}
