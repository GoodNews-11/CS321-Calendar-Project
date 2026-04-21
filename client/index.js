/* ---------- STATE ---------- */

let currentDate = new Date();
let selectedDate = null;
let tasks = {};
let activePanel = "tasks";

/* ---------- MONTH/YEAR SETUP ---------- */

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");

monthNames.forEach((m, i) => {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = m;
  monthSelect.appendChild(opt);
});

for (let y = 2000; y <= 2050; y++) {
  const opt = document.createElement("option");
  opt.value = y;
  opt.textContent = y;
  yearSelect.appendChild(opt);
}

/* ---------- API HELPERS ---------- */

function getToken() {
  return localStorage.getItem("token");
}

function getAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

/* ---------- NAVIGATION ---------- */

async function prevYear() {
  currentDate.setFullYear(currentDate.getFullYear() - 1);
  await renderCalendar();
}

async function nextYear() {
  currentDate.setFullYear(currentDate.getFullYear() + 1);
  await renderCalendar();
}

async function prev() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  await renderCalendar();
}

async function next() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  await renderCalendar();
}

async function changeMonth() {
  currentDate.setMonth(parseInt(monthSelect.value, 10));
  await renderCalendar();
}

async function changeYear() {
  currentDate.setFullYear(parseInt(yearSelect.value, 10));
  await renderCalendar();
}

/* ---------- DATABASE TASK LOADING ---------- */

async function loadTasksForCurrentMonth() {
  const token = getToken();

  if (!token) {
    tasks = {};
    return;
  }

  try {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const response = await fetch(
      `http://localhost:5000/api/events?month=${month}&year=${year}`,
      {
        method: "GET",
        headers: getAuthHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to load tasks:", data.message || data);
      tasks = {};
      return;
    }

    const groupedTasks = {};

    (data.events || []).forEach((event) => {
      const dateStr = new Date(event.startTime).toISOString().split("T")[0];

      if (!groupedTasks[dateStr]) {
        groupedTasks[dateStr] = [];
      }

      groupedTasks[dateStr].push({
        _id: event._id,
        text: event.title,
        color: event.color || "#4a90e2",
        done: !!event.isCompleted,
        startTime: event.startTime,
        endTime: event.endTime
      });
    });

    tasks = groupedTasks;
  } catch (error) {
    console.error("Error loading tasks from database:", error);
    tasks = {};
  }
}

/* ---------- CALENDAR ---------- */

async function renderCalendar() {
  const daysContainer = document.getElementById("days");
  daysContainer.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthSelect.value = month;
  yearSelect.value = year;

  const titleEl = document.getElementById("title");
  if (titleEl) {
    titleEl.textContent = `${monthNames[month]} ${year}`;
  }

  await loadTasksForCurrentMonth();
  renderMonth(year, month);

  if (selectedDate) {
    renderTasks();
  }
}

function renderMonth(year, month) {
  const daysEl = document.getElementById("days");
  daysEl.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    daysEl.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = formatDate(year, month, d);
    createDayCell(d, dateStr);
  }
}

function createDayCell(dayNum, dateStr) {
  const cell = document.createElement("div");
  cell.className = "day";
  cell.innerHTML = `<strong>${dayNum}</strong>`;

  if (tasks[dateStr] && tasks[dateStr].length > 0) {
    cell.innerHTML += `<br>${tasks[dateStr].length} task(s)`;
  }

  cell.onclick = () => selectDate(dateStr);
  document.getElementById("days").appendChild(cell);
}

/* ---------- TASKS ---------- */

function selectDate(dateStr) {
  selectedDate = dateStr;
  document.getElementById("selectedDateTitle").textContent = "Tasks for " + dateStr;
  document.getElementById("startTime").value = `${dateStr}T09:00`;
  document.getElementById("endTime").value   = `${dateStr}T10:00`;
  document.getElementById("allDayCheck").checked = false;
  toggleAllDay();
  renderTasks();
}

