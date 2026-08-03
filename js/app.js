// Cấu hình URL API tới Hosting Viettel
const API_URL = "https://xabinhhung.gov.vn/api_tracnghiem"; 

let candidateData = {};
let examDuration = 300; // 5 phút
let timerInterval;

function startExam() {
    candidateData.full_name = document.getElementById('full_name').value;
    candidateData.birth_year = document.getElementById('birth_year').value;
    candidateData.school = document.getElementById('school').value;

    if(!candidateData.full_name || !candidateData.birth_year || !candidateData.school) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    document.getElementById('register-screen').classList.add('hidden');
    document.getElementById('exam-screen').classList.remove('hidden');

    fetchExam();
}

function fetchExam() {
    document.getElementById('quiz-container').innerHTML = "<p>Đang tải đề thi...</p>";
    
    fetch(`${API_URL}/api_get_exam.php`)
        .then(response => response.json())
        .then(res => {
            if(res.status === "success") {
                renderExam(res.data);
                startTimer();
            } else {
                alert("Lỗi tải đề thi!");
            }
        });
}

function renderExam(questions) {
    const container = document.getElementById('quiz-container');
    container.innerHTML = "";

    // Xáo trộn vị trí 5 câu hỏi
    questions.sort(() => Math.random() - 0.5);

    questions.forEach((q, index) => {
        let html = `<div class="question-box" data-id="${q.id}">
                        <p><b>Câu ${index + 1}:</b> ${q.question_text}</p>
                        <div class="options">`;
        
        let optionsArray = [
            { key: 'A', text: q.option_a },
            { key: 'B', text: q.option_b },
            { key: 'C', text: q.option_c },
            { key: 'D', text: q.option_d }
        ];

        // LOGIC CHỐNG LỖI XÁO TRỘN ĐÁP ÁN: Nếu is_fixed == 0 thì mới xáo trộn
        if (q.is_fixed == 0) {
            optionsArray.sort(() => Math.random() - 0.5);
        }

        optionsArray.forEach(opt => {
            html += `<label>
                        <input type="radio" name="q_${q.id}" value="${opt.key}"> 
                        ${opt.key}. ${opt.text}
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
            answers[qId] = selected.value; // Gửi key gốc (A,B,C,D) về server
        }
    });

    const payload = {
        candidate: candidateData,
        answers: answers
    };

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
            <p>Thí sinh: <b>${candidateData.full_name}</b></p>
            <p>Số câu đúng: <b>${data.correct_count} / ${data.total}</b></p>
            <h3 style="color: green;">Điểm số: ${data.score}</h3>
        `;
    });
}
