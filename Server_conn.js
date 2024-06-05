const http = require('http');
const oracledb = require('oracledb');


// Database connection details for fetching the query
const dbConfigPresales = {
    user: 'CASHTREA_PRESALES',
    password: 'CASHTREA_PRESALES',
    connectString: 'implfundsdb.cems8ksh4ymo.ap-south-1.rds.amazonaws.com/IMPLDB'
};

// Database connection details for executing the fetched query
const dbConfigWorkshop = {
    user: 'CASHTREA_WORKSHOP',
    password: 'CASHTREA_WORKSHOP',
    connectString: 'implfundsdb.cems8ksh4ymo.ap-south-1.rds.amazonaws.com/IMPLDB'
};






// Function to create HTML for the table
function createTableHTML(result, reportName, fromDate, toDate) {
    const formattedFromDate = new Date(fromDate).toISOString().split('T')[0];
    const formattedToDate = new Date(toDate).toISOString().split('T')[0];
    const fileName = `${reportName}_${formattedFromDate}_to_${formattedToDate}`;

    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Display Table Data</title>
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                    background: skyblue;
                }
                th, td {
                    border: 1px solid black;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    position: relative;
                }
                td {
                    min-width: 100px;
                    word-wrap: break-word;
                }
                .download-btn {
                    margin: 20px 10px 20px 0;
                    padding: 10px 20px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .download-btn:hover {
                    background-color: #45a049;
                }
                .filter-input {
                    width: 100%;
                    box-sizing: border-box;
                    margin-top: 5px;
                    padding: 5px;
                }
            </style>
        </head>
        <body>
            <button class="download-btn" id="download-csv-btn">Download CSV</button>
            <button class="download-btn" id="download-pdf-btn">Download PDF</button>
            <button class="download-btn" id="download-xlsx-btn">Download XLSX</button>
            <button class="download-btn" id="record-count">RECORD COUNT: ${result.rows.length}</button>
            <table id="data-table">
                <thead>
                    <tr>
                        ${result.metaData.map(meta => `
                            <th>
                                ${meta.name}
                                <input type="text" class="filter-input" placeholder="Search ${meta.name}" data-column="${meta.name}">
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody id="data-body">
                    ${result.rows.map(row => `
                        <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>

            <!-- Include jsPDF and jsPDF AutoTable plugin -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.20/jspdf.plugin.autotable.min.js"></script>
            <!-- Include SheetJS library -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
            <script>
                document.getElementById('download-csv-btn').addEventListener('click', () => {
                    const rows = [
                        ${JSON.stringify(result.metaData.map(meta => meta.name))},
                        ...${JSON.stringify(result.rows)}
                    ];
                    const csvContent = rows.map(row => row.join(',')).join('\\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = '${fileName}.csv';
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });

                document.getElementById('download-pdf-btn').addEventListener('click', () => {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF();
                    doc.autoTable({
                        head: [${JSON.stringify(result.metaData.map(meta => meta.name))}],
                        body: ${JSON.stringify(result.rows)}
                    });
                    doc.save('${fileName}.pdf');
                });

                document.getElementById('download-xlsx-btn').addEventListener('click', () => {
                    const rows = [
                        ${JSON.stringify(result.metaData.map(meta => meta.name))},
                        ...${JSON.stringify(result.rows)}
                    ];
                    const worksheet = XLSX.utils.aoa_to_sheet(rows);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contracts Data');
                    XLSX.writeFile(workbook, '${fileName}.xlsx');
                });

                document.querySelectorAll('.filter-input').forEach(input => {
                    input.addEventListener('keyup', function() {
                        const column = this.getAttribute('data-column');
                        const filter = this.value.toLowerCase();
                        const table = document.getElementById('data-table');
                        const rows = table.querySelectorAll('tbody tr');
                        const columnIndex = Array.from(table.querySelectorAll('thead th')).findIndex(th => th.textContent.trim() === column);

                        rows.forEach(row => {
                            const cell = row.querySelectorAll('td')[columnIndex];
                            row.style.display = cell.textContent.toLowerCase().includes(filter) ? '' : 'none';
                        });
                    });
                });
            </script>
        </body>
        </html>
    `;

    return html;
}


// Function to create HTML for the table
function createQueryHTML(result) {
    

    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Contracts Data</title>
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                    background: skyblue;
                }
                th, td {
                    border: 1px solid black;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    position: relative;
                }
                td {
                    min-width: 100px;
                    word-wrap: break-word;
                }
                .download-btn {
                    margin: 20px 10px 20px 0;
                    padding: 10px 20px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .download-btn:hover {
                    background-color: #45a049;
                }
                .filter-input {
                    width: 100%;
                    box-sizing: border-box;
                    margin-top: 5px;
                    padding: 5px;
                }
            </style>
        </head>
        <body>
            
            <button class="download-btn" id="record-count">RECORD COUNT: ${result.rows.length}</button>
            <table id="data-table">
                <thead>
                    <tr>
                        ${result.metaData.map(meta => `
                            <th>
                                ${meta.name}
                                <input type="text" class="filter-input" placeholder="Search ${meta.name}" data-column="${meta.name}">
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody id="data-body">
                    ${result.rows.map(row => `
                        <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>

            
        </body>
        </html>
    `;

    return html;
}



// Function to create HTML for the report select options
async function createReportSelectHTML() {
    try {
        const connectionPresales = await oracledb.getConnection(dbConfigPresales);
        const resultPresales = await connectionPresales.execute(`
            SELECT DISTINCT reportname FROM testing1
        `);

        await connectionPresales.close
		
		
        let selectOptions = '';
        resultPresales.rows.forEach(row => {
            selectOptions += `<option value="${row[0]}">${row[0]}</option>`;
        });

        return selectOptions;
    } catch (err) {
        console.error('Error fetching report names:', err);
        return '';
    }
}


// Function to create HTML for the report select options
async function createColumnSelectHTML() {
    try {
        const connectionWorkshop = await oracledb.getConnection(dbConfigWorkshop);
                const resultWorkshop = await connectionWorkshop.execute(`
            SELECT TABLE_NAME
            FROM USER_TABLES
        `);

        await connectionWorkshop.close
		
		
        let selectOptions = '';
        resultWorkshop.rows.forEach(row => {
            selectOptions += `<option value="${row[0]}">${row[0]}</option>`;
        });

        return selectOptions;
    } catch (err) {
        console.error('Error fetching table names:', err);
        return '';
    }
}


async function getTableColumnData() {
    try {
        const connection = await oracledb.getConnection(dbConfigWorkshop);
        
        // Fetch table names
        const tableQuery = `SELECT TABLE_NAME FROM USER_TABLES`;
        const tableResult = await connection.execute(tableQuery);
        
        const tableColumnData = {};
        
        // Fetch column names for each table
        for (const row of tableResult.rows) {
            const tableName = row[0];
            const columnQuery = `SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :tableName`;
            const columnResult = await connection.execute(columnQuery, [tableName]);
            tableColumnData[tableName] = columnResult.rows.map(col => col[0]);
        }
        
        await connection.close();
        return tableColumnData;
    } catch (err) {
        console.error('Error fetching table and column names:', err);
        return {};
    }
}


async function createColumnSelectHTML() {
    try {
        const tableColumnData = await getTableColumnData();
        return Object.keys(tableColumnData).map(table => `<option value="${table}">${table}</option>`).join('');
    } catch (err) {
        console.error('Error creating column select HTML:', err);
        return '';
    }
}


async function getReportData() {
    try {
        const connection = await oracledb.getConnection(dbConfigPresales);
        const reportQuery = `SELECT REPORTNAME, QUERY FROM testing1`; // Adjust query as per your schema
        const result = await connection.execute(reportQuery);
        const reportData = {};
        result.rows.forEach(row => {
            reportData[row[0]] = row[1];
        });
        await connection.close();
        return reportData;
    } catch (err) {
        console.error('Error fetching report data:', err);
        return {};
    }
}

async function createQuerySelectHTML() {
    try {
        const reportData = await getReportData();
        return {
            optionsHTML: Object.keys(reportData).map(reportName => `<option value="${reportName}">${reportName}</option>`).join(''),
            reportData: reportData
        };
    } catch (err) {
        console.error('Error creating report select HTML:', err);
        return {
            optionsHTML: '',
            reportData: {}
        };
    }
}


// Create an HTTP server
const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
    // Serve the HTML form for selecting report name and date along with an iframe
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const reportOptionsHTML = await createReportSelectHTML();
    res.end(`
       <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(to right, #6a11cb, orange);
            color: #fff;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 900px;
            margin: auto;
            padding: 20px;
        }
        nav {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 10px;
            text-align: center;
        }
        nav a {
            color: white;
            margin: 0 15px;
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s;
        }
        nav a:hover {
            color: #ffeb3b; /* Hover color */
        }
        nav a.header {
            color: #00ff00; /* Active color */
        }
        nav a.active {
            color: #ffeb3b; /* Active color */
        }
        form {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            align-items: start;
        }
        form label {
            display: block;
            margin-bottom: 5px;
        }
        form select, form input {
            display: block;
            width: 90%;
            padding: 10px;
            border: none;
            border-radius: 5px;
        }
        form input[type="submit"] {
            background-color: #4CAF50;
            color: white;
            cursor: pointer;
            transition: background-color 0.3s;
            grid-column: span 3;
            padding: 10px;
            border: none;
			width: 100%;
            border-radius: 5px;
        }
        form input[type="submit"]:hover {
            background-color: #45a049;
        }
        iframe {
            width: 100%;
            height: 400px;
            border-color: blue;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .records-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-top: 20px;
        }
        .record {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            flex: 1 1 calc(33.333% - 20px);
            min-width: calc(33.333% - 20px); /* Ensures proper alignment on smaller screens */
        }
        @media (max-width: 900px) {
            .record {
                flex: 1 1 calc(50% - 20px);
                min-width: calc(50% - 20px);
            }
        }
        @media (max-width: 600px) {
            form {
                grid-template-columns: 1fr;
            }
            .record {
                flex: 1 1 100%;
                min-width: 100%;
            }
        }
    </style>
</head>
<body>
<nav>
    <a href="#" class="header">SM REPORTING</a>
    <a href="/create">CREATE</a>
    <a href="/prepare">PREPARE REPORT</a>
    <a href="/" class="active">VIEW</a>
    <a href="/delete">DELETE</a>
    <a href="/update">UPDATE</a>
</nav>
<div class="container">
    <form action="/fetch-data" method="post" target="data-iframe">
        <div>
            <label for="report-name">Select Report:</label>
            <select name="report-name" id="report-name">
                <option>Select</option>
                ${reportOptionsHTML}
            </select>
        </div>
        <div>
            <label for="from-date">From Date:</label>
            <input type="date" id="from-date" name="from-date" required>
        </div>
        <div>
            <label for="to-date">To Date:</label>
            <input type="date" id="to-date" name="to-date" required>
        </div>
        <input type="submit" value="View Report">
    </form>
    <div class="loading" id="loading">Loading...</div>
    <iframe name="data-iframe" id="data-iframe"></iframe>
		</div>
		<script>
			document.querySelector('form').addEventListener('submit', function () {
				document.getElementById('loading').style.display = 'block';
			});
			document.getElementById('data-iframe').addEventListener('load', function () {
				document.getElementById('loading').style.display = 'none';
			});
            </script>
        </body>
        </html>
    `);
} else if (req.method === 'POST' && req.url === '/fetch-data') {
    // Handle form submission to fetch and display data
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const params = new URLSearchParams(body);
        const reportName = params.get('report-name');
        const fromDate = params.get('from-date');
        const toDate = params.get('to-date');
        
        // Convert date format from yyyy-MM-dd to dd-MM-yyyy
        const [year1, month1, day1] = fromDate.split('-');
        const formattedfromDate = `${day1}-${month1}-${year1}`;
        const [year2, month2, day2] = toDate.split('-');
        const formattedtoDate = `${day2}-${month2}-${year2}`;

        try {
            // Fetch the query from the `testing1` table
            const connectionPresales = await oracledb.getConnection(dbConfigPresales);
            const resultPresales = await connectionPresales.execute(`
                SELECT Query FROM testing1 WHERE reportname = :reportName
            `, [reportName]);

            if (resultPresales.rows.length === 0) {
                throw new Error('No query found for the selected report name.');
            }

            let query = resultPresales.rows[0][0];
            query = query.replace(/\+fromdate\+/g, `TO_DATE('${formattedfromDate}', 'DD-MM-YYYY')`);
            query = query.replace(/\+todate\+/g, `TO_DATE('${formattedtoDate}', 'DD-MM-YYYY')`);

            // Log the constructed query for debugging
            console.log('Constructed Query:', query);

            // Release the connection for presales
            await connectionPresales.close();

            // Execute the fetched query with the replaced date
            const connectionWorkshop = await oracledb.getConnection(dbConfigWorkshop);
            const resultWorkshop = await connectionWorkshop.execute(query);

            // Generate HTML for the table with the report name and date range
            const tableHTML = createTableHTML(resultWorkshop, reportName, fromDate, toDate);

            // Serve the HTML response with the table
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(tableHTML);

            // Release the connection for workshop
            await connectionWorkshop.close();
        } catch (err) {
            console.error('Error executing query:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('An error occurred while fetching data.');
        }
    });
} else if (req.method === 'POST' && req.url === '/prepare-query') {
    // Handle form submission to fetch and display data
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const params = new URLSearchParams(body);
        const query = params.get('query-text');


        try {

            // Log the constructed query for debugging
            console.log('Prepared Query:', query);

           

            // Execute the fetched query with the replaced date
            const connectionWorkshop = await oracledb.getConnection(dbConfigWorkshop);
            const resultWorkshop = await connectionWorkshop.execute(query);

            // Generate HTML for the table with the report name and date range
            const tableHTML = createQueryHTML(resultWorkshop);

            // Serve the HTML response with the table
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(tableHTML);

            // Release the connection for workshop
            await connectionWorkshop.close();
        } catch (err) {
            console.error('Error executing query:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('An error occurred while fetching data.');
        }
    });
}else if (req.method === 'GET' && req.url === '/create') {
        // Serve the HTML for the CREATE page
        res.writeHead(200, { 'Content-Type': 'text/html' });
		const tableColumnData = await getTableColumnData();
        const reportOptionsHTML = await createColumnSelectHTML();
        res.end(`
            <!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Create Report</title>
				
				<style>
					body {
						font-family: Arial, sans-serif;
						background: linear-gradient(to right, #6a11cb, orange);
						color: #fff;
						margin: 0;
						padding: 0;
					}
					.container {
						max-width: 900px;
						margin: auto;
						padding: 20px;
					}
					nav {
						background-color: rgba(0, 0, 0, 0.3);
						padding: 10px;
						text-align: center;
					}
					nav a {
						color: white;
						margin: 0 15px;
						text-decoration: none;
						font-weight: bold;
						transition: color 0.3s;
					}
					nav a:hover {
						color: #ffeb3b; /* Hover color */
					}
					nav a.header {
						color: #00ff00; /* Active color */
					}
					nav a.active {
						color: #ffeb3b; /* Active color */
					}
					form {
						background-color: rgba(255, 255, 255, 0.2);
						padding: 20px;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
						margin-bottom: 20px;
						display: flex;
						flex-wrap: wrap;
						justify-content: space-between;
					}
					.form-left, .form-right {
						flex: 1;
						min-width: 300px; /* Ensures proper alignment on smaller screens */
					}
					form label, form select, form input, form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						border: none;
						border-radius: 5px;
					}
					form input[type="submit"] {
						background-color: #4CAF50;
						color: white;
						cursor: pointer;
						transition: background-color 0.3s;
						width: calc(100% - 40px);
						margin: 10px auto;
					}
					form input[type="submit"]:hover {
						background-color: #45a049;
					}
					iframe {
						width: 100%;
						height: 400px;
						border-color: blue;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
					}
					@media (max-width: 600px) {
						form {
							flex-direction: column;
						}
						.form-left, .form-right {
							min-width: 100%;
						}
					}
				</style>
				<script>
                    const tableColumnData = ${JSON.stringify(tableColumnData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const tableSelect = document.getElementById('table-name');
                        const columnSelect = document.getElementById('column-name');

                        tableSelect.addEventListener('change', () => {
                            const selectedTable = tableSelect.value;
                            const columns = tableColumnData[selectedTable] || [];

                            columnSelect.innerHTML = columns.map(column => 
                                \`<option value="\${column}">\${column}</option>\`
                            ).join('');
                        });
                    });
                </script>
			</head>
			<body>
				<nav>
					<a href="#" class="header">SM REPORTING</a>
					<a></a>
					<a href="/create" class="active">CREATE</a>
					<a href="/prepare">PREPARE REPORT</a>
					<a href="/">VIEW</a>
					<a href="/delete">DELETE</a>
					<a href="/update">UPDATE</a>
				</nav>
				<div class="container">
					<form action="/create-report" method="post" target="query-iframe">
						<div class="form-left">
							<label for="report-name">Enter Report Name:</label>
							<input name="report-name" id="report-name" placeholder="Report Name">
							<label for="query-text">Write your query:</label>
							<textarea id="query-text" name="query-text" rows="5" required></textarea>
						</div>
						<div class="form-right">
							<label for="table-name">Available Table:</label>
							<select name="table-name" id="table-name">
								<option>Select</option>${reportOptionsHTML}
							</select>
							<label for="column-name">Available Columns:</label>
							<select id="column-name" name="column-name"></select>
							
							<input type="submit" value="Create Report">
						</div>
						
					</form>
					<iframe name="query-iframe"></iframe>
				</div>
				
				
				
			</body>
			</html>

        `);
    }else if (req.method === 'GET' && req.url === '/prepare') {
    // Serve the HTML for the PREPARE page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const tableColumnData = await getTableColumnData();
    const reportOptionsHTML = await createColumnSelectHTML();

    res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Prepare Report</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(to right, #6a11cb, orange);
                    color: #fff;
                    margin: 0;
                    padding: 0;
                }
                .container {
                    max-width: 900px;
                    margin: auto;
                    padding: 20px;
                }
                nav {
                    background-color: rgba(0, 0, 0, 0.3);
                    padding: 10px;
                    text-align: center;
                }
                nav a {
                    color: white;
                    margin: 0 15px;
                    text-decoration: none;
                    font-weight: bold;
                    transition: color 0.3s;
                }
                nav a:hover {
                    color: #ffeb3b; /* Hover color */
                }
                nav a.header {
                    color: #00ff00; /* Active color */
                }
                nav a.active {
                    color: #ffeb3b; /* Active color */
                }
                form {
                    background-color: rgba(255, 255, 255, 0.2);
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    margin-bottom: 20px;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                }
                .form-left, .form-right {
                    flex: 1;
                    min-width: 300px; /* Ensures proper alignment on smaller screens */
                }
                form label, form select, form input, form textarea {
                    display: block;
                    width: calc(100% - 40px);
                    margin: 10px auto;
                    padding: 10px;
                    border: none;
                    border-radius: 5px;
                }
                form input[type="submit"] {
                    background-color: #4CAF50;
                    color: white;
                    cursor: pointer;
                    transition: background-color 0.3s;
                    width: calc(100% - 40px);
                    margin: 10px auto;
                }
                form input[type="submit"]:hover {
                    background-color: #45a049;
                }
                iframe {
                    width: 100%;
                    height: 400px;
                    border-color: blue;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                }
                .loading {
                    display: none;
                    text-align: center;
                    padding: 20px;
                }
                @media (max-width: 600px) {
                    form {
                        flex-direction: column;
                    }
                    .form-left, .form-right {
                        min-width: 100%;
                    }
                }
            </style>
            <script>
                const tableColumnData = ${JSON.stringify(tableColumnData)};

                document.addEventListener('DOMContentLoaded', () => {
                    const tableSelect = document.getElementById('table-name');
                    const columnSelect = document.getElementById('column-name');

                    tableSelect.addEventListener('change', () => {
                        const selectedTable = tableSelect.value;
                        const columns = tableColumnData[selectedTable] || [];

                        columnSelect.innerHTML = columns.map(column => 
                            \`<option value="\${column}">\${column}</option>\`
                        ).join('');
                    });
                });
            </script>
        </head>
        <body>
            <nav>
                <a href="#" class="header">SM REPORTING</a>
                <a></a>
                <a href="/create">CREATE</a>
                <a href="/prepare" class="active">PREPARE REPORT</a>
                <a href="/">VIEW</a>
                <a href="/delete">DELETE</a>
                <a href="/update">UPDATE</a>
            </nav>
            <div class="container">
                <form action="/prepare-query" method="post" target="data-iframe">
                    <div class="form-left">
                        <label for="query-text">Write your query:</label>
                        <textarea id="query-text" name="query-text" rows="5" required></textarea>
                        <input type="submit" value="Prepare Report">
                    </div>
                    <div class="form-right">
                        <label for="table-name">Available Table:</label>
                        <select name="table-name" id="table-name">
                            <option>Select</option>${reportOptionsHTML}
                        </select>
                        <label for="column-name">Available Columns:</label>
                        <select id="column-name" name="column-name"></select>
                    </div>
                </form>				
                <div class="loading" id="loading">Loading...</div>
                <iframe name="data-iframe" id="data-iframe"></iframe>
            </div>

            <script>
                document.querySelector('form').addEventListener('submit', function() {
                    document.getElementById('loading').style.display = 'block';
                });

                document.getElementById('data-iframe').addEventListener('load', function() {
                    document.getElementById('loading').style.display = 'none';
                });
            </script>
        </body>
        </html>
    `);
} else if (req.method === 'GET' && req.url === '/delete') {
        // Serve the HTML for the UPDATE page
        res.writeHead(200, { 'Content-Type': 'text/html' });
		const reportOptionsHTML = await createReportSelectHTML();
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Delete Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: linear-gradient(to right, #6a11cb, orange);
                        color: #fff;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 900px;
                        margin: auto;
                        padding: 20px;
                    }
                    nav {
                        background-color: rgba(0, 0, 0, 0.3);
                        padding: 10px;
                        text-align: center;
                    }
                    nav a {
                        color: white;
                        margin: 0 15px;
                        text-decoration: none;
                        font-weight: bold;
                        transition: color 0.3s;
                    }
                    nav a:hover {
                        color: #ffeb3b;
                    }
					nav a.header {
						color: #00ff00; /* Active color */
					}
					nav a.active {
						color: #ffeb3b; /* Active color */
					}
                    form {
                        background-color: rgba(255, 255, 255, 0.2);
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    form label, form select, form input {
                        display: block;
                        width: calc(100% - 40px);
                        margin: 10px auto;
                        padding: 10px;
                        border: none;
                        border-radius: 5px;
                        max-width: 300px; /* Reduced width */
                    }
                    form input[type="submit"] {
                        background-color: #4CAF50;
                        color: white;
                        cursor: pointer;
                        transition: background-color 0.3s;
                    }
                    form input[type="submit"]:hover {
                        background-color: #45a049;
                    }
                    iframe {
                        width: 100%;
                        height: 400px;
                        border-color: blue;
                        border-radius: 10px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        border-radius: 10px;
                        overflow: hidden;
                    }
                    th, td {
                        padding: 15px;
                        text-align: left;
                    }
                    th {
                        background-color: #f39c12;
                        color: white;
                    }
                    tr:nth-child(even) {
                        background-color: #f2f2f2;
                    }
                    tr:nth-child(odd) {
                        background-color: #e6e6e6;
                    }
                    tr:hover {
                        background-color: #ddd;
                    }
                    @media (max-width: 600px) {
                        form label, form select, form input {
                            width: calc(100% - 20px);
                        }
                    }
                </style>
            </head>
            <body>
                <nav>
                    <a href="#"  class="header">SM REPORTING</a>
					<a></a>
                    <a href="/create">CREATE</a>
					<a href="/prepare">PREPARE REPORT</a>
                    <a href="/">VIEW</a>
                    <a href="/delete"  class="active">DELETE</a>
                    <a href="/update">UPDATE</a>
						
                </nav>
                <div class="container">
                    
					<form action="/delete-report" method="post" target="query-iframe">
						<label for="report-name">Select Report:</label>
                        <select name="report-name" id="report-name">
						<option>Select</option>${reportOptionsHTML}
                        </select>
                        <br>
                        <input type="submit" value="Delete Report">
                    </form>
                    <iframe name="query-iframe"></iframe>
                    
                </div>
            </body>
            </html>
        `);
    } else if (req.method === 'GET' && req.url === '/update') {
		const reportOptionsHTML = await createReportSelectHTML();
        const { optionsHTML, reportData } = await createQuerySelectHTML();
		const tableColumnData = await getTableColumnData();
        const reportOptionsHTML1 = await createColumnSelectHTML();

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Update Report</title>
                <style>
                    body {
						font-family: Arial, sans-serif;
						background: linear-gradient(to right, #6a11cb, orange);
						color: #fff;
						margin: 0;
						padding: 0;
					}
					.container {
						max-width: 900px;
						margin: auto;
						padding: 20px;
					}
					nav {
						background-color: rgba(0, 0, 0, 0.3);
						padding: 10px;
						text-align: center;
					}
					nav a {
						color: white;
						margin: 0 15px;
						text-decoration: none;
						font-weight: bold;
						transition: color 0.3s;
					}
					nav a:hover {
						color: #ffeb3b; /* Hover color */
					}
					nav a.header {
						color: #00ff00; /* Active color */
					}
					nav a.active {
						color: #ffeb3b; /* Active color */
					}
					form {
						background-color: rgba(255, 255, 255, 0.2);
						padding: 20px;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
						margin-bottom: 20px;
						display: flex;
						flex-wrap: wrap;
						justify-content: space-between;
					}
					.form-left, .form-right {
						flex: 1;
						min-width: 300px; /* Ensures proper alignment on smaller screens */
					}
					form label, form select, form input, form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						border: none;
						border-radius: 5px;
					}
					form input[type="submit"] {
						background-color: #4CAF50;
						color: white;
						cursor: pointer;
						transition: background-color 0.3s;
						width: calc(100% - 40px);
						margin: 10px auto;
					}
					form input[type="submit"]:hover {
						background-color: #45a049;
					}
					iframe {
						width: 100%;
						height: 400px;
						border-color: blue;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
					}
					@media (max-width: 600px) {
						form {
							flex-direction: column;
						}
						.form-left, .form-right {
							min-width: 100%;
						}
					}
                </style>
                <script>
                    const reportData = ${JSON.stringify(reportData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const reportSelect = document.getElementById('report-name');
                        const queryTextarea = document.getElementById('query-text');

                        reportSelect.addEventListener('change', () => {
                            const selectedReport = reportSelect.value;
                            queryTextarea.value = reportData[selectedReport] || '';
                        });
                    });
                </script>
				
				<script>
                    const tableColumnData = ${JSON.stringify(tableColumnData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const tableSelect = document.getElementById('table-name');
                        const columnSelect = document.getElementById('column-name');

                        tableSelect.addEventListener('change', () => {
                            const selectedTable = tableSelect.value;
                            const columns = tableColumnData[selectedTable] || [];

                            columnSelect.innerHTML = columns.map(column => 
                                \`<option value="\${column}">\${column}</option>\`
                            ).join('');
                        });
                    });
                </script>
            </head>
            <body>
                <nav>
                    <a href="#" class="header">SM REPORTING</a>
                    <a></a>
                    <a href="/create">CREATE</a>
					<a href="/prepare">PREPARE REPORT</a>
                    <a href="/">VIEW</a>
                    <a href="/delete">DELETE</a>
                    <a href="/update" class="active">UPDATE</a>
                </nav>
                <div class="container">
                    <form action="/update-report" method="POST" target="query-iframe">
						<div class="form-left">
							<label for="report-name">Select Report:</label>
							<select name="report-name" id="report-name">
								<option>Select</option>${reportOptionsHTML}	
							</select>
							<label for="query-text">Report Query:</label>
							<textarea id="query-text" name="query-text" rows="5" required></textarea>
						</div>
						
						<div class="form-right">
							<label for="table-name">Available Tables:</label>
							<select name="table-name" id="table-name">
								<option>Select</option>${reportOptionsHTML1}
							</select>
							<label for="column-name">Available Columns:</label>
							<select id="column-name" name="column-name"></select>
							<input type="submit" value ="Update Report">
						</div>
						
						
                    </form>
                    <iframe name="query-iframe"></iframe>
                </div>
            </body>
            </html>
        `);
    }else if (req.method === 'POST' && req.url === '/execute-query') {
        // Handle form submission to execute user query and display results
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            const params = new URLSearchParams(body);
			const reportName = params.get('report-name');
            const userQuery = params.get('query-text');

            try {
                // Execute the user-provided query
                const connectionWorkshop = await oracledb.getConnection(dbConfigWorkshop);
                const resultWorkshop = await connectionWorkshop.execute(userQuery);

                // Generate HTML for the table
                const tableHTML = createTableHTML(resultWorkshop);

                // Serve the HTML response with the table
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(tableHTML);

                // Release the connection for workshop
                await connectionWorkshop.close();
            } catch (err) {
                console.error('Error executing user query:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('An error occurred while executing the query.');
            }
        });
    }  else if (req.method === 'POST' && req.url === '/delete-report') {
       // Handle form submission to fetch and display data
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            const params = new URLSearchParams(body);
            const reportName = params.get('report-name');
            try {
                // Fetch the query from the `testing1` table
                const connectionPresales = await oracledb.getConnection(dbConfigPresales);
                const resultPresales = await connectionPresales.execute(`
                    DELETE FROM testing1 WHERE reportname = :reportName
                `, [reportName]);

                await connectionPresales.commit(); // Commit the transaction
                await connectionPresales.close();

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background: linear-gradient(to right, #6a11cb, orange);
                                color: #fff;
                                margin: 0;
                                padding: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                text-align: center;
                            }
                            .message-container {
                                background-color: rgba(0, 0, 0, 0.3);
                                padding: 20px;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                                max-width: 600px;
                            }
                            h1 {
                                color: #4CAF50;
                            }
                            a {
                                color: #ffeb3b;
                                text-decoration: none;
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="message-container">
                            <h1>Report deleted successfully.</h1>
                            
                        </div>
                    </body>
                    </html>
                `);
            } catch (err) {
                console.error('Error during deleting report:', err);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background: linear-gradient(to right, #6a11cb, orange);
                                color: #fff;
                                margin: 0;
                                padding: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                text-align: center;
                            }
                            .message-container {
                                background-color: rgba(0, 0, 0, 0.3);
                                padding: 20px;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                                max-width: 600px;
                            }
                            h1 {
                                color: #f44336;
                            }
                            a {
                                color: #ffeb3b;
                                text-decoration: none;
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="message-container">
                            <h1>Error during deleting report.</h1>
                            
                        </div>
                    </body>
                    </html>
                `);
            }
        });
    }  else if (req.method === 'POST' && req.url === '/create-report') {
    // Handle form submission to insert and display data
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', async () => {
        const params = new URLSearchParams(body);
        const reportName = params.get('report-name');
        const queryText = params.get('query-text');

        try {
            // Fetch the connection
            const connectionPresales = await oracledb.getConnection(dbConfigPresales);

            // Check if the report already exists
            const checkResult = await connectionPresales.execute(`
                SELECT COUNT(*) AS COUNT FROM testing1 WHERE reportname = :reportName
            `, [reportName]);

            const reportExists = checkResult.rows[0][0] > 0;

            if (reportExists) {
                // If the report already exists, return a message
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background: linear-gradient(to right, #6a11cb, orange);
                                color: #fff;
                                margin: 0;
                                padding: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                text-align: center;
                            }
                            .message-container {
                                background-color: rgba(0, 0, 0, 0.3);
                                padding: 20px;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                                max-width: 600px;
                            }
                            h1 {
                                color: #ffeb3b;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="message-container">
                            <h1>Report already exists.</h1>
                        </div>
                    </body>
                    </html>
                `);
            } else {
                // If the report does not exist, insert the new report
                const insertResult = await connectionPresales.execute(`
                    INSERT INTO testing1 
                    VALUES (:reportName, :queryText, TO_DATE(SYSDATE, 'dd-MM-yyyy'))
                `, [reportName, queryText]);

                await connectionPresales.commit(); // Commit the transaction

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <html>
                    <head>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background: linear-gradient(to right, #6a11cb, orange);
                                color: #fff;
                                margin: 0;
                                padding: 0;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                height: 100vh;
                                text-align: center;
                            }
                            .message-container {
                                background-color: rgba(0, 0, 0, 0.3);
                                padding: 20px;
                                border-radius: 10px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                                max-width: 600px;
                            }
                            h1 {
                                color: #4CAF50;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="message-container">
                            <h1>Report created successfully.</h1>
                        </div>
                    </body>
                    </html>
                `);
            }

            await connectionPresales.close();
        } catch (err) {
            console.error('Error during report creation:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background: linear-gradient(to right, #6a11cb, orange);
                            color: #fff;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            text-align: center;
                        }
                        .message-container {
                            background-color: rgba(0, 0, 0, 0.3);
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            max-width: 600px;
                        }
                        h1 {
                            color: #f44336;
                        }
                    </style>
                </head>
                <body>
                    <div class="message-container">
                        <h1>Error during report creation.</h1>
                    </div>
                </body>
                </html>
            `);
        }
    });
}  else if (req.method === 'POST' && req.url === '/update-report') {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const params = new URLSearchParams(body);
            const reportName = params.get('report-name');
            const queryText = params.get('query-text');

            if (!reportName || !queryText) {
                throw new Error("Report name or query text is missing.");
            }

            const connectionPresales = await oracledb.getConnection(dbConfigPresales);

            const checkResult = await connectionPresales.execute(
                `SELECT COUNT(*) AS COUNT FROM testing1 WHERE reportname = :reportName`,
                [reportName]
            );

            const reportExists = checkResult.rows[0][0] > 0;

            let message, statusCode;

            if (reportExists) {
                const updateResult = await connectionPresales.execute(
                    `UPDATE testing1 SET query = :queryText WHERE reportname = :reportName`,
                    [queryText, reportName]
                );

                await connectionPresales.commit();

                if (updateResult.rowsAffected && updateResult.rowsAffected === 1) {
                    statusCode = 200;
                    message = "Report updated successfully.";
                } else {
                    throw new Error("Failed to update report.");
                }
            } else {
                statusCode = 200;
                message = "Report does not exist.";
            }

            connectionPresales.close();

            res.writeHead(statusCode, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background: linear-gradient(to right, #6a11cb, orange);
                            color: #fff;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            text-align: center;
                        }
                        .message-container {
                            background-color: rgba(0, 0, 0, 0.3);
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            max-width: 600px;
                        }
                        h1 {
                            color: ${statusCode === 200 ? '#4CAF50' : '#ffeb3b'};
                        }
                    </style>
                </head>
                <body>
                    <div class="message-container">
                        <h1>${message}</h1>
                    </div>
                </body>
                </html>
            `);
        } catch (err) {
            console.error('Error during report updation:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background: linear-gradient(to right, #6a11cb, orange);
                            color: #fff;
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            text-align: center;
                        }
                        .message-container {
                            background-color: rgba(0, 0, 0, 0.3);
                            padding: 20px;
                            border-radius: 10px;
                            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            max-width: 600px;
                        }
                        h1 {
                            color: #f44336;
                        }
                    </style>
                </head>
                <body>
                    <div class="message-container">
                        <h1>Error during report updation.</h1>
                    </div>
                </body>
                </html>
            `);
        }
    });
}
 else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

				
				
