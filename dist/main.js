const searchInput = document.getElementById("search-bar");
const searchButton = document.querySelector(".parent-search-bar button");
const showOutput = document.querySelector(".dataSearchCard");
const outputContainer = document.querySelector(".showOutputFromSearchBar");
const deductionsCard = document.querySelector(".showDeductionsAmount");
const incentivesCard = document.querySelector(".showIncentivesAmount");
const allowancesCard = document.querySelector(".showAllowancesAmount");
const retirementNewCard = document.querySelector(".showRetirementAndNewEmployee");
const totalsChartCanvas = document.getElementById("totalsChart");
let totalsChart = null;
const RETIREMENT_AGE = 60;
const NEW_EMPLOYEE_DAYS = 90;
function calcAge(birthDateISO, today) {
    const birth = new Date(birthDateISO);
    let age = today.getFullYear() - birth.getFullYear();
    const hasHadBirthdayThisYear = today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!hasHadBirthdayThisYear)
        age--;
    return age;
}
function daysSince(dateISO, today) {
    const then = new Date(dateISO);
    const diffMs = today.getTime() - then.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
let items = [];
fetch('JSON/employees.json')
    .then((response) => {
    if (!response.ok) {
        throw new Error(`Error In Get Data : ${response.status}`);
    }
    return response.json();
})
    .then((data) => {
    items = data;
    renderDashboard(items);
})
    .catch((error) => console.error('Error In Get Data From Json File:', error));
function runSearch() {
    const searchTerm = (searchInput?.value ?? '').toLowerCase().trim();
    if (searchTerm === '') {
        if (outputContainer)
            outputContainer.style.display = 'none';
        if (showOutput)
            showOutput.innerHTML = '';
        return;
    }
    const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchTerm) ||
        item.idNumber.toLowerCase().includes(searchTerm));
    displayResults(filteredItems);
}
searchInput?.addEventListener('input', runSearch);
searchButton?.addEventListener('click', (e) => {
    e.preventDefault();
    runSearch();
});
searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        runSearch();
    }
});
function displayResults(results) {
    if (!showOutput || !outputContainer)
        return;
    outputContainer.style.display = 'block';
    showOutput.innerHTML = '';
    if (results.length === 0) {
        const noResultsSpan = document.createElement('span');
        noResultsSpan.textContent = 'Nothing Output';
        showOutput.appendChild(noResultsSpan);
        return;
    }
    results.forEach((emp) => {
        const formatFinancials = (arr) => {
            if (arr.length === 0)
                return 'Nothing';
            return arr.map(item => `${item.amount} EG (${item.reason})`).join(', ');
        };
        const details = [
            `Name: ${emp.name}`,
            `Id Number: ${emp.idNumber}`,
            `Job Title: ${emp.jobTitle}`,
            `Salary: ${emp.salary} EG`,
            `Incentives: ${formatFinancials(emp.incentives)}`,
            `Deductions: ${formatFinancials(emp.deductions)}`,
            `Allowances: ${formatFinancials(emp.allowances)}`,
            `Bank Account : ${emp.bankAccountNumber}`,
            `Status: ${emp.statusDescription}`
        ];
        details.forEach((text) => {
            const span = document.createElement('span');
            span.textContent = text;
            showOutput.appendChild(span);
        });
    });
}
function renderDashboard(employees) {
    const today = new Date();
    fillFinancialCard(deductionsCard, employees, (emp) => emp.deductions, 'No deductions recorded.');
    fillFinancialCard(incentivesCard, employees, (emp) => emp.incentives, 'No incentives recorded.');
    fillFinancialCard(allowancesCard, employees, (emp) => emp.allowances, 'No allowances recorded.');
    const retiring = employees.filter((emp) => calcAge(emp.birthDate, today) >= RETIREMENT_AGE);
    const newHires = employees.filter((emp) => daysSince(emp.hireDate, today) <= NEW_EMPLOYEE_DAYS);
    fillRetirementAndNewCard(retirementNewCard, retiring, newHires, today);
    renderTotalsChart(employees);
}
function renderTotalsChart(employees) {
    if (!totalsChartCanvas || typeof Chart === 'undefined')
        return;
    const sumAll = (getItemsFn) => employees.reduce((total, emp) => total + getItemsFn(emp).reduce((s, item) => s + item.amount, 0), 0);
    const totals = {
        deductions: sumAll((emp) => emp.deductions),
        incentives: sumAll((emp) => emp.incentives),
        allowances: sumAll((emp) => emp.allowances),
    };
    if (totalsChart) {
        totalsChart.destroy();
    }
    const paper = '#f2efe6';
    const lime = '#c5f26e';
    const moss = '#2c4a3e';
    totalsChart = new Chart(totalsChartCanvas, {
        type: 'bar',
        data: {
            labels: ['Deductions', 'Incentives', 'Allowances'],
            datasets: [
                {
                    label: 'Total (EG)',
                    data: [totals.deductions, totals.incentives, totals.allowances],
                    backgroundColor: [
                        'rgba(197, 242, 110, 0.35)',
                        lime,
                        'rgba(197, 242, 110, 0.65)',
                    ],
                    borderColor: lime,
                    borderWidth: 1.5,
                    borderRadius: 8,
                    maxBarThickness: 90,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: moss,
                    titleColor: paper,
                    bodyColor: paper,
                    borderColor: lime,
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.y.toLocaleString()} EG`,
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: paper, font: { family: 'Cairo', size: 13 } },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: paper, font: { family: 'Cairo', size: 12 } },
                    grid: { color: 'rgba(242, 239, 230, 0.08)' },
                },
            },
        },
    });
}
function fillFinancialCard(card, employees, getItemsFn, emptyMessage) {
    if (!card)
        return;
    const heading = card.querySelector('h1');
    card.innerHTML = '';
    if (heading)
        card.appendChild(heading);
    const employeesWithItems = employees.filter((emp) => getItemsFn(emp).length > 0);
    if (employeesWithItems.length === 0) {
        const emptySpan = document.createElement('span');
        emptySpan.textContent = emptyMessage;
        card.appendChild(emptySpan);
        return;
    }
    employeesWithItems.forEach((emp) => {
        const total = getItemsFn(emp).reduce((sum, item) => sum + item.amount, 0);
        const span = document.createElement('span');
        span.textContent = `${emp.name} — ${total} EG`;
        card.appendChild(span);
    });
}
function fillRetirementAndNewCard(card, retiring, newHires, today) {
    if (!card)
        return;
    const heading = card.querySelector('h1');
    card.innerHTML = '';
    if (heading)
        card.appendChild(heading);
    const retirementLabel = document.createElement('span');
    retirementLabel.textContent = `Nearing Retirement (${retiring.length})`;
    retirementLabel.classList.add('sectionLabel');
    card.appendChild(retirementLabel);
    if (retiring.length === 0) {
        const span = document.createElement('span');
        span.textContent = 'No employees nearing retirement.';
        card.appendChild(span);
    }
    else {
        retiring.forEach((emp) => {
            const age = calcAge(emp.birthDate, today);
            const span = document.createElement('span');
            span.textContent = `${emp.name} — Age ${age}`;
            card.appendChild(span);
        });
    }
    const newHiresLabel = document.createElement('span');
    newHiresLabel.textContent = `New Employees (${newHires.length})`;
    newHiresLabel.classList.add('sectionLabel');
    card.appendChild(newHiresLabel);
    if (newHires.length === 0) {
        const span = document.createElement('span');
        span.textContent = 'No new employees.';
        card.appendChild(span);
    }
    else {
        newHires.forEach((emp) => {
            const days = daysSince(emp.hireDate, today);
            const span = document.createElement('span');
            span.textContent = `${emp.name} — Hired ${days} day(s) ago`;
            card.appendChild(span);
        });
    }
}
export {};
//# sourceMappingURL=main.js.map