async function addTask() {
  if (!selectedDate) {
    alert("Select a day first");
    return;
  }

  const token = getToken();
  if (!token) {
    alert("Please log in first.");
    return;
  }

  const text = document.getElementById("taskInput").value.trim();
  const color = document.getElementById("colorPicker").value;
  const allDay = document.getElementById("allDayCheck").checked;

  if (!text) return;

  let startTime, endTime;
  if (allDay) {
    startTime = `${selectedDate}T00:00:00`;
    endTime   = `${selectedDate}T23:59:59`;
  } else {
      const startVal = document.getElementById("startTime").value;
      const endVal   = document.getElementById("endTime").value;
      if (!startVal || !endVal) {
        alert("Please set both a start and end time");
        return;
      }
      startTime = startVal;
      endTime   = endVal;
  }

  if (new Date(endTime) <= new Date(startTime)) {
    alert("End time must be after start time");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/events", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: text,
        startTime,
        endTime,
        color
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Could not save task.");
      return;
    }

    document.getElementById("taskInput").value = "";
    await loadTasksForCurrentMonth();
    renderCalendarWithoutReload();
    renderTasks();
  } catch (error) {
    console.error("Add task error:", error);
    alert("Could not connect to backend.");
  }
}

function renderTasks() {
  const list = document.getElementById("taskList");
  list.innerHTML = "";

  if (!selectedDate || !tasks[selectedDate] || tasks[selectedDate].length === 0) {
    return;
  }

  tasks[selectedDate].forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "task";
    div.style.background = t.color;

    if (t.done) div.classList.add("completed");
    const timeLabel = formatTimeRange(t.startTime, t.endTime);
    div.innerHTML = `
      <label>
        <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTask(${i})">
        <span class="${t.done ? "completed-text" : ""}">${t.text}</span>
        <span class="task-time">${timeLabel}</span>
      </label>
      <button onclick="deleteTask(${i})">🗑️</button>
    `;

    list.appendChild(div);
  });
}

async function toggleTask(i) {
  const task = tasks[selectedDate]?.[i];

  if (!task || !task._id) return;

  try {
    const response = await fetch(
      `http://localhost:5000/api/events/${task._id}/complete`,
      {
        method: "PATCH",
        headers: getAuthHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Could not update task.");
      return;
    }

    await loadTasksForCurrentMonth();
    renderCalendarWithoutReload();
    renderTasks();
  } catch (error) {
    console.error("Toggle task error:", error);
    alert("Could not connect to backend.");
  }
}

async function deleteTask(i) {
  const task = tasks[selectedDate]?.[i];

  if (!task || !task._id) return;

  try {
    const response = await fetch(
      `http://localhost:5000/api/events/${task._id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (_) {}
      alert(data.message || "Could not delete task.");
      return;
    }

    await loadTasksForCurrentMonth();
    renderCalendarWithoutReload();
    renderTasks();
  } catch (error) {
    console.error("Delete task error:", error);
    alert("Could not connect to backend.");
  }
}

function renderCalendarWithoutReload() {
  const daysContainer = document.getElementById("days");
  daysContainer.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthSelect.value = month;
  yearSelect.value = year;

  const titleEl = document.getElementById("title");
  if (titleEl) {
    titleEl.textContent = `${monthNames[month]} ${year}`;
  }

  renderMonth(year, month);
}

function showTasks() {
  activePanel = "tasks";
  document.getElementById("taskPanel").style.display = "block";
  document.getElementById("weatherPanel").style.display = "none";
}

/* ---------- Weather ---------- */

function showWeather() {
  activePanel = "weather";
  document.getElementById("taskPanel").style.display = "none";
  document.getElementById("weatherPanel").style.display = "block";
  loadWeather();
}

const lastCity = localStorage.getItem("lastCity");
if (lastCity) {
  document.getElementById("cityInput").value = lastCity;
  loadWeather(lastCity);
}

function searchWeather() {
  const cityInput = document.getElementById("cityInput");
  const city = cityInput.value.trim();

  if (!city) {
    document.getElementById("weatherStatus").textContent = "Please enter a city name.";
    return;
  }

  localStorage.setItem("lastCity", city);
  loadWeather(city);
}

async function loadWeather(city) {
  const weatherStatus = document.getElementById("weatherStatus");
  const weatherList = document.getElementById("weatherList");
  const token = localStorage.getItem("token");

  weatherStatus.textContent = "Loading weather...";
  weatherList.innerHTML = "";

  if (!token) {
    weatherStatus.textContent = "Please log in first.";
    return;
  }

  try {
    let url;
    if (city) {
      url = `http://localhost:5000/api/weather/forecast?city=${encodeURIComponent(city)}`;
    } else {
      const coords = await getBrowserCoords();
      if (coords) {
        url = `http://localhost:5000/api/weather/forecast?lat=${coords.lat}&lon=${coords.lon}`;
      } else {
        url = `http://localhost:5000/api/weather/forecast`;
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await response.json();
    console.log("WEATHER RESPONSE:", data);

    if (!response.ok) {
      weatherStatus.textContent = data.message || "Could not load weather.";
      return;
    }

    const locLabel = data.location.city || `${data.location.lat}, ${data.location.lon}`;
    weatherStatus.textContent = `Forecast for ${locLabel}`;
    renderWeather(data.forecast);
  } catch (error) {
    console.error("WEATHER ERROR:", error);
    weatherStatus.textContent = "Could not connect to backend.";
  }
}

function getBrowserCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        console.warn("Geolocation denied or unavailable:", error.message);
        resolve(null);
      },
      { timeout: 5000 }
    );
  });
}

