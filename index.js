/* ---------- STATE ---------- */

let currentDate = new Date();
let selectedDate = null;
const tasks = {};

/* ---------- MONTH/YEAR SETUP ---------- */

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");

// Populate month dropdown
monthNames.forEach((m,i)=>{
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = m;
  monthSelect.appendChild(opt);
});

// Populate year dropdown (2000–2035)
for(let y=2000; y<=2035; y++){
  const opt = document.createElement("option");
  opt.value = y;
  opt.textContent = y;
  yearSelect.appendChild(opt);
}

/* ---------- NAVIGATION ---------- */
function prevYear(){
  currentDate.setFullYear(currentDate.getFullYear() - 1);
  renderCalendar();
}

function nextYear(){
  currentDate.setFullYear(currentDate.getFullYear() + 1);
  renderCalendar();
}

function prev(){
    currentDate.setMonth(currentDate.getMonth()-1);
    renderCalendar();
}

function next(){
    currentDate.setMonth(currentDate.getMonth()+1);
  renderCalendar();
}

function changeMonth(){
  currentDate.setMonth(parseInt(monthSelect.value));
  renderCalendar();
}

function changeYear(){
  currentDate.setFullYear(parseInt(yearSelect.value));
  renderCalendar();
}

/* ---------- CALENDAR ---------- */

function renderCalendar(){

  const daysContainer = document.getElementById("days");
  daysContainer.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Sync dropdowns
  monthSelect.value = month;
  yearSelect.value = year;

  const titleEl = document.getElementById("title");
  if (titleEl) {
    titleEl.textContent = `${monthNames[month]} ${year}`;
}
    renderMonth(year,month);
}

function renderMonth(year,month){

  const firstDay = new Date(year,month,1).getDay();
  const totalDays = new Date(year,month+1,0).getDate();

  for(let i=0;i<firstDay;i++){
    document.getElementById("days").appendChild(document.createElement("div"));
  }

  for(let d=1; d<=totalDays; d++){
    const dateStr = formatDate(year,month,d);
    createDayCell(d,dateStr);
  }
}

function createDayCell(dayNum,dateStr){

  const cell = document.createElement("div");
  cell.className = "day";
  cell.innerHTML = `<strong>${dayNum}</strong>`;

  if(tasks[dateStr]) {
    cell.innerHTML += `<br>${tasks[dateStr].length} task(s)`;
  }

  cell.onclick = () => selectDate(dateStr);

  document.getElementById("days").appendChild(cell);
}

/* ---------- TASKS ---------- */

function selectDate(dateStr){
  selectedDate = dateStr;
  document.getElementById("selectedDateTitle").textContent = "Tasks for " + dateStr;
  renderTasks();
}

function addTask(){

  if(!selectedDate){
    alert("Select a day first");
    return;
  }

  const text = document.getElementById("taskInput").value;
  const color = document.getElementById("colorPicker").value;

  if(!text) return;

  if(!tasks[selectedDate]) tasks[selectedDate] = [];

  tasks[selectedDate].push({ text, color, done:false });

  document.getElementById("taskInput").value = "";
  renderTasks();
  renderCalendar();
}

function renderTasks(){

  const list = document.getElementById("taskList");
  list.innerHTML = "";

  if(!tasks[selectedDate]) return;

  tasks[selectedDate].forEach((t,i)=>{

    const div = document.createElement("div");
    div.className = "task";
    div.style.background = t.color;

    if(t.done) div.classList.add("completed");

    div.innerHTML = `
      <span onclick="toggleTask(${i})">${t.text}</span>
      <button onclick="deleteTask(${i})">🗑️</button>
    `;

    list.appendChild(div);
  });
}

function toggleTask(i){
  tasks[selectedDate][i].done = !tasks[selectedDate][i].done;
  renderTasks();
}

function deleteTask(i){
  tasks[selectedDate].splice(i,1);
  renderTasks();
  renderCalendar();
}


/* ---------- UTIL ---------- */

function formatDate(y,m,d){
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

/* ---------- INIT ---------- */

renderCalendar();