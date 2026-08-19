declare const Chart: any;

interface FinancialItem {
  amount: number;
  reason: string;
}

interface Employee {
  id: number;
  name: string;
  idNumber: string;
  salary: number;
  jobTitle: string;
  bankAccountNumber: string;
  statusDescription: string;
  deductions: FinancialItem[];
  incentives: FinancialItem[];
  allowances: FinancialItem[];
  birthDate: string;   // ISO date string, e.g. "1966-02-10"
  hireDate: string;    // ISO date string, e.g. "2026-06-01"
}

const searchInput = document.getElementById("search-bar") as HTMLInputElement | null;
const searchButton = document.querySelector<HTMLButtonElement>(".parent-search-bar button");
const showOutput = document.querySelector<HTMLDivElement>(".dataSearchCard");
const outputContainer = document.querySelector<HTMLDivElement>(".showOutputFromSearchBar");

const deductionsCard = document.querySelector<HTMLDivElement>(".showDeductionsAmount");
const incentivesCard = document.querySelector<HTMLDivElement>(".showIncentivesAmount");
const allowancesCard = document.querySelector<HTMLDivElement>(".showAllowancesAmount");
const retirementNewCard = document.querySelector<HTMLDivElement>(".showRetirementAndNewEmployee");
const totalsChartCanvas = document.getElementById("totalsChart") as HTMLCanvasElement | null;

let totalsChart: any = null;

const RETIREMENT_AGE = 60;     
const NEW_EMPLOYEE_DAYS = 90;  

function calcAge(birthDateISO: string, today: Date): number {
  const birth = new Date(birthDateISO);
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

function daysSince(dateISO: string, today: Date): number {
  const then = new Date(dateISO);
  const diffMs = today.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

let items: Employee[] = [];

fetch('JSON/employees.json')
  .then((response: Response) => {
    if (!response.ok) {
      throw new Error(`Error In Get Data : ${response.status}`);
    }
    return response.json();
  })
  .then((data: Employee[]) => {
    items = data;
    renderDashboard(items);
  })
  .catch((error: Error) => console.error('Error In Get Data From Json File:', error));

function runSearch(): void {
  const searchTerm = (searchInput?.value ?? '').toLowerCase().trim();

  if (searchTerm === '') {
    if (outputContainer) outputContainer.style.display = 'none';
    if (showOutput) showOutput.innerHTML = '';
    return;
  }

  const filteredItems = items.filter((item: Employee) =>
    item.name.toLowerCase().includes(searchTerm) ||
    item.idNumber.toLowerCase().includes(searchTerm)
  );

  displayResults(filteredItems);
}

searchInput?.addEventListener('input', runSearch);

searchButton?.addEventListener('click', (e: Event) => {
  e.preventDefault(); 
  runSearch();
});

searchInput?.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    runSearch();
  }
});

function displayResults(results: Employee[]): void {
  if (!showOutput || !outputContainer) return;

  outputContainer.style.display = 'block';
  showOutput.innerHTML = '';

  if (results.length === 0) {
    const noResultsSpan = document.createElement('span');
    noResultsSpan.textContent = 'Nothing Output';
    showOutput.appendChild(noResultsSpan);
    return;
  }

  results.forEach((emp: Employee) => {
    const formatFinancials = (arr: FinancialItem[]): string => {
      if (arr.length === 0) return 'Nothing';
      return arr.map(item => `${item.amount} EG (${item.reason})`).join(', ');
    };

    const details: string[] = [
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

    details.forEach((text: string) => {
      const span = document.createElement('span');
      span.textContent = text;
      showOutput.appendChild(span);
    });
  });
}

function renderDashboard(employees: Employee[]): void {
  const today = new Date();

  fillFinancialCard(deductionsCard, employees, (emp) => emp.deductions, 'No deductions recorded.');
  fillFinancialCard(incentivesCard, employees, (emp) => emp.incentives, 'No incentives recorded.');
  fillFinancialCard(allowancesCard, employees, (emp) => emp.allowances, 'No allowances recorded.');

  const retiring = employees.filter((emp) => calcAge(emp.birthDate, today) >= RETIREMENT_AGE);
  const newHires = employees.filter((emp) => daysSince(emp.hireDate, today) <= NEW_EMPLOYEE_DAYS);
  fillRetirementAndNewCard(retirementNewCard, retiring, newHires, today);

  renderTotalsChart(employees);
}

function renderTotalsChart(employees: Employee[]): void {
  if (!totalsChartCanvas || typeof Chart === 'undefined') return;

  const sumAll = (getItemsFn: (emp: Employee) => FinancialItem[]): number =>
    employees.reduce(
      (total, emp) => total + getItemsFn(emp).reduce((s, item) => s + item.amount, 0),
      0
    );

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
            label: (ctx: any) => ` ${ctx.parsed.y.toLocaleString()} EG`,
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

function fillFinancialCard(
  card: HTMLDivElement | null,
  employees: Employee[],
  getItemsFn: (emp: Employee) => FinancialItem[],
  emptyMessage: string
): void {
  if (!card) return;

  const heading = card.querySelector('h1');
  card.innerHTML = '';
  if (heading) card.appendChild(heading);

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

function fillRetirementAndNewCard(
  card: HTMLDivElement | null,
  retiring: Employee[],
  newHires: Employee[],
  today: Date
): void {
  if (!card) return;

  const heading = card.querySelector('h1');
  card.innerHTML = '';
  if (heading) card.appendChild(heading);

  const retirementLabel = document.createElement('span');
  retirementLabel.textContent = `Nearing Retirement (${retiring.length})`;
  retirementLabel.classList.add('sectionLabel');
  card.appendChild(retirementLabel);

  if (retiring.length === 0) {
    const span = document.createElement('span');
    span.textContent = 'No employees nearing retirement.';
    card.appendChild(span);
  } else {
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
  } else {
    newHires.forEach((emp) => {
      const days = daysSince(emp.hireDate, today);
      const span = document.createElement('span');
      span.textContent = `${emp.name} — Hired ${days} day(s) ago`;
      card.appendChild(span);
    });
  }
}