function renderWeather(forecast) {
  const weatherList = document.getElementById("weatherList");
  weatherList.innerHTML = "";

  if (!forecast || forecast.length === 0) {
    weatherList.textContent = "No forecast data available.";
    return;
  }

  forecast.forEach((day) => {
    const date = day.date || day.dt_txt?.split(" ")[0] || "Unknown date";
    const description = day.description || day.weather?.[0]?.description || "Unknown";
    const tempInfo = day.temp !== undefined ? ` — ${day.temp}°F` : "";

    const dayCard = document.createElement("div");
    dayCard.className = "weather-card";

    dayCard.innerHTML = `
      <div class="weather-day">${date}${tempInfo}</div>
      <div class="weather-description">${description}</div>
    `;

    weatherList.appendChild(dayCard);
  });
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

  if (user) {
    authArea.innerHTML = `
      <div class="customer-info">
        <strong>${user.name || user.email || "User"}</strong><br>
        <button onclick="logout()">Logout</button>
      </div>
    `;
  } else {
    authArea.innerHTML = `
      <button class="signin-up-btn"><a href="login.html">Sign In</a></button>
      <button class="signin-up-btn"><a href="register.html">Register</a></button>
    `;
  }
}

function logout() {
  localStorage.removeItem("currentCustomer");
  localStorage.removeItem("token");
  location.reload();
}

/* ---------- UTIL ---------- */

function formatDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
}
function toggleAllDay() {
  const isAllDay = document.getElementById("allDayCheck").checked;
  document.getElementById("startTime").disabled = isAllDay;
  document.getElementById("endTime").disabled   = isAllDay;
}

function formatTimeRange(startIso, endIso) {
  const start = new Date(startIso);
  const end   = new Date(endIso);
  const startIsMidnight = start.getHours() === 0 && start.getMinutes() === 0;
  const endIsLateNight  = end.getHours() === 23 && end.getMinutes() >= 59;
  const sameDay         = start.toDateString() === end.toDateString();

  if (startIsMidnight && endIsLateNight && sameDay) {
    return "All day";
  }

  return `${formatClockTime(start)} – ${formatClockTime(end)}`;
}

function formatClockTime(d) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
/* ---------- INIT ---------- */

async function init() {
  loadTheme();
  renderAuthUI();
  showTasks();
  await renderCalendar();
}

init();
