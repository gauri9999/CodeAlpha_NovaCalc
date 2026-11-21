
/* =====================================================
   NOVACALC PRO - COMPLETE UPDATED SCRIPT
===================================================== */


/* ================= ELEMENTS ================= */

const $ = (id) => document.getElementById(id);

const expressionEl = $("expression");
const resultEl = $("result");

const sciExpressionEl = $("sciExpression");
const sciResultEl = $("sciResult");

const historyList = $("historyList");
const toast = $("toast");


/* ================= APP STATE ================= */

let expression = "";
let sciExpression = "";

let extraMode = "gst";
let soundEnabled = true;
let darkMode = false;

let history = [];

try {
    const saved = JSON.parse(
        localStorage.getItem("novaHistory") || "[]"
    );

    history = Array.isArray(saved) ? saved : [];

} catch {
    history = [];
}

const operators = ["+", "−", "×", "÷"];


/* ================= TOAST ================= */

function showToast(message) {

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);

}


/* ================= SOUND EFFECT ================= */

function playSound() {

    if (!soundEnabled) return;

    try {

        const AudioContext =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContext) return;

        const audio = new AudioContext();

        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.type = "sine";
        oscillator.frequency.value = 650;

        gain.gain.setValueAtTime(0.06, audio.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audio.currentTime + 0.07
        );

        oscillator.start();
        oscillator.stop(audio.currentTime + 0.07);

        oscillator.onended = () => audio.close();

    } catch (error) {
        console.log("Sound unavailable");
    }

}


/* ================= NUMBER FORMAT ================= */

function formatNumber(number) {

    if (!Number.isFinite(number)) {
        return "Error";
    }

    return Number(number.toPrecision(12)).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 10
        }
    );

}


/* =====================================================
   SAFE MATHEMATICAL EXPRESSION EVALUATOR
===================================================== */

function tokenize(input) {

    const tokens = [];

    const pattern =
        /\s*([0-9]*\.?[0-9]+|[a-zA-Z]+|[()+\-*/^%])/gy;

    let position = 0;

    while (position < input.length) {

        pattern.lastIndex = position;

        const match = pattern.exec(input);

        if (!match) {
            throw new Error("Invalid expression");
        }

        tokens.push(match[1]);

        position = pattern.lastIndex;

    }

    return tokens;

}


