/* ---------- STATE ---------- */

let currentDate = new Date();
let selectedDate = null;
const tasks = {};
let activePanel = "tasks";

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

  if(tasks[dateStr] && tasks[dateStr].length > 0) {
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

function addTask() {
  if (!selectedDate) {
    alert("Select a day first");
    return;
  }

  const text = document.getElementById("taskInput").value.trim();
  const color = document.getElementById("colorPicker").value;
  const reminderTime = document.getElementById("reminderTime").value;

  if (!text) return;

  if (!tasks[selectedDate]) tasks[selectedDate] = [];

  tasks[selectedDate].push({
    text,
    color,
    done: false,
    reminderTime: reminderTime,
    reminded: false
  });

  document.getElementById("taskInput").value = "";
  document.getElementById("reminderTime").value = "";

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
      <label>
        <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTask(${i})">
        <span class="${t.done ? 'completed-text' : ''}">${t.text}</span>
      </label>
    ${t.reminderTime ? `<div style="font-size:12px; margin-top:4px;">Reminder: ${t.reminderTime}</div>` : ""}
    <button onclick="deleteTask(${i})">🗑️</button>
`;

    list.appendChild(div);
  });
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function checkReminders() {
  const now = new Date();

  const currentDateStr =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");

  if (!tasks[currentDateStr]) return;

  tasks[currentDateStr].forEach(task => {
    if (!task.done && !task.reminded && task.reminderTime) {

      const [h, m] = task.reminderTime.split(":").map(Number);

      const reminderDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        h,
        m
      );

      // ✅ trigger if current time is AFTER reminder time
      if (now >= reminderDate) {
        task.reminded = true;

        console.log("REMINDER TRIGGERED:", task.text);

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Task Reminder", {
            body: task.text
          });
        } else {
          alert("Reminder: " + task.text);
        }
      }
    }
  });
}

function toggleTask(i){
  tasks[selectedDate][i].done = !tasks[selectedDate][i].done;
  renderTasks();
  renderCalendar();
}

function deleteTask(i){
  tasks[selectedDate].splice(i,1);
  renderTasks();
  renderCalendar();
}

function showTasks() {
  activePanel = "tasks";
  document.getElementById("taskPanel").style.display = "block";
  document.getElementById("weatherPanel").style.display = "none";
}

function showReminders() {
  showTasks(); // for now, keep reminder using the task sidebar
}

function showWeather() {
  activePanel = "weather";
  document.getElementById("taskPanel").style.display = "none";
  document.getElementById("weatherPanel").style.display = "block";
  loadWeather();
}

async function loadWeather() {
  const weatherStatus = document.getElementById("weatherStatus");
  const weatherList = document.getElementById("weatherList");

  weatherStatus.textContent = "Loading weather...";
  weatherList.innerHTML = "";

  if (!navigator.geolocation) {
    weatherStatus.textContent = "Geolocation is not supported in this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
        );

        const data = await response.json();
        renderWeather(data.daily);
        weatherStatus.textContent = "Forecast for the next 7 days:";
      } catch (error) {
        weatherStatus.textContent = "Could not load weather data.";
      }
    },
    () => {
      weatherStatus.textContent = "Location permission denied.";
    }
  );
}

function renderWeather(daily) {
  const weatherList = document.getElementById("weatherList");
  weatherList.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const dayCard = document.createElement("div");
    dayCard.className = "weather-card";

    const code = daily.weather_code[i];
    const description = getWeatherDescription(code);

    dayCard.innerHTML = `
      <div class="weather-day">${daily.time[i]}</div>
      <div>${description}</div>
      <div class="weather-desc">
        High: ${daily.temperature_2m_max[i]}°C<br>
        Low: ${daily.temperature_2m_min[i]}°C
      </div>
    `;

    weatherList.appendChild(dayCard);
  }
}

function getWeatherDescription(code) {
  const weatherMap = {
    0: "Sunny / Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm"
  };

  return weatherMap[code] || "Unknown";
}

/* ---------- Theme ---------- */

function toggleTheme() {
  const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";

  if (currentTheme === "light") {
    document.body.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

/* ---------- Log in/Sign up ---------- */

function renderAuthUI() {
  const authArea = document.getElementById("authArea");
  const user = JSON.parse(localStorage.getItem("currentCustomer"));

  if (user && user.username) {
    // Logged in view
    authArea.innerHTML = `
      <div class="customer-info">
        <strong>${user.username}</strong><br>
        <button onclick="logout()">Logout</button>
      </div>
    `;
  } else {
    // Not logged in view
    authArea.innerHTML = `
      <button class="signin-up-btn"><a href="login.html">Sign In</a></button>
      <button class="signin-up-btn"><a href="register.html">Register</a></button>
    `;
  }
}

function logout() {
  localStorage.removeItem("currentCustomer");
  location.reload();
}


/* ---------- UTIL ---------- */

function formatDate(y,m,d){
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
}

/* ---------- INIT ---------- */

loadTheme();
renderAuthUI();
renderCalendar();
showTasks();
requestNotificationPermission();
setInterval(checkReminders, 5000);
