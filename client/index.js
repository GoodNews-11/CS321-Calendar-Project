/* ---------- STATE ---------- */

let currentDate = new Date();
let selectedDate = null;
const tasks = {};
let activePanel = "tasks";

/* ---------- MONTH/YEAR SETUP ---------- */

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");

// Populate month dropdown
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

/* ---------- NAVIGATION ---------- */
function prevYear() {
  currentDate.setFullYear(currentDate.getFullYear() - 1);
  renderCalendar();
}

function nextYear() {
  currentDate.setFullYear(currentDate.getFullYear() + 1);
  renderCalendar();
}

function prev() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function next() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function changeMonth() {
  currentDate.setMonth(parseInt(monthSelect.value));
  renderCalendar();
}

function changeYear() {
  currentDate.setFullYear(parseInt(yearSelect.value));
  renderCalendar();
}

/* ---------- CALENDAR ---------- */

function renderCalendar() {

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
  renderMonth(year, month);
}

function renderMonth(year, month) {

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    document.getElementById("days").appendChild(document.createElement("div"));
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
  renderTasks();
}

function addTask() {
  if (!selectedDate) {
    alert("Select a day first");
    return;
  }

  const text = document.getElementById("taskInput").value.trim();
  const color = document.getElementById("colorPicker").value;

  if (!text) return;

  if (!tasks[selectedDate]) tasks[selectedDate] = [];

  tasks[selectedDate].push({
    text,
    color,
    done: false,
    reminded: false
  });

  document.getElementById("taskInput").value = "";

  renderTasks();
  renderCalendar();
}

function renderTasks() {

  const list = document.getElementById("taskList");
  list.innerHTML = "";

  if (!tasks[selectedDate]) return;

  tasks[selectedDate].forEach((t, i) => {

    const div = document.createElement("div");
    div.className = "task";
    div.style.background = t.color;

    if (t.done) div.classList.add("completed");

    div.innerHTML = `
      <label>
        <input type="checkbox" ${t.done ? "checked" : ""} onchange="toggleTask(${i})">
        <span class="${t.done ? 'completed-text' : ''}">${t.text}</span>
      </label>
    <button onclick="deleteTask(${i})">🗑️</button>
`;

    list.appendChild(div);
  });
}

function toggleTask(i) {
  tasks[selectedDate][i].done = !tasks[selectedDate][i].done;
  renderTasks();
  renderCalendar();
}

function deleteTask(i) {
  tasks[selectedDate].splice(i, 1);
  renderTasks();
  renderCalendar();
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
// Auto-load the last searched city from localStorage if there is one.
// This way the user doesn't have to re-type their city every time they switch panels.
const lastCity = localStorage.getItem("lastCity");
if (lastCity) {
  document.getElementById("cityInput").value = lastCity;
  loadWeather(lastCity);
}

// Reads the city name from the input, saves it to localStorage, and triggers loadWeather.
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
// updated weather.controller.js geocodes it to lat/lon before fetching.
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
        // User typed a city in the search box
        url = `http://localhost:5000/api/weather/forecast?city=${encodeURIComponent(city)}`;
    } else {
        // No city — try to use the browser's geolocation
        const coords = await getBrowserCoords();
        if (coords) {
          url = `http://localhost:5000/api/weather/forecast?lat=${coords.lat}&lon=${coords.lon}`;
      } else {
          // Fall back to whatever location the user has saved on their profile
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
    const locLabel = data.location.city
      || `${data.location.lat}, ${data.location.lon}`;
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
  forecast.forEach(day => {
    const date =
      day.date ||
      day.dt_txt?.split(" ")[0] ||
      "Unknown date";

    const description =
      day.description ||
      day.weather?.[0]?.description ||
      "Unknown";

    const tempInfo = day.temp !== undefined
      ? ` — ${day.temp}°C`
      : "";

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

/* ---------- INIT ---------- */

loadTheme();
renderAuthUI();
renderCalendar();
showTasks();
