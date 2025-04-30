// --- Constants ---
const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00"
];

// --- State ---
let people = [];
let schedule = {};
let selectedCells = new Set();

// --- DOM Elements ---
const personNameInput = document.getElementById('personName');
const personColorInput = document.getElementById('personColor');
const addPersonBtn = document.getElementById('addPersonBtn');
const personDropdown = document.getElementById('personDropdown');
const addToTableBtn = document.getElementById('addToTableBtn');
const scheduleTableContainer = document.getElementById('scheduleTableContainer');
const clearAllBtn = document.getElementById('clearAllBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const csvInput = document.getElementById('csvInput');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

// --- Utility Functions ---
function makeCellKey(hour, day) {
    return `${hour}|${day}`;
}

function renderPeopleDropdown() {
    personDropdown.innerHTML = '';
    people.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = p.name;
        opt.style.backgroundColor = p.color;
        personDropdown.appendChild(opt);
    });
}

function renderScheduleTable() {
    let html = '<table class="schedule-table"><thead><tr><th>Hora</th>';
    DAYS.forEach(day => {
        html += `<th>${day}</th>`;
    });
    html += '</tr></thead><tbody>';
    HOURS.forEach(hour => {
        html += `<tr><th>${hour}</th>`;
        DAYS.forEach(day => {
            const key = makeCellKey(hour, day);
            let cellContent = '';
            let cellStyle = '';
            let cellClass = selectedCells.has(key) ? 'selected' : '';
            if (schedule[key] !== undefined) {
                const person = people[schedule[key]];
                if (person) {
                    cellContent = person.name;
                    cellStyle = `background:${person.color};color:#000;font-weight:600;`;
                }
            }
            html += `<td data-hour="${hour}" data-day="${day}" class="${cellClass}" style="${cellStyle}">${cellContent}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    scheduleTableContainer.innerHTML = html;
    // Add click listeners
    document.querySelectorAll('.schedule-table td').forEach(td => {
        td.addEventListener('click', () => {
            const hour = td.getAttribute('data-hour');
            const day = td.getAttribute('data-day');
            const key = makeCellKey(hour, day);
            if (selectedCells.has(key)) {
                selectedCells.delete(key);
            } else {
                selectedCells.add(key);
            }
            renderScheduleTable();
        });
    });
}

function resetSelection() {
    selectedCells.clear();
    renderScheduleTable();
}

function saveToLocalStorage() {
    localStorage.setItem('people', JSON.stringify(people));
    localStorage.setItem('schedule', JSON.stringify(schedule));
}

function loadFromLocalStorage() {
    const p = localStorage.getItem('people');
    const s = localStorage.getItem('schedule');
    if (p && s) {
        people = JSON.parse(p);
        schedule = JSON.parse(s);
        renderPeopleDropdown();
        renderScheduleTable();
    }
}

function clearAll() {
    people = [];
    schedule = {};
    selectedCells.clear();
    renderPeopleDropdown();
    renderScheduleTable();
    localStorage.removeItem('people');
    localStorage.removeItem('schedule');
}

function exportToCSV() {
    let csv = 'People\n';
    people.forEach(p => {
        csv += `${p.name},${p.color}\n`;
    });
    csv += '\nSchedule\n';
    for (const key in schedule) {
        csv += `${key},${schedule[key]}\n`;
    }
    return csv;
}

function importFromCSV(csv) {
    const lines = csv.split(/\r?\n/);
    let mode = '';
    let newPeople = [];
    let newSchedule = {};
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        if (line === 'People') { mode = 'people'; continue; }
        if (line === 'Schedule') { mode = 'schedule'; continue; }
        if (mode === 'people') {
            const [name, color] = line.split(',');
            if (name && color) newPeople.push({ name, color });
        } else if (mode === 'schedule') {
            const [key, idx] = line.split(',');
            if (key && idx !== undefined) newSchedule[key] = parseInt(idx);
        }
    }
    people = newPeople;
    schedule = newSchedule;
    renderPeopleDropdown();
    renderScheduleTable();
}

// --- Event Listeners ---
addPersonBtn.addEventListener('click', () => {
    const name = personNameInput.value.trim();
    const color = personColorInput.value;
    if (!name) return alert('Enter a name');
    people.push({ name, color });
    renderPeopleDropdown();
    personNameInput.value = '';
    personColorInput.value = '#ff0000';
    saveToLocalStorage();
});

addToTableBtn.addEventListener('click', () => {
    const idx = personDropdown.value;
    if (idx === '' || people.length === 0) return alert('Select a person');
    selectedCells.forEach(key => {
        schedule[key] = parseInt(idx);
    });
    resetSelection();
    saveToLocalStorage();
});

clearAllBtn.addEventListener('click', () => {
    if (confirm('Clear all data?')) clearAll();
});

saveBtn.addEventListener('click', () => {
    const csv = exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

loadBtn.addEventListener('click', () => {
    csvInput.value = '';
    csvInput.click();
});

csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        importFromCSV(ev.target.result);
        saveToLocalStorage();
    };
    reader.readAsText(file);
});

exportPdfBtn.addEventListener('click', () => {
    exportTableToPDF();
});

clearSelectionBtn.addEventListener('click', () => {
    // Remove assignments for selected cells
    selectedCells.forEach(key => {
        delete schedule[key];
    });
    resetSelection();
    saveToLocalStorage();
});

function exportTableToPDF() {
    const table = document.querySelector('.schedule-table');
    if (!table) return alert('No table to export!');
    html2canvas(table, { backgroundColor: '#fff', scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({ orientation: 'landscape' });
        // Calculate width/height to fit PDF page
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const pdfWidth = imgWidth * ratio;
        const pdfHeight = imgHeight * ratio;
        pdf.addImage(imgData, 'PNG', (pageWidth - pdfWidth) / 2, 10, pdfWidth, pdfHeight);
        pdf.save('schedule.pdf');
    });
}

// --- Initial Render ---
renderPeopleDropdown();
renderScheduleTable();
loadFromLocalStorage(); 