function evaluateExpression(input) {

    if (!input || !input.trim()) {
        throw new Error("Empty expression");
    }

    const normalized = input
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/[−–]/g, "-");

    const tokens = tokenize(normalized);

    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume() {
        return tokens[position++];
    }


    function parseExpression() {

        let value = parseTerm();

        while (peek() === "+" || peek() === "-") {

            const operator = consume();
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;

        }

        return value;

    }


    function parseTerm() {

        let value = parseUnary();

        while (
            peek() === "*" ||
            peek() === "/" ||
            peek() === "%"
        ) {

            const operator = consume();
            const right = parseUnary();

            if (operator === "*") {
                value *= right;
            }

            else if (operator === "/") {

                if (right === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value /= right;

            }

            else {

                if (right === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value %= right;

            }

        }

        return value;

    }


    function parseUnary() {

        if (peek() === "+") {
            consume();
            return parseUnary();
        }

        if (peek() === "-") {
            consume();
            return -parseUnary();
        }

        return parsePower();

    }


    function parsePower() {

        const value = parsePostfix();

        if (peek() === "^") {

            consume();

            const exponent = parseUnary();

            return Math.pow(value, exponent);

        }

        return value;

    }


    function parsePostfix() {

        let value = parsePrimary();

        while (peek() === "%") {

            consume();

            value /= 100;

        }

        return value;

    }


    function parsePrimary() {

        const token = consume();

        if (token === undefined) {
            throw new Error("Incomplete expression");
        }


        if (token === "(") {

            const value = parseExpression();

            if (consume() !== ")") {
                throw new Error("Missing closing bracket");
            }

            return value;

        }


        if (!isNaN(Number(token))) {
            return Number(token);
        }


        if (token.toLowerCase() === "pi") {
            return Math.PI;
        }

        if (token.toLowerCase() === "e") {
            return Math.E;
        }


        const functions = [
            "sin", "cos", "tan",
            "sqrt", "log", "ln", "abs"
        ];

        if (functions.includes(token.toLowerCase())) {

            let argument;

            if (peek() === "(") {

                consume();

                argument = parseExpression();

                if (consume() !== ")") {
                    throw new Error("Missing bracket");
                }

            } else {

                argument = parseUnary();

            }


            switch (token.toLowerCase()) {

                case "sin":
                    return Math.sin(argument * Math.PI / 180);

                case "cos":
                    return Math.cos(argument * Math.PI / 180);

                case "tan":

                    if (
                        Math.abs(
                            Math.cos(argument * Math.PI / 180)
                        ) < 1e-12
                    ) {
                        throw new Error("Undefined tangent");
                    }

                    return Math.tan(argument * Math.PI / 180);

                case "sqrt":

                    if (argument < 0) {
                        throw new Error("Invalid square root");
                    }

                    return Math.sqrt(argument);

                case "log":

                    if (argument <= 0) {
                        throw new Error("Invalid logarithm");
                    }

                    return Math.log10(argument);

                case "ln":

                    if (argument <= 0) {
                        throw new Error("Invalid logarithm");
                    }

                    return Math.log(argument);

                case "abs":
                    return Math.abs(argument);

            }

        }

        throw new Error("Unknown value");

    }


    const answer = parseExpression();

    if (position !== tokens.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(answer)) {
        throw new Error("Invalid result");
    }

    return answer;

}


/* =====================================================
   HISTORY MANAGEMENT
===================================================== */

function saveHistory(type, exp, answer) {

    const item = {

        id: Date.now() + Math.random(),

        type: type,

        expression: exp,

        answer: String(answer),

        date: new Date().toLocaleString()

    };

    history.unshift(item);

    history = history.slice(0, 100);

    try {

        localStorage.setItem(
            "novaHistory",
            JSON.stringify(history)
        );

    } catch {

        showToast("Unable to save history");

    }

    renderHistory();

}


function renderHistory() {

    historyList.replaceChildren();

    if (history.length === 0) {

        const empty = document.createElement("p");

        empty.className = "empty-history";
        empty.textContent = "No calculations yet.";

        historyList.appendChild(empty);

        return;

    }


    history.forEach(item => {

        const row = document.createElement("div");

        row.className = "history-item";

        const info = document.createElement("div");

        info.className = "history-info";

        const exp = document.createElement("span");

        exp.textContent = item.expression;

        const date = document.createElement("small");

        date.textContent = item.type + " • " + item.date;

        info.append(exp, date);

        const answer = document.createElement("strong");

        answer.textContent = item.answer;

        row.append(info, answer);

        row.addEventListener("click", () => {

            playSound();

            if (item.type === "Basic") {

                expression = item.expression;

                updateBasicDisplay();

                switchTab("basic");

            }

            else if (item.type === "Scientific") {

                sciExpression = item.expression;

                updateScientificDisplay();

                switchTab("scientific");

            }

            showToast("Calculation restored");

        });

        historyList.appendChild(row);

    });

}


/* HISTORY BUTTON */

$("historyToggle").addEventListener("click", () => {

    $("historySection").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

});


/* CLEAR HISTORY */

$("clearHistory").addEventListener("click", () => {

    if (history.length === 0) {
        showToast("History is already empty");
        return;
    }

    if (!confirm("Are you sure you want to clear history?")) {
        return;
    }

    history = [];

    localStorage.removeItem("novaHistory");

    renderHistory();

    showToast("History cleared");

});


/* EXPORT HISTORY */

$("exportHistory").addEventListener("click", () => {

    if (history.length === 0) {
        showToast("No history available");
        return;
    }

    const content = history.map(item => {

        return (
            item.date +
            "\n" +
            item.type +
            ": " +
            item.expression +
            " = " +
            item.answer
        );

    }).join("\n\n");

    const blob = new Blob(
        [content],
        { type: "text/plain" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "NovaCalc-History.txt";

    link.click();

    URL.revokeObjectURL(url);

    showToast("History downloaded");

});


/* =====================================================
   BASIC CALCULATOR
===================================================== */

function updateBasicDisplay() {

    expressionEl.textContent = expression || "0";

    if (!expression) {

        resultEl.textContent = "0";

        return;

    }

    try {

        const answer = evaluateExpression(expression);

        resultEl.textContent = formatNumber(answer);

    } catch {

        resultEl.textContent = "—";

    }

}


function addBasicInput(value) {

    if (operators.includes(value)) {

        const last = expression.slice(-1);

        if (!expression && value !== "−") return;

        if (operators.includes(last)) {

            expression = expression.slice(0, -1);

        }

        expression += value;

    }

    else if (value === ".") {

        const current = expression.split(/[+−×÷%]/).pop();

        if (current.includes(".")) return;

        expression += current === "" ? "0." : ".";

    }

    else if (value === "%") {

        if (/\d$/.test(expression)) {
            expression += "%";
        }

    }

    else {

        expression += value;

    }

    updateBasicDisplay();

}


function calculateBasic() {

    if (!expression) return;

    try {

        const original = expression;

        const answer = evaluateExpression(expression);

        saveHistory(
            "Basic",
            original,
            formatNumber(answer)
        );

        expression = String(
            Number(answer.toPrecision(12))
        );

        updateBasicDisplay();

    } catch (error) {

        showToast(error.message);

    }

}


function clearBasic() {

    expression = "";

    updateBasicDisplay();

}


function deleteBasic() {

    expression = expression.slice(0, -1);

    updateBasicDisplay();

}


function changeSign() {

    if (!expression) return;

    if (expression.startsWith("−")) {

        expression = expression.slice(1);

    } else {

        expression = "−" + expression;

    }

    updateBasicDisplay();

}


/* BASIC BUTTON EVENTS */

document.querySelectorAll("#basic .key").forEach(button => {

    button.addEventListener("click", () => {

        playSound();

        const value = button.dataset.value;
        const action = button.dataset.action;

        if (action === "clear") {

            clearBasic();

        }

        else if (action === "delete") {

            deleteBasic();

        }

        else if (action === "sign") {

            changeSign();

        }

        else if (action === "equals") {

            calculateBasic();

        }

        else if (value !== undefined) {

            addBasicInput(value);

        }

    });

});


/* COPY RESULT */

$("copyResult").addEventListener("click", async () => {

    if (!expression) {
        showToast("No result to copy");
        return;
    }

    try {

        const answer = evaluateExpression(expression);

        await navigator.clipboard.writeText(String(answer));

        showToast("Result copied!");

    } catch {

        showToast("Unable to copy result");

    }

});


/* =====================================================
   SCIENTIFIC CALCULATOR
===================================================== */

function updateScientificDisplay() {

    sciExpressionEl.textContent = sciExpression || "0";

    if (!sciExpression) {

        sciResultEl.textContent = "0";

        return;

    }

    try {

        const answer = evaluateExpression(sciExpression);

        sciResultEl.textContent = formatNumber(answer);

    } catch {

        sciResultEl.textContent = "—";

    }

}


function addScientificInput(value) {

    sciExpression += value;

    updateScientificDisplay();

}


function calculateScientific() {

    if (!sciExpression) return;

    try {

        const original = sciExpression;

        const answer = evaluateExpression(sciExpression);

        saveHistory(
            "Scientific",
            original,
            formatNumber(answer)
        );

        sciExpression = String(
            Number(answer.toPrecision(12))
        );

        updateScientificDisplay();

    } catch (error) {

        showToast(error.message);

    }

}


/* SCIENTIFIC BUTTONS */

document.querySelectorAll("[data-sci]").forEach(button => {

    button.addEventListener("click", () => {

        playSound();

        addScientificInput(button.dataset.sci);

    });

});


$("sciEquals").addEventListener("click", () => {

    playSound();

    calculateScientific();

});


$("sciClear").addEventListener("click", () => {

    sciExpression = "";

    updateScientificDisplay();

    playSound();

});


/* =====================================================
   NAVIGATION
===================================================== */

function switchTab(tabName) {

    document.querySelectorAll(".tab").forEach(tab => {

        tab.classList.toggle(
            "active",
            tab.dataset.tab === tabName
        );

    });

    document.querySelectorAll(".tool-panel").forEach(panel => {

        panel.classList.toggle(
            "active",
            panel.id === tabName
        );

    });

}


document.querySelectorAll(".tab").forEach(tab => {

    tab.addEventListener("click", () => {

        playSound();

        switchTab(tab.dataset.tab);

    });

});


/* =====================================================
   GST AND DISCOUNT CALCULATOR
===================================================== */

document.querySelectorAll(".sub-tab").forEach(button => {

    button.addEventListener("click", () => {

        playSound();

        extraMode = button.dataset.mode;

        document.querySelectorAll(".sub-tab").forEach(tab => {

            tab.classList.toggle(
                "active",
                tab === button
            );

        });

        $("rateLabel").textContent =
            extraMode === "gst"
                ? "GST Rate (%)"
                : "Discount Rate (%)";

        const rate = $("rate");

        rate.replaceChildren();

        const values = extraMode === "gst"
            ? [5, 12, 18, 28]
            : [5, 10, 15, 20, 25, 30, 40, 50, 60, 70];

        values.forEach(value => {

            const option = document.createElement("option");

            option.value = value;
            option.textContent = value + "%";

            if (value === (extraMode === "gst" ? 18 : 10)) {
                option.selected = true;
            }

            rate.appendChild(option);

        });

        $("extraOutput").textContent =
            "Enter an amount to see your calculation.";

    });

});


$("calculateExtra").addEventListener("click", () => {

    playSound();

    const amount = Number($("amount").value);
    const rate = Number($("rate").value);

    const output = $("extraOutput");

    if (
        $("amount").value.trim() === "" ||
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        showToast("Please enter a valid amount");

        return;

    }

    const percentage = amount * rate / 100;

    const rows = [];

    if (extraMode === "gst") {

        rows.push(
            ["Original Amount", amount],
            ["GST (" + rate + "%)", percentage],
            ["Total Amount", amount + percentage]
        );

    } else {

        rows.push(
            ["Original Price", amount],
            ["Discount (" + rate + "%)", percentage],
            ["You Save", percentage],
            ["Final Price", amount - percentage]
        );

    }

    output.replaceChildren();

    rows.forEach(([label, value]) => {

        const row = document.createElement("div");

        row.className = "output-row";

        const name = document.createElement("span");
        name.textContent = label;

        const result = document.createElement("strong");
        result.textContent = "₹" + formatNumber(value);

        row.append(name, result);

        output.appendChild(row);

    });

});


/* =====================================================
   UNIT CONVERTER
===================================================== */

const unitDefinitions = {

    length: {

        km: { name: "Kilometer", factor: 1000 },
        m: { name: "Meter", factor: 1 },
        cm: { name: "Centimeter", factor: 0.01 },
        mm: { name: "Millimeter", factor: 0.001 },
        mile: { name: "Mile", factor: 1609.344 },
        foot: { name: "Foot", factor: 0.3048 }

    },

    weight: {

        kg: { name: "Kilogram", factor: 1 },
        g: { name: "Gram", factor: 0.001 },
        mg: { name: "Milligram", factor: 0.000001 },
        lb: { name: "Pound", factor: 0.45359237 },
        oz: { name: "Ounce", factor: 0.028349523125 }

    },

    temperature: {

        c: { name: "Celsius" },
        f: { name: "Fahrenheit" },
        k: { name: "Kelvin" }

    }

};


function populateUnits() {

    const type = $("unitType").value;

    const from = $("fromUnit");
    const to = $("toUnit");

    from.replaceChildren();
    to.replaceChildren();

    const units = unitDefinitions[type];

    Object.entries(units).forEach(([key, unit]) => {

        const option1 = document.createElement("option");
        const option2 = document.createElement("option");

        option1.value = key;
        option2.value = key;

        option1.textContent = unit.name;
        option2.textContent = unit.name;

        from.appendChild(option1);
        to.appendChild(option2);

    });

    to.selectedIndex = Object.keys(units).length > 1 ? 1 : 0;

    convertUnits();

}


function convertTemperature(value, from, to) {

    let celsius;

    if (from === "c") {

        celsius = value;

    }

    else if (from === "f") {

        celsius = (value - 32) * 5 / 9;

    }

    else {

        celsius = value - 273.15;

    }

    if (to === "c") return celsius;

    if (to === "f") return celsius * 9 / 5 + 32;

    return celsius + 273.15;

}


function convertUnits() {

    const type = $("unitType").value;

    const rawValue = $("unitValue").value;

    const value = Number(rawValue);

    const from = $("fromUnit").value;
    const to = $("toUnit").value;

    const result = $("conversionResult");

    if (rawValue.trim() === "" || !Number.isFinite(value)) {

        result.textContent = "Enter a value";

        return;

    }

    let answer;

    if (type === "temperature") {

        answer = convertTemperature(value, from, to);

    } else {

        const fromFactor = unitDefinitions[type][from].factor;
        const toFactor = unitDefinitions[type][to].factor;

        answer = value * fromFactor / toFactor;

    }

    result.textContent = formatNumber(answer);

}


$("unitType").addEventListener("change", () => {

    playSound();

    populateUnits();

});


$("convertButton").addEventListener("click", () => {

    playSound();

    convertUnits();

    showToast("Conversion completed");

});


$("unitValue").addEventListener("input", convertUnits);

$("fromUnit").addEventListener("change", convertUnits);

$("toUnit").addEventListener("change", convertUnits);


/* =====================================================
   COLOR THEMES
===================================================== */

function applyTheme(theme) {

    const validThemes = [
        "lavender",
        "pink",
        "blue",
        "mint"
    ];

    if (!validThemes.includes(theme)) {
        theme = "lavender";
    }

    document.body.dataset.theme = theme;

    $("themeSelect").value = theme;

    localStorage.setItem("novaTheme", theme);

}


$("themeSelect").addEventListener("change", () => {

    playSound();

    applyTheme($("themeSelect").value);

    showToast("Theme changed!");

});


/* =====================================================
   DARK MODE
===================================================== */

$("darkToggle").addEventListener("click", event => {

    playSound();

    darkMode = !darkMode;

    document.body.classList.toggle("dark", darkMode);

    event.currentTarget.textContent =
        darkMode ? "☀" : "☾";

    localStorage.setItem(
        "novaDarkMode",
        String(darkMode)
    );

});


/* =====================================================
   SOUND SETTINGS
===================================================== */

$("soundToggle").addEventListener("click", event => {

    soundEnabled = !soundEnabled;

    event.currentTarget.textContent =
        soundEnabled ? "🔊" : "🔇";

    localStorage.setItem(
        "novaSound",
        String(soundEnabled)
    );

    if (soundEnabled) {

        playSound();

        showToast("Sound enabled");

    } else {

        showToast("Sound disabled");

    }

});


/* =====================================================
   KEYBOARD SUPPORT
===================================================== */

document.addEventListener("keydown", event => {

    if (
        event.target.matches("input, select, textarea") ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
    ) {
        return;
    }

    const activePanel = document.querySelector(
        ".tool-panel.active"
    );

    if (!activePanel || activePanel.id !== "basic") {
        return;
    }

    const key = event.key;

    if (/^[0-9]$/.test(key)) {

        addBasicInput(key);

    }

    else if (key === ".") {

        addBasicInput(".");

    }

    else if (key === "+") {

        addBasicInput("+");

    }

    else if (key === "-") {

        addBasicInput("−");

    }

    else if (key === "*") {

        addBasicInput("×");

    }

    else if (key === "/") {

        event.preventDefault();

        addBasicInput("÷");

    }

    else if (key === "%") {

        addBasicInput("%");

    }

    else if (key === "Enter" || key === "=") {

        event.preventDefault();

        calculateBasic();

    }

    else if (key === "Backspace") {

        deleteBasic();

    }

    else if (key === "Escape") {

        clearBasic();

    }

});


/* =====================================================
   INITIALIZE APPLICATION
===================================================== */

function initializeApp() {

    // Load theme
    const savedTheme =
        localStorage.getItem("novaTheme") || "lavender";

    applyTheme(savedTheme);


    // Load dark mode
    darkMode =
        localStorage.getItem("novaDarkMode") === "true";

    document.body.classList.toggle("dark", darkMode);

    $("darkToggle").textContent =
        darkMode ? "☀" : "☾";


    // Load sound preference
    soundEnabled =
        localStorage.getItem("novaSound") !== "false";

    $("soundToggle").textContent =
        soundEnabled ? "🔊" : "🔇";


    // Initialize calculators
    updateBasicDisplay();

    updateScientificDisplay();

    renderHistory();

    populateUnits();

    console.log("NovaCalc Pro initialized successfully!");

}


// START APP
initializeApp();
