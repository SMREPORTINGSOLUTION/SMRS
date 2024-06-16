	const http = require('http');
	const oracledb = require('oracledb');
	const querystring = require('querystring');
	const fs = require('fs');
	const path = require('path');

	// Database connection details for executing the fetched query
	const dbConfigSMRS = {
	    user: 'oraadmin',
	    password: 'RameshMani',
	    connectString: 'oradbinstance.clews4geczyj.eu-north-1.rds.amazonaws.com/ORCL'
	};

	const dbConfigFetch = {
	    user: 'oraadmin',
	    password: 'RameshMani',
	    connectString: 'oradbinstance.clews4geczyj.eu-north-1.rds.amazonaws.com/ORCL'
	};

	function isAuthenticated(req) {
	    const cookies = parseCookies(req);
	    const sessionId = cookies.sessionId;
	    return sessions[sessionId];
	}

	function parseCookies(req) {
	    let list = {},
	        rc = req.headers.cookie;

	    rc && rc.split(';').forEach(cookie => {
	        let parts = cookie.split('=');
	        list[parts.shift().trim()] = decodeURI(parts.join('='));
	    });

	    return list;
	}

	const sessions = {};

	// Function to create HTML for the table
	function createDashboardHTMLTwo(result, dashboardName, vtype, fromDate, toDate) {
	    const formattedFromDate = new Date(fromDate).toISOString().split('T')[0];
	    const formattedToDate = new Date(toDate).toISOString().split('T')[0];
	    const fileName = `${dashboardName}_${formattedFromDate}_to_${formattedToDate}`;

	    // Assuming the label is the first entry in metaData
	    const reportLabel = result.metaData[0].name;
	    const xLabel = result.metaData[0].name; // Assuming the first header is for the x-axis
	    const yLabel = result.metaData[1].name; // Assuming the second header is for the y-axis

	    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Display Chart</title>
            <style>
                .download-btn {
					margin-bottom:20px;
					padding: 10px 20px;
					background-color: rgba(0, 0, 0, 0.3);
					color: white;
					border-radius: 2px;
					border: 2px solid black;
					cursor: pointer;
				}
                .download-btn:hover {
                    background-color: rgba(0, 0, 0, 0.3);
                }
                #chart-container {
                    width: 80%;
                    
					margin-right:20px;
					margin-top:20px;
					margin-bottom:20px;
                    
                }
                .chart-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin: 20px 0;
                }
                .chart-label {
                    flex: 1;
                    text-align: left;
                }
                .buttons-container {
                    flex: 1;
                    text-align: right;
                }
                canvas {
                    margin-top: 20px;
                    background-color: white;
                }
            </style>
        </head>
        <body>
            
            <div id="chart-container">
                <div class="chart-header">
                    
                    <div class="buttons-container">
                        <button class="download-btn" id="download-csv-btn">Download CSV</button>
                        <button class="download-btn" id="download-pdf-btn">Download PDF</button>
                        <button class="download-btn" id="download-xlsx-btn">Download XLSX</button>
                        <button class="download-btn" id="record-count">RECORD COUNT: ${result.rows.length}</button>
                    </div>
                </div>
				<h2 style="text-align: center;color:black;background-color:white;">${dashboardName}</h2>
                <canvas id="myChart" width="400" height="200"></canvas>
            </div>

            <!-- Include jsPDF and jsPDF AutoTable plugin -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.20/jspdf.plugin.autotable.min.js"></script>
            <!-- Include SheetJS library -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
            <!-- Include Chart.js library -->
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
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

                function isNumber(value) {
                    return !isNaN(value) && value !== null && value !== '';
                }

                const columns = ${JSON.stringify(result.metaData)};
                const rows = ${JSON.stringify(result.rows)};
                let labels = [];
                let datasets = [];

                rows.forEach(row => {
                    row.forEach((cell, index) => {
                        if (index === 0) {
                            labels.push(cell);
                        } else {
                            if (!datasets[index - 1]) {
                                datasets[index - 1] = {
                                    label: columns[index].name,
                                    data: [],
                                    backgroundColor: 'skyblue',
                                    borderColor: 'blue',
                                    borderWidth: 1
                                };
                            }
                            datasets[index - 1].data.push(isNumber(cell) ? Number(cell) : 0);
                        }
                    });
                });

                console.log('Labels:', labels);
                console.log('Datasets:', datasets);

                const ctx = document.getElementById('myChart').getContext('2d');
                const chart = new Chart(ctx, {
                    type: '${vtype}',
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: '${xLabel}'
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: '${yLabel}'
                                }
                            }
                        }
                    }
                });
            </script>
        </body>
        </html>
    `;

	    return html;
	}

	function createDashboardHTMLOne(result, dashboardName, vtype, fromDate, toDate) {
	    const formattedFromDate = new Date(fromDate).toISOString().split('T')[0];
	    const formattedToDate = new Date(toDate).toISOString().split('T')[0];
	    const fileName = `${dashboardName}_${formattedFromDate}_to_${formattedToDate}`;

	    // Assuming the label is the first entry in metaData
	    const reportLabel = result.metaData[0].name;

	    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Display Chart</title>
            <style>
                .download-btn {
					margin-bottom:20px;
					padding: 10px 20px;
					background-color: rgba(0, 0, 0, 0.3);
					color: white;
					border-radius: 2px;
					border: 2px solid black;
					cursor: pointer;
				}
                .download-btn:hover {
                    background-color: rgba(0, 0, 0, 0.3);
                }
                #chart-container {
                    width: 80%;                    
					margin-right:20px;
					margin-top:20px;
					margin-bottom:20px;
                    
                }
                .chart-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin: 20px 0;
                }
                .chart-label {
                    flex: 1;
                    text-align: left;
                }
                .buttons-container {
                    flex: 1;
                    text-align: right;
                }
                .card-container {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 20px;
                    margin-top: 20px;
                }
                .card {
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    width: 200px;
                    text-align: center;
                }
                canvas {
                    margin-top: 20px;
                    background-color: white;
                }
            </style>
        </head>
        <body>
            
            <div id="chart-container">
                <div class="chart-header">
                    
                    <div class="buttons-container">
                        <button class="download-btn" id="download-csv-btn">Download CSV</button>
                        <button class="download-btn" id="download-pdf-btn">Download PDF</button>
                        <button class="download-btn" id="download-xlsx-btn">Download XLSX</button>
                        <button class="download-btn" id="record-count">RECORD COUNT: ${result.rows.length}</button>
                    </div>
                </div>
                <h2 style="text-align: center;color:black;background-color:white;">${dashboardName}</h2>
                <div class="card-container">
                    ${result.rows.map(row => `<div class="card">${row[0]}</div>`).join('')}
                </div>
            </div>

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
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
                    XLSX.writeFile(workbook, '${fileName}.xlsx');
                });
            </script>
        </body>
        </html>
    `;

	    return html;
	}

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
					body {
						width: 80%;
						margin-left:20px;
						margin-right:20px;
						margin-top:20px;
						margin-bottom:20px;
						text-align: center;
					}
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
						margin-bottom:20px;
						padding: 10px 20px;
						background-color: rgba(0, 0, 0, 0.3);
						color: white;
						border-radius: 2px;
						border: 2px solid black;
						cursor: pointer;
					}
					.download-btn:hover {
						background-color: rgba(0, 0, 0, 0.3);
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
	function createTableDataHTML(result, reportName) {

	    const fileName = `${reportName}`;

	    let html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Display Table Data</title>
				<style>
					body {
						width: 80%;
						margin-left:20px;
						margin-right:20px;
						margin-top:20px;
						margin-bottom:20px;
						text-align: center;
					}
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
						margin-bottom:20px;
						padding: 10px 20px;
						background-color: rgba(0, 0, 0, 0.3);
						color: white;
						border-radius: 2px;
						border: 2px solid black;
						cursor: pointer;
					}
					.download-btn:hover {
						background-color: rgba(0, 0, 0, 0.3);
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
	
	
	
	// Function to create HTML for the report select options
	async function createDashboardSelectHTML(req) {

	    // Parse cookies from request
	    const cookies = parseCookies(req);

	    // Retrieve username and dbDetails from session
	    const sessionId = cookies.sessionId;
	    const session = sessions[sessionId];
	    const username = session ? session.username : '';

	    try {
	        const connection = await oracledb.getConnection(dbConfigSMRS);
	        const result = await connection.execute(`
				SELECT dashboard_name  FROM SMREPORTING_DASHBOARDS_DETAILS WHERE created_for = :username
			`, [username]);

	        await connection.close

	        let selectOptions = '';
	        result.rows.forEach(row => {
	            selectOptions += `<option value="${row[0]}">${row[0]}</option>`;
	        });

	        return selectOptions;
	    } catch (err) {
	        console.error('Error fetching report names:', err);
	        return '';
	    }
	}

	async function getDashboardData() {
	    try {
	        const connection = await oracledb.getConnection(dbConfigSMRS);
	        const reportQuery = `SELECT dashboard_name,created_query FROM SMREPORTING_DASHBOARDS_DETAILS`; // Adjust query as per your schema
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

	async function createQuerySelectDashboardHTML() {
	    try {
	        const reportData = await getDashboardData();
	        return {
	            optionsHTML: Object.keys(reportData).map(dashboard_name => `<option value="${dashboard_name}">${dashboard_name}</option>`).join(''),
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

	async function getDashboardNameData() {
	    try {
	        const connection = await oracledb.getConnection(dbConfigSMRS);

	        // Fetch table names
	        const userQuery = `SELECT username from SMREPORTING_USERS where role='User'`;
	        const userResult = await connection.execute(userQuery);

	        const tableReportData = {};

	        // Fetch column names for each table
	        for (const row of userResult.rows) {
	            const username = row[0];
	            const dashboardQuery = `SELECT dashboard_name  FROM SMREPORTING_DASHBOARDS_DETAILS WHERE created_for = :username`;
	            const reportResult = await connection.execute(dashboardQuery, [username]);
	            tableReportData[username] = reportResult.rows.map(col => col[0]);
	        }

	        await connection.close();
	        return tableReportData;
	    } catch (err) {
	        console.error('Error fetching table and column names:', err);
	        return {};
	    }
	}

	async function createDashboardNameSelectHTML() {
	    try {
	        const tableReportData = await getDashboardNameData();
	        return Object.keys(tableReportData).map(table => `<option value="${table}">${table}</option>`).join('');
	    } catch (err) {
	        console.error('Error creating column select HTML:', err);
	        return '';
	    }
	}

	async function userGetTableColumnData(userName) {
	    console.log(`Fetching table and column data for user userGetTableColumnData before : ${userName}`); // Add logging

	    try {
	        const connection = await oracledb.getConnection(dbConfigSMRS);
	        const userQueryResult = await connection.execute(`
            SELECT HOST, DBPORT, SID, DBPASSWORD, DBUSERNAME 
            FROM SMREPORTING_USERS 
            WHERE username = :userName
        `, [userName]);

	        if (userQueryResult.rows.length === 0) {
	            throw new Error('No database configuration found for the selected user.');
	        }

	        const userConfig = userQueryResult.rows[0];
	        const dbConfig = {
	            user: userConfig[4],
	            password: userConfig[3],
	            connectString: `${userConfig[0]}:${userConfig[1]}/${userConfig[2]}`
	        };

	        const userConnection = await oracledb.getConnection(dbConfig);

	        // Fetch table names
	        const tableQuery = `SELECT TABLE_NAME FROM USER_TABLES`;
	        const tableResult = await userConnection.execute(tableQuery);

	        const tableColumnData = {};

	        // Fetch column names for each table
	        for (const row of tableResult.rows) {
	            const tableName = row[0];
	            const columnQuery = `SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :tableName`;
	            const columnResult = await userConnection.execute(columnQuery, [tableName]);
	            tableColumnData[tableName] = columnResult.rows.map(col => col[0]);
	        }

	        await userConnection.close();
	        console.log(`Fetched table and column data for user at userGetTableColumnData after : ${userName}`); // Add logging
	        return tableColumnData;
	    } catch (err) {
	        console.error('Error fetching table and column names:', err);
	        return {};
	    }
	}

	async function userCreateColumnSelectHTML(userName) {
	    try {
	        const tableColumnData = await userGetTableColumnData(userName);
	        return Object.keys(tableColumnData).map(table => `<option value="${table}">${table}</option>`).join('');
	    } catch (err) {
	        console.error('Error creating column select HTML:', err);
	        return '';
	    }
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

	async function getReportColumnData() {
	    try {
	        const connection = await oracledb.getConnection(dbConfigSMRS);

	        // Fetch table names
	        const userQuery = `SELECT username from SMREPORTING_USERS where role='User'`;
	        const userResult = await connection.execute(userQuery);

	        const tableReportData = {};

	        // Fetch column names for each table
	        for (const row of userResult.rows) {
	            const username = row[0];
	            const reportQuery = `SELECT report_name  FROM SMREPORTING_REPORTS_DETAILS WHERE created_for = :username`;
	            const reportResult = await connection.execute(reportQuery, [username]);
	            tableReportData[username] = reportResult.rows.map(col => col[0]);
	        }

	        await connection.close();
	        return tableReportData;
	    } catch (err) {
	        console.error('Error fetching table and column names:', err);
	        return {};
	    }
	}

	async function createReportNameSelectHTML() {
	    try {
	        const tableReportData = await getReportColumnData();
	        return Object.keys(tableReportData).map(table => `<option value="${table}">${table}</option>`).join('');
	    } catch (err) {
	        console.error('Error creating column select HTML:', err);
	        return '';
	    }
	}

	// Function to create HTML for the report select options
	async function createReportSelectHTMLTesting(req) {

	    // Parse cookies from request
	    const cookies = parseCookies(req);

	    // Retrieve username and dbDetails from session
	    const sessionId = cookies.sessionId;
	    const session = sessions[sessionId];
	    const username = session ? session.username : '';
	    const dbDetails = session ? session.dbDetails : null;

	    const {
	        host,
	        dbport,
	        sid,
	        dbUsername,
	        dbPassword
	    } = dbDetails;
	    const dbConfig = {
	        user: dbUsername,
	        password: dbPassword,
	        connectString: `${host}:${dbport}/${sid}`
	    };
	    try {
	        const connection = await oracledb.getConnection(dbConfig);
	        const result = await connection.execute(`
				SELECT report_name  FROM SMREPORTING_REPORTS_DETAILS WHERE created_for = :username;
			`);

	        await connection.close

	        let selectOptions = '';
	        result.rows.forEach(row => {
	            selectOptions += `<option value="${row[0]}">${row[0]}</option>`;
	        });

	        return selectOptions;
	    } catch (err) {
	        console.error('Error fetching report names:', err);
	        return '';
	    }
	}

	// Function to create HTML for the report select options
	async function createReportSelectHTML(req) {

	    // Parse cookies from request
	    const cookies = parseCookies(req);

	    // Retrieve username and dbDetails from session
	    const sessionId = cookies.sessionId;
	    const session = sessions[sessionId];
	    const username = session ? session.username : '';

	    try {
	        const connection = await oracledb.getConnection(dbConfigSMRS);
	        const result = await connection.execute(`
				SELECT report_name  FROM SMREPORTING_REPORTS_DETAILS WHERE created_for = :username
			`, [username]);

	        await connection.close

	        let selectOptions = '';
	        result.rows.forEach(row => {
	            selectOptions += `<option value="${row[0]}">${row[0]}</option>`;
	        });

	        return selectOptions;
	    } catch (err) {
	        console.error('Error fetching report names:', err);
	        return '';
	    }
	}

	// Function to create HTML for the report select options
	async function DisplayColumnSelectHTML(req) {

	    // Parse cookies from request
	    const cookies = parseCookies(req);

	    // Retrieve username and dbDetails from session
	    const sessionId = cookies.sessionId;
	    const session = sessions[sessionId];
	    const username = session ? session.username : '';
	    const dbDetails = session ? session.dbDetails : null;

	    const {
	        host,
	        dbport,
	        sid,
	        dbUsername,
	        dbPassword
	    } = dbDetails;
	    const dbConfig = {
	        user: dbUsername,
	        password: dbPassword,
	        connectString: `${host}:${dbport}/${sid}`
	    };

	    try {
	        const connection = await oracledb.getConnection(dbConfig);
	        const result = await connection.execute(`
				SELECT TABLE_NAME
				FROM USER_TABLES
			`);

	        await connection.close

	        let selectOptions = '';
	        result.rows.forEach(row => {
	            selectOptions += `<option value="${row[0]}">${row[0]}</option>`;
	        });

	        return selectOptions;
	    } catch (err) {
	        console.error('Error fetching table names:', err);
	        return '';
	    }
	}

	async function createAvailableUserSelectHTML() {
	    try {
	        const connectionWorkshop = await oracledb.getConnection(dbConfigSMRS);
	        const resultWorkshop = await connectionWorkshop.execute(`
				SELECT username from SMREPORTING_USERS where role='User'				
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
	        const connection = await oracledb.getConnection(dbConfigFetch);

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
	        const connection = await oracledb.getConnection(dbConfigSMRS);
	        const reportQuery = `SELECT report_name,created_query FROM SMREPORTING_REPORTS_DETAILS`; // Adjust query as per your schema
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

	    if (req.method === 'GET' && req.url.startsWith('/api/userGetTableColumnData')) {
	        const urlParams = new URLSearchParams(req.url.split('?')[1]);
	        const userName = urlParams.get('user');
	        console.log(`API call received for user: ${userName}`); // Add logging
	        const tableColumnData = await userGetTableColumnData(userName);
	        res.writeHead(200, {
	            'Content-Type': 'application/json'
	        });
	        res.end(JSON.stringify(tableColumnData));
	        return;
	    }

	    if (req.method === 'GET' && req.url === '/') {
	        // Serve the HTML form for login
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        res.end(`
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Login</title>
					<style>
						body {
							font-family: Arial, sans-serif;
							background: #B6D0E2;
							color: #fff;
							margin: 0;
							padding: 0;
						}
						.container {
							max-width: 400px;
							margin: auto;
							padding: 20px;
						}
						form {
							background-color:#6082B6;
							padding: 20px;
							border-radius: 10px;
							box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
							display: flex;
							flex-direction: column;
							
							
						}
						form label {
							display: block;
							width: calc(100% - 40px);
							margin: 10px auto;
							padding: 10px;
							border: none;
							border-radius: 5px;
							
						}
						form input {
							display: block;
							width: calc(100% - 40px);
							margin: 10px auto;
							padding: 10px;
							border: none;
							border-radius: 5px;
							border:1px solid black;
						}
						form input[type="submit"] {
							background-color: rgba(0, 0, 0, 0.3);
							color: white;
							cursor: pointer;
							transition: background-color 0.3s;
							grid-column: span 3;
							padding: 10px;
							border: 1px solid black;
							width: 100%;
							border-radius: 5px;
							
						}
						form input[type="submit"]:hover {
							background-color: rgba(0, 0, 0, 0.3);
							border: 1px solid black;
						}
						.links {
							text-align: center;
							margin-top: 10px;
						}
						.links a {
							color: #ffeb3b;
							text-decoration: none;
							margin: 0 5px;
						}
						nav {
							background-color:#6082B6;
							border-bottom:2px solid black;
							padding: 10px;
							text-align: center;
							font-size:15px;
							text-decoration:bold;
						}
						nav a {
							color: black;
							
							margin: 0 15px;
							text-decoration: none;
							font-weight: bold;
							transition: color 0.3s;
						}
						nav a.header {
							color:white; /* Active color */
							
						}
					</style>
				</head>
				<body>
					<nav>
						<a href="#" class="header">SM REPORTING</a>
					</nav>
					<div class="container">
						<form action="/login" method="POST">
							<label for="uname">Username:</label>
							<input type="text" id="uname" name="uname" required>
							<label for="password">Password:</label>
							<input type="password" id="password" name="password" required>
							<input type="submit" value="Login">
						</form>
					</div>
				</body>
				</html>
			`);
	    } else if (req.method === 'POST' && req.url === '/login') {
	        // Handle the login form submission
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const postData = querystring.parse(body);

	            // Validate the form data
	            if (!postData.uname || !postData.password) {
	                res.writeHead(400, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('Invalid input');
	                return;
	            }

	            // Authenticate the user
	            let connection;
	            try {
	                connection = await oracledb.getConnection(dbConfigFetch);
	                const result = await connection.execute(
	                    `SELECT role, HOST, DBPORT, SID, DBPASSWORD, DBUSERNAME FROM SMREPORTING_USERS WHERE username = :uname AND password = :password`, {
	                        uname: postData.uname,
	                        password: postData.password
	                    }
	                );

	                if (result.rows.length > 0) {
	                    const userRole = result.rows[0][0];
	                    const dbDetails = {
	                        host: result.rows[0][1],
	                        dbport: result.rows[0][2],
	                        sid: result.rows[0][3],
	                        dbPassword: result.rows[0][4],
	                        dbUsername: result.rows[0][5]
	                    };

	                    // Store username and dbDetails in session
	                    const sessionId = Math.random().toString(36).substring(2);
	                    sessions[sessionId] = {
	                        username: postData.uname,
	                        dbDetails
	                    };

	                    // Set cookie with session ID
	                    res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly`);

	                    if (userRole === 'User') {
	                        res.writeHead(200, {
	                            'Content-Type': 'text/html'
	                        });
	                        res.end(`
								<html>
								<head>
									<script>
										window.location.href = "/user";
									</script>
								</head>
								<body></body>
								</html>
							`);
	                    } else if (userRole === 'Admin') {
	                        res.writeHead(200, {
	                            'Content-Type': 'text/html'
	                        });
	                        res.end(`
								<html>
								<head>
									<script>
										window.location.href = "/admin";
									</script>
								</head>
								<body></body>
								</html>
							`);
	                    } else {
	                        res.writeHead(403, {
	                            'Content-Type': 'text/plain'
	                        });
	                        res.end('Access denied');
	                    }
	                } else {
	                    res.writeHead(401, {
	                        'Content-Type': 'text/plain'
	                    });
	                    res.end('Invalid credentials');
	                }
	            } catch (err) {
	                console.error(err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('Database error');
	            } finally {
	                if (connection) {
	                    try {
	                        await connection.close();
	                    } catch (err) {
	                        console.error(err);
	                    }
	                }
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/register') {
	        // Serve the HTML for the registration page
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        res.end(`
				<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register</title>
    <style>
        body {
			font-family: Arial, sans-serif;
			background: #B6D0E2;
			color: #fff;
			margin: 0;
			padding: 0;
		}
        .container {
            max-width: 900px; /* Adjusted for three columns */
            margin: auto;
            padding: 20px;
        }
        
		form {
							background-color:  #6082B6;
							padding: 20px;
							border-radius: 10px;
							box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
							display: flex;
							justify-content: space-between;
							flex-wrap: wrap; /* Allow wrapping for smaller screens */
							
							
						}
        .form-column {
            flex: 1;
            padding: 0 10px; /* Adjusted padding for space between columns */
            margin-bottom: 20px; /* Added margin between groups */
        }
        form label{
            display: block;
            width: calc(100% - 20px); /* Adjusted width to consider padding */
            margin: 10px auto;
            padding: 10px;
            border: none;
            border-radius: 5px;
        }
		form input {
							display: block;
							width: calc(100% - 40px);
							margin: 10px auto;
							padding: 10px;
							border: none;
							border-radius: 5px;
							border:1px solid black;
						}
		form select {
							display: block;
							width: calc(100% - 40px);
							margin: 10px auto;
							padding: 10px;
							border: none;
							border-radius: 5px;
							border:1px solid black;
						}
        form input[type="submit"] {
			background-color: rgba(0, 0, 0, 0.3);
			color: white;
			cursor: pointer;
			transition: background-color 0.3s;
			grid-column: span 3;
			padding: 10px;
			border: 1px solid black;
			width: 100%;
			border-radius: 5px;
			
		}
		form input[type="submit"]:hover {
			background-color: rgba(0, 0, 0, 0.3);
			border: 1px solid black;
		}
        }
        .links {
            text-align: center;
            margin-top: 10px;
        }
        .links a {
            color: #ffeb3b;
            text-decoration: none;
            margin: 0 5px;
        }
        nav {
							background-color:#6082B6;
							border-bottom:2px solid black;
							padding: 10px;
							text-align: center;
							font-size:15px;
							text-decoration:bold;
						}
						nav a {
							color: black;
							
							margin: 0 15px;
							text-decoration: none;
							font-weight: bold;
							transition: color 0.3s;
						}
						nav a.header {
							color:black; /* Active color */
							
						}
    </style>
</head>
<body>
    <nav>
        <a href="#" class="header">SM REPORTING</a>
    </nav>
    <div class="container">
        <form action="/registeruser" method="POST">
            <div class="form-column">
                <label for="uname" style="padding: 10px;">Username:</label>
                <input type="text" id="uname" name="uname" style="padding: 10px;" required>
                <label for="password" style="padding: 10px;">Password:</label>
                <input type="password" id="password" name="password" style="padding: 10px;" required>				
				<label for="dbsid" style="padding: 10px;">Database SID:</label>
                <input type="text" id="dbsid" name="dbsid" style="padding: 10px;" required>
            </div>
            <div class="form-column">
                <label for="role" style="padding: 10px;">Role:</label>
                <select id="role" name="role" style="padding: 10px;">
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                </select>
                
                <label for="dob" style="padding: 10px;">DOB (YYYYMMDD):</label>
                <input type="text" id="dob" name="dob" style="padding: 10px;" required>
				<label for="dbusername" style="padding: 10px;">Database Username:</label>
                <input type="text" id="dbusername" name="dbusername" style="padding: 10px;" required>
            </div>
            <div class="form-column">
                <label for="port" style="padding: 10px;">PORT:</label>
                <input type="text" id="port" name="port" style="padding: 10px;" required>
                <label for="host" style="padding: 10px;">HOST:</label>
                <input type="text" id="host" name="host" style="padding: 10px;" required>                
                <label for="dbpassword" style="padding: 10px;">Database Password:</label>
                <input type="text" id="dbpassword" name="dbpassword" style="padding: 10px;" required>                
            </div>
            <input type="submit" value="Register" style="padding: 10px;">
        </form>
    </div>
</body>
</html>




			`);
	    } else if (req.method === 'GET' && req.url === '/forgotpass') {

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        res.end(`
			   <!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Forgot Password</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				background: linear-gradient(to right, #6a11cb, orange);
				color: #fff;
				margin: 0;
				padding: 0;
			}
			.container {
				max-width: 400px;
				margin: auto;
				padding: 20px;
			}
			form {
				background-color: rgba(255, 255, 255, 0.2);
				padding: 20px;
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
				display: flex;
				flex-direction: column;
			}
			form label, form input {
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
			}
			form input[type="submit"]:hover {
				background-color: #45a049;
			}
			.links {
				text-align: center;
				margin-top: 10px;
			}
			.links a {
				color: #ffeb3b;
				text-decoration: none;
				margin: 0 5px;
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
			nav a.header {
				color: #00ff00; /* Active color */
			}
		</style>
	</head>
	<body>
		<nav>
			<a href="#" class="header">SM REPORTING</a>
		</nav>
		<div class="container">
			<form action="/forgot-password" method="POST">
				<label for="email">Email:</label>
				<input type="email" id="email" name="email" required>
				<input type="submit" value="Reset Password">
			</form>
			<div class="links">
				<a href="/">Login</a> | <a href="/register">Create Account</a>
			</div>
		</div>
	</body>
	</html>

			`);
	    } else if (req.method === 'POST' && req.url === '/registeruser') {
	        // Handle the registration form submission
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const postData = querystring.parse(body);

	            // Validate the form data
	            if (!postData.uname || !postData.password || !postData.role || !postData.dob || !postData.host || !postData.dbusername || !postData.port || !postData.dbsid || !postData.dbpassword) {
	                res.writeHead(400, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('Invalid input');
	                return;
	            }

	            // Register the new user
	            let connection;
	            try {
	                connection = await oracledb.getConnection(dbConfigSMRS);
	                await connection.execute(
	                    `INSERT INTO SMREPORTING_USERS (username, password, role, dob, host, dbport, sid, dbpassword, dbusername) VALUES (:uname, :password, :role, :dob, :host, :dbport, :dbsid, :dbpassword, :dbusername)`, {
	                        uname: postData.uname,
	                        password: postData.password,
	                        role: postData.role,
	                        dob: postData.dob,
	                        host: postData.host,
	                        dbport: postData.port,
	                        dbsid: postData.dbsid,
	                        dbpassword: postData.dbpassword,
	                        dbusername: postData.dbusername
	                    }, {
	                        autoCommit: true
	                    }
	                );
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(`
                <html>
                <head>
                    <script>
                        window.location.href = "/";
                    </script>
                </head>
                <body></body>
                </html>
            `);
	            } catch (err) {
	                console.error(err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('Database error');
	            } finally {
	                if (connection) {
	                    try {
	                        await connection.close();
	                    } catch (err) {
	                        console.error(err);
	                    }
	                }
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/user') {

	        
			if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        // Serve the HTML form for selecting report name and date along with an iframe
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const reportOptionsHTML = await createReportSelectHTML(req);
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
				background: #B6D0E2;
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
			form {
				background-color:#6082B6; 																							
				padding: 20px;
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
				margin-bottom: 20px;
				color:white;
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
				background-color: rgba(0, 0, 0, 0.3);
				color: white;
				cursor: pointer;
				transition: background-color 0.3s;
				grid-column: span 3;
				padding: 10px;
				border: none;
				width: 100%;
				border-radius: 5px;
				border: 2px solid black;
			}
			form input[type="submit"]:hover {
				background-color: rgba(0, 0, 0, 0.3);
				border: 2px solid black;
			}
			iframe {
				background-color: #6082B6;
				width: 100%;
				height: 400px;
				
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
		<a href="/user" class="active">VIEW REPORT</a>
		<a href="/viewtabledata">VIEW TABLE DATA</a>
		<a href="/userd">VIEW Dashboard</a>
		<a href="#" >user: ${username}</a>
		<a href="/logoff" >logout</a>
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
				<input type="date" id="from-date" name="from-date" >
			</div>
			<div>
				<label for="to-date">To Date:</label>
				<input type="date" id="to-date" name="to-date" >
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
	            let fromDate = params.get('from-date');
	            let toDate = params.get('to-date');

	            // Check if From Date is empty, assign current date if it is
	            if (!fromDate) {
	                const currentDate = new Date();
	                const year = currentDate.getFullYear();
	                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
	                const day = String(currentDate.getDate()).padStart(2, '0');
	                fromDate = `${year}-${month}-${day}`;
	            }

	            // Check if To Date is empty, assign current date if it is
	            if (!toDate) {
	                const currentDate = new Date();
	                const year = currentDate.getFullYear();
	                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
	                const day = String(currentDate.getDate()).padStart(2, '0');
	                toDate = `${year}-${month}-${day}`;
	            }

	            // Convert date format from yyyy-MM-dd to dd-MM-yyyy
	            const [year1, month1, day1] = fromDate.split('-');
	            const formattedfromDate = `${day1}-${month1}-${year1}`;
	            const [year2, month2, day2] = toDate.split('-');
	            const formattedtoDate = `${day2}-${month2}-${year2}`;

	            // Parse cookies from request
	            const cookies = parseCookies(req);

	            // Retrieve username and dbDetails from session
	            const sessionId = cookies.sessionId;
	            const session = sessions[sessionId];
	            const username = session ? session.username : '';
	            const dbDetails = session ? session.dbDetails : null;

	            const {
	                host,
	                dbport,
	                sid,
	                dbUsername,
	                dbPassword
	            } = dbDetails;
	            const dbConfig = {
	                user: dbUsername,
	                password: dbPassword,
	                connectString: `${host}:${dbport}/${sid}`
	            };

	            try {
	               // Fetch the query from the `testing1` table
				const connection = await oracledb.getConnection(dbConfigSMRS);
				const result1 = await connection.execute(`
					SELECT CREATED_QUERY  FROM SMREPORTING_REPORTS_DETAILS WHERE report_name = :reportName
				`, [reportName]);

				if (result1.rows.length === 0) {
					throw new Error('No query found for the selected report name.');
				}

				let query = result1.rows[0][0];
				query = query.replace(/\+fromdate\+/g, `TO_DATE('${formattedfromDate}', 'DD-MM-YYYY')`);
				query = query.replace(/\+todate\+/g, `TO_DATE('${formattedtoDate}', 'DD-MM-YYYY')`);

				// Log the constructed query for debugging
				console.log('Constructed Query:', query);

	                // Release the connection for presales
	                await connection.close();

	                // Execute the fetched query with the replaced date
	                const connection2 = await oracledb.getConnection(dbConfig);
	                const result2 = await connection2.execute(query);

	                // Generate HTML for the table with the report name and date range
	                const tableHTML = createTableHTML(result2, reportName, fromDate, toDate);

	                // Serve the HTML response with the table
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(tableHTML);

	                // Release the connection for workshop
	                await connection2.close();
	            } catch (err) {
	                console.error('Error executing query:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('An error occurred while fetching data.');
	            }
	        });
	    }else if (req.method === 'GET' && req.url === '/userd') {

	        if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        // Serve the HTML form for selecting report name and date along with an iframe
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const reportOptionsHTML = await createDashboardSelectHTML(req);
	        res.end(`
		   <!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>View Dashboard</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				background: #B6D0E2;
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
			form {
				background-color:#6082B6; 
				color:white;
				padding: 20px;
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
				background-color: rgba(0, 0, 0, 0.3);
				color: white;
				cursor: pointer;
				transition: background-color 0.3s;
				grid-column: span 3;
				padding: 10px;
				border: none;
				width: 100%;
				border: 2px solid black;
				border-radius: 5px;
			}
			form input[type="submit"]:hover {
            background-color: rgba(0, 0, 0, 0.3);
			border: 2px solid black;
        }
			iframe {
				width: 100%;
				background-color:#6082B6; 
				height: 400px;
				
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
		<a href="/user">VIEW REPORT</a>
		<a href="/viewtabledata">VIEW TABLE DATA</a>
		<a href="/userd" class="active">VIEW Dashboard</a>
		<a href="#" >user: ${username}</a>
		<a href="/logoff" >logout</a>
	</nav>
	<div class="container">
		<form action="/fetch-ddata" method="post" target="data-iframe">
			<div>
				<label for="dashboard-name">Select Dashboard:</label>
				<select name="dashboard-name" id="dashboard-name">
					<option>Select</option>
					${reportOptionsHTML}
				</select>
			</div>
			<div>
				<label for="fetch-ddata">From Date:</label>
				<input type="date" id="from-date" name="from-date" >
			</div>
			<div>
				<label for="to-date">To Date:</label>
				<input type="date" id="to-date" name="to-date" >
			</div>
			<input type="submit" value="View Dashboard">
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
	    } else if (req.method === 'POST' && req.url === '/fetch-ddata') {
			
			
			 // Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const userName = session ? session.username : '';
	        // Handle form submission to fetch and display data
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const dashboardName = params.get('dashboard-name');
	            let fromDate = params.get('from-date');
	            let toDate = params.get('to-date');

	            if (!fromDate) {
	                const currentDate = new Date();
	                fromDate = currentDate.toISOString().split('T')[0];
	            }

	            if (!toDate) {
	                const currentDate = new Date();
	                toDate = currentDate.toISOString().split('T')[0];
	            }

	            const [year1, month1, day1] = fromDate.split('-');
	            const formattedFromDate = `${day1}-${month1}-${year1}`;
	            const [year2, month2, day2] = toDate.split('-');
	            const formattedToDate = `${day2}-${month2}-${year2}`;

	            try {
	                // Fetch the user's database configuration
	                const connection = await oracledb.getConnection(dbConfigSMRS);
	                const userQueryResult = await connection.execute(`
                SELECT HOST, DBPORT, SID, DBPASSWORD, DBUSERNAME 
                FROM SMREPORTING_USERS 
                WHERE username = :userName
            `, [userName]);

	                if (userQueryResult.rows.length === 0) {
	                    throw new Error('No database configuration found for the selected user.');
	                }

	                const userConfig = userQueryResult.rows[0];
	                const dbConfig = {
	                    user: userConfig[4],
	                    password: userConfig[3],
	                    connectString: `${userConfig[0]}:${userConfig[1]}/${userConfig[2]}`
	                };

	                // Fetch the query from the SMREPORTING_REPORTS_DETAILS table
	                const queryResult = await connection.execute(`
                SELECT CREATED_QUERY  
                FROM SMREPORTING_DASHBOARDS_DETAILS 
                WHERE dashboard_name = :dashboardName
            `, [dashboardName]);

	                const visualResult = await connection.execute(`
                SELECT VISUALISED_TYPE  
                FROM SMREPORTING_DASHBOARDS_DETAILS 
                WHERE dashboard_name = :dashboardName
            `, [dashboardName]);

	                if (queryResult.rows.length === 0) {
	                    throw new Error('No query found for the selected report name.');
	                }

	                if (visualResult.rows.length === 0) {
	                    throw new Error('No visual type found for the selected dashboard name.');
	                }

	                let vtype = visualResult.rows[0][0];

	                let query = queryResult.rows[0][0];

	                query = query.replace(/\+fromdate\+/g, `TO_DATE('${formattedFromDate}', 'DD-MM-YYYY')`);
	                query = query.replace(/\+todate\+/g, `TO_DATE('${formattedToDate}', 'DD-MM-YYYY')`);

	                // Log the constructed query for debugging
	                console.log('Constructed Query:', query);

	                await connection.close();

	                const userConnection = await oracledb.getConnection(dbConfig);
	                const reportResult = await userConnection.execute(query);

	                const metaData = reportResult.metaData;

	                let tableHTML;
	                if (metaData.length === 1) {
	                    tableHTML = createDashboardHTMLOne(reportResult, dashboardName, vtype, fromDate, toDate);
	                } else {
	                    tableHTML = createDashboardHTMLTwo(reportResult, dashboardName, vtype, fromDate, toDate);
	                }


	                // Serve the HTML response with the table
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(tableHTML);

	                // Release the connection for workshop
	                await userConnection.close();
	            } catch (err) {
	                console.error('Error executing query:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('An error occurred while fetching data.');
	            }
	        });
	    } else if (req.method === 'POST' && req.url === '/fetch-data-admin') {
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const userName = params.get('user-name');
	            const reportName = params.get('report-name');
	            let fromDate = params.get('from-date');
	            let toDate = params.get('to-date');

	            if (!fromDate) {
	                const currentDate = new Date();
	                fromDate = currentDate.toISOString().split('T')[0];
	            }

	            if (!toDate) {
	                const currentDate = new Date();
	                toDate = currentDate.toISOString().split('T')[0];
	            }

	            const [year1, month1, day1] = fromDate.split('-');
	            const formattedFromDate = `${day1}-${month1}-${year1}`;
	            const [year2, month2, day2] = toDate.split('-');
	            const formattedToDate = `${day2}-${month2}-${year2}`;

	            try {
	                // Fetch the user's database configuration
	                const connection = await oracledb.getConnection(dbConfigSMRS);
	                const userQueryResult = await connection.execute(`
                SELECT HOST, DBPORT, SID, DBPASSWORD, DBUSERNAME 
                FROM SMREPORTING_USERS 
                WHERE username = :userName
            `, [userName]);

	                if (userQueryResult.rows.length === 0) {
	                    throw new Error('No database configuration found for the selected user.');
	                }

	                const userConfig = userQueryResult.rows[0];
	                const dbConfig = {
	                    user: userConfig[4],
	                    password: userConfig[3],
	                    connectString: `${userConfig[0]}:${userConfig[1]}/${userConfig[2]}`
	                };

	                 // Fetch the query from the SMREPORTING_REPORTS_DETAILS table
            const queryResult = await connection.execute(`
                SELECT CREATED_QUERY  
                FROM SMREPORTING_REPORTS_DETAILS 
                WHERE report_name = :reportName
            `, [reportName]);

            if (queryResult.rows.length === 0) {
                throw new Error('No query found for the selected report name.');
            }

            let query = queryResult.rows[0][0];
            query = query.replace(/\+fromdate\+/g, `TO_DATE('${formattedFromDate}', 'DD-MM-YYYY')`);
            query = query.replace(/\+todate\+/g, `TO_DATE('${formattedToDate}', 'DD-MM-YYYY')`);

            // Log the constructed query for debugging
            console.log('Constructed Query:', query);

	                await connection.close();

	                const userConnection = await oracledb.getConnection(dbConfig);
	                const reportResult = await userConnection.execute(query);

	                const tableHTML = createTableHTML(reportResult, reportName, fromDate, toDate);

	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(tableHTML);

	                await userConnection.close();
	            } catch (err) {
	                console.error('Error executing query:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('An error occurred while fetching data.');
	            }
	        });
	    } else if (req.method === 'POST' && req.url === '/fetch-table-data') {
	        // Handle form submission to fetch and display data
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const tableName = params.get('table-name');

	            // Validate the table name to prevent SQL injection
	            const isValidTableName = /^[a-zA-Z0-9_]+$/.test(tableName);
	            if (!isValidTableName) {
	                res.writeHead(400, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('Invalid table name.');
	                return;
	            }

	            // Parse cookies from request
	            const cookies = parseCookies(req);

	            // Retrieve username and dbDetails from session
	            const sessionId = cookies.sessionId;
	            const session = sessions[sessionId];
	            const username = session ? session.username : '';
	            const dbDetails = session ? session.dbDetails : null;

	            const {
	                host,
	                dbport,
	                sid,
	                dbUsername,
	                dbPassword
	            } = dbDetails;
	            const dbConfig = {
	                user: dbUsername,
	                password: dbPassword,
	                connectString: `${host}:${dbport}/${sid}`
	            };

	            try {
	                // Construct the query string directly
	                const query = `SELECT * FROM ${tableName}`;

	                // Log the constructed query for debugging
	                console.log('Constructed Query:', query);

	                // Execute the constructed query
	                const connectionWorkshop = await oracledb.getConnection(dbConfig);
	                const resultWorkshop = await connectionWorkshop.execute(query);

	                // Generate HTML for the table with the report name and date range
	                const tableHTML = createTableDataHTML(resultWorkshop, tableName);

	                // Serve the HTML response with the table
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(tableHTML);

	                // Release the connection for workshop
	                await connectionWorkshop.close();
	            } catch (err) {
	                console.error('Error executing query:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('An error occurred while fetching data.');
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/viewtabledata') {

	        if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        // Serve the HTML for the PREPARE page
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const reportOptionsHTML = await DisplayColumnSelectHTML(req);

	        res.end(`
			<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>View Table Data</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				background: #B6D0E2;
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
			form {
				background-color: #6082B6;
				padding: 20px;
				color:white;
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
				margin-bottom: 20px;
				display: flex;
				flex-wrap: wrap;
				gap: 20px;
			}
			form label {
				display: block;
				margin-bottom: 5px;
			}
			form .form-group {
				flex: 1 1 50%; /* Ensures both select and submit button take 50% width */
				display: flex;
				flex-direction: column;
			}
			form select, form input {
				display: block;
				padding: 10px;
				border: none;
				border-radius: 5px;
				width: 100%; /* Ensure elements take full width within their flex container */
			}
			form input[type="submit"] {
				background-color: rgba(0, 0, 0, 0.3);
				color: white;
				cursor: pointer;
				transition: background-color 0.3s;
				border: 2px solid black;
			}
			form input[type="submit"]:hover {
				background-color: rgba(0, 0, 0, 0.3);
				border: 2px solid black;
			}
			iframe {
				width: 100%;
				height: 400px;
				background-color: #6082B6;
				border-radius: 10px;
				box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
					flex-direction: column;
				}
				form .form-group {
					flex: 1 1 100%; /* Ensures full width on smaller screens */
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
		<a href="/user">VIEW REPORT</a>
		<a href="/viewtabledata" class="active">VIEW TABLE DATA</a>
		<a href="/userd">VIEW Dashboard</a>
		<a href="#" >user: ${username}</a>
		<a href="/logoff" >logout</a>
	</nav>
	<div class="container">
		<form action="/fetch-table-data" method="post" target="data-iframe">
			<div class="form-group">
				<label for="table-name">Select Table:</label>
				<select name="table-name" id="table-name">
					<option>Select</option>
					${reportOptionsHTML}
				</select>
				
			</div>
			<div class="form-group">
				<input type="submit" id="SUB" value="View Table Data">
			</div>
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
	    } else if (req.method === 'GET' && req.url === '/logoff') {
	        // Check if user is authenticated
	        if (isAuthenticated(req)) {
	            const cookies = parseCookies(req);
	            const sessionId = cookies.sessionId;
	            // Remove session from sessions object
	            delete sessions[sessionId];
	        }
	        // Redirect to login page
	        res.writeHead(302, {
	            'Location': '/'
	        });
	        res.end();
	    } else if (req.method === 'GET' && req.url === '/admin') {

	        // Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const userNameFetch = await createReportNameSelectHTML();
	        const tableReportData = await getReportColumnData();

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
            background:#B6D0E2; /* linear-gradient(to right, #6a11cb, orange) */
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
        .dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
        form {
            background-color: #6082B6;
            padding: 20px;
            border-radius: 10px;
			color:white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
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
            background-color: rgba(0, 0, 0, 0.3);
            color: white;
            cursor: pointer;
            transition: background-color 0.3s;
            grid-column: span 3;
            padding: 10px;
            border: 2px solid black;
            width: 847px;
            border-radius: 5px;
        }
        form input[type="submit"]:hover {
            background-color: rgba(0, 0, 0, 0.3);
			border: 2px solid black;
        }
        iframe {
			background-color: #6082B6;
			
            width: 100%;
            height: 400px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
    <script>
        const tableReportData = ${JSON.stringify(tableReportData)};

        document.addEventListener('DOMContentLoaded', () => {
            const userSelect = document.getElementById('user-name');
            const reportSelect = document.getElementById('report-name');

            userSelect.addEventListener('change', () => {
                const selectedUser = userSelect.value;
                const report = tableReportData[selectedUser] || [];

                reportSelect.innerHTML = report.map(column => 
                    \`<option value="\${column}">\${column}</option>\`
                ).join('');
            });
        });
    </script>
</head>
<body>
    <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin" class="active">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">EXCEL REPORT</a>
            <div class="dropdown-content">
				<a href="/ecreate" class="active">CREATE REPORT</a>
            </div>
		</div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
    <div class="container">
        <form action="/fetch-data-admin" method="post" target="data-iframe">
            <div>
                <label for="user-name">Select User:</label>
                <select name="user-name" id="user-name">
                    <option>Select</option>
                    ${userNameFetch}
                </select>
            </div>
            <div>
                <label for="report-name">Select Report:</label>
                <select name="report-name" id="report-name"></select>
            </div>
            <div>
                <label for="from-date">From Date:</label>
                <input type="date" id="from-date" name="from-date">
            </div>
            <div>
                <label for="to-date">To Date:</label>
                <input type="date" id="to-date" name="to-date">
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
	    } else if (req.method === 'GET' && req.url === '/create') {

	        if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        // Serve the HTML for the CREATE page
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });

	        const reportOptionsHTML = await createAvailableUserSelectHTML();
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
            background:#B6D0E2; /* linear-gradient(to right, #6a11cb, orange) */
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
					.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
					form {
						background-color: #6082B6;
						padding: 20px;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
						margin-bottom: 20px;
						display: flex;
						flex-wrap: wrap;
						justify-content: space-between;
					}
					.form-left, .form-right {
						flex: 1;
						min-width: 300px; /* Ensures proper alignment on smaller screens */
					}
					form label, form select, form input {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						border: none;
						border-radius: 5px;
					}
					form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						height:150px;
						border: none;
						border-radius: 5px;
					}
					form input[type="submit"] {
						background-color: rgba(0, 0, 0, 0.3);
						color: white;
						cursor: pointer;
						transition: background-color 0.3s;
						width: calc(100% - 40px);
						border: 2px solid black;
						margin: 10px auto;
					}
					form input[type="submit"]:hover {
						background-color: rgba(0, 0, 0, 0.3);
						border: 2px solid black;
					}
					iframe {
						background-color: #6082B6;
						
						width: 100%;
						height: 400px;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
				
			</head>
			<body>
				<nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create" class="active">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
				<div class="container">
					<form action="/create-report" method="post" target="query-iframe">
						<div class="form-left">
							<label for="report-name">Enter Report Name:</label>
							<input name="report-name" id="report-name" placeholder="Report Name" required>
							<label for="user-name">Available Users:</label>
							<select name="user-name" id="user-name">
								<option>Select</option>${reportOptionsHTML}
							</select>
							<input type="submit" value="Create Report">
						</div>
						<div class="form-right">
							<label for="query-text">Write your query:</label>
							<textarea id="query-text" name="query-text" rows="5" required></textarea>
						</div>
						
					</form>
					<iframe name="query-iframe"></iframe>
				</div>
				
				
				
			</body>
			</html>

        `);
	    } else if (req.method === 'POST' && req.url === '/create-report') {
	        // Handle form submission to insert and display data
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const reportName = params.get('report-name');
	            const queryText = params.get('query-text');
	            const userName = params.get('user-name');

	            try {
	                // Fetch the connection
	                const connection = await oracledb.getConnection(dbConfigSMRS);

	                // Check if the report already exists
	                const checkResult = await connection.execute(`
                SELECT COUNT(*) AS COUNT FROM SMREPORTING_REPORTS_DETAILS WHERE report_name = :reportName
            `, [reportName]);

	                const reportExists = checkResult.rows[0][0] > 0;

	                if (reportExists) {
	                    // If the report already exists, return a message
	                    res.writeHead(200, {
	                        'Content-Type': 'text/html'
	                    });
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
	                    const insertResult = await connection.execute(`
                    INSERT INTO SMREPORTING_REPORTS_DETAILS 
                    VALUES (:reportName, :queryText, :userName, TO_DATE(SYSDATE, 'dd-MM-yyyy'))
                `, [reportName, queryText, userName]);

	                    await connection.commit(); // Commit the transaction

	                    res.writeHead(200, {
	                        'Content-Type': 'text/html'
	                    });
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

	                await connection.close();
	            } catch (err) {
	                console.error('Error during report creation:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/html'
	                });
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
	    } else if (req.method === 'GET' && req.url === '/delete') {

	        
			if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const userNameFetch = await createReportNameSelectHTML();
	        const tableReportData = await getReportColumnData();
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
					background: #B6D0E2;
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
					background-color: #6082B6;
					border-bottom:2px solid black;
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
					color: blue; /* Hover color */
				}
				nav a.header {
					color: blue; /* Active color */
				}
				nav a.active {
					color: blue; /* Active color */
				}
				
				.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
				form {
					background-color: #6082B6;
					padding: 20px;
					border-radius: 10px;
					box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
					background-color: rgba(0, 0, 0, 0.3);
					color: white;
					cursor: pointer;
					transition: background-color 0.3s;
					grid-column: span 3;
					padding: 10px;
					border: none;					
					width: 100%;
					border: 2px solid black;
					border-radius: 5px;
				}
				form input[type="submit"]:hover {
				background-color: rgba(0, 0, 0, 0.3);
				border: 2px solid black;
				}
				iframe {
					background-color: #6082B6;
					
					width: 100%;
					height: 400px;
					border-radius: 10px;
					box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
			<script>
                    const tableReportData = ${JSON.stringify(tableReportData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const userSelect = document.getElementById('user-name');
                        const reportSelect = document.getElementById('report-name');

                        userSelect.addEventListener('change', () => {
                            const selectedUser = userSelect.value;
                            const report = tableReportData[selectedUser] || [];

                            reportSelect.innerHTML = report.map(column => 
                                \`<option value="\${column}">\${column}</option>\`
                            ).join('');
                        });
                    });
                </script>
            </head>
            <body>
                <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete" class="active">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
                <div class="container">
                    
					<form action="/delete-report" method="post" target="query-iframe">
						<div>
							<label for="user-name">Select User:</label>
							<select name="user-name" id="user-name">
								<option>Select</option>
								${userNameFetch}	
							</select>
						</div>
						<div>
							<label for="report-name">Select Report:</label>
							<select name="report-name" id="report-name">							
							</select>
						</div>
						<div>
						<br>
							<input type="submit" value="Delete Report">
						</div>
                        
                    </form>
                    <iframe name="query-iframe"></iframe>
                    
                </div>
            </body>
            </html>
        `);
	    } else if (req.method === 'POST' && req.url === '/delete-report') {
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const reportName = params.get('report-name');
	            const confirmDelete = params.get('confirm-delete');

	            if (confirmDelete === 'yes') {
	                // Proceed with the deletion
	                try {
	                    const connectionPresales = await oracledb.getConnection(dbConfigSMRS);
	                    const resultPresales = await connectionPresales.execute(`
                    DELETE FROM SMREPORTING_REPORTS_DETAILS WHERE report_name = :reportName
                `, [reportName]);

	                    await connectionPresales.commit(); // Commit the transaction
	                    await connectionPresales.close();

	                    res.writeHead(200, {
	                        'Content-Type': 'text/html'
	                    });
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
	                    res.writeHead(500, {
	                        'Content-Type': 'text/html'
	                    });
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
	            } else {
	                // Show confirmation page
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
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
                        a {
                            color: #ffeb3b;
                            text-decoration: none;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    <div class="message-container">
                        <h1>Are you sure you want to delete the report "${reportName}"?</h1>
                        <form action="/delete-report" method="post">
                            <input type="hidden" name="report-name" value="${reportName}">
                            <button type="submit" name="confirm-delete" value="yes">Yes</button>
                            <button type="submit" name="confirm-delete" value="no">No</button>
                        </form>
                    </div>
                </body>
                </html>
            `);
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/update') {
			
			
			
			if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
	        const reportOptionsHTML = await createReportSelectHTML(req);
	        const {
	            optionsHTML,
	            reportData
	        } = await createQuerySelectHTML();
	        const tableColumnData = await userGetTableColumnData();
	        const reportOptionsHTML1 = await userCreateColumnSelectHTML();
	        const userNameFetch = await createReportNameSelectHTML();
	        const tableReportData = await getReportColumnData();

	        // Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
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
						background:#B6D0E2;
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
					
					.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
					form {
						background-color:#6082B6;
						padding: 20px;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
						margin-bottom: 20px;
						display: flex;
						flex-wrap: wrap;
						justify-content: space-between;
					}
					.form-left, .form-right {
						flex: 1;
						min-width: 300px; /* Ensures proper alignment on smaller screens */
					}
					form label, form select, form input {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						border: none;
						border-radius: 5px;
					}
					form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						height:280px;
						border: none;
						border-radius: 5px;
					}                
					form input[type="submit"] {
						background-color: rgba(0, 0, 0, 0.3);
						color: white;
						cursor: pointer;
						transition: background-color 0.3s;
						width: calc(100% - 40px);
						margin: 10px auto	;
						border: 2px solid black;
					}
					form input[type="submit"]:hover {
						background-color: rgba(0, 0, 0, 0.3);
						border: 2px solid black;
					}
					iframe {
			background-color: #6082B6;
			
            width: 100%;
            height: 400px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
    document.addEventListener('DOMContentLoaded', () => {
        const userSelect = document.getElementById('user-name');
        const tableSelect = document.getElementById('table-name');
        const columnSelect = document.getElementById('column-name');
        let tableColumnData = {}; // Define tableColumnData outside the event listener to make it accessible

        userSelect.addEventListener('change', async () => {
            console.log('Change event triggered');
            const selectedUser = userSelect.value;

            if (selectedUser) {
                tableColumnData = await fetchTableColumnData(selectedUser); // Update tableColumnData
                updateTableSelect(tableColumnData);
                columnSelect.innerHTML = ''; // Clear columns when user changes
            }
        });

        tableSelect.addEventListener('change', () => {
            const selectedTable = tableSelect.value;
            const columns = tableColumnData[selectedTable] || [];
            columnSelect.innerHTML = columns.map(column =>
                \`<option value="\${column}">\${column}</option>\`
            ).join('');
        });
		
		
		async function fetchTableColumnData(userName) {
        console.log(\`Fetching table and column data for user at fetchTableColumnData: \${userName}\`); // Add logging
        const response = await fetch(\`/api/userGetTableColumnData?user=\${userName}\`);
        return await response.json();
    }

    function updateTableSelect(data) {
        tableSelect.innerHTML = '<option value="">Select</option>' + Object.keys(data).map(table =>
            \`<option value="\${table}">\${table}</option>\`
        ).join('');
    }
		
		
    });

    
</script>
				
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
                    const tableReportData = ${JSON.stringify(tableReportData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const userSelect = document.getElementById('user-name');
                        const reportSelect = document.getElementById('report-name');

                        userSelect.addEventListener('change', () => {
                            const selectedUser = userSelect.value;
                            const report = tableReportData[selectedUser] || [];

                            reportSelect.innerHTML = '<option value="">Select</option>' + 							
								report.map(column => 
									\`<option value="\${column}">\${column}</option>\`
								).join('');
							
							
                        });
                    });
                </script>
            </head>
            <body>
                <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update" class="active">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
                <div class="container">
                    <form action="/update-report" method="POST" target="query-iframe">
						<div class="form-left">
							<label for="user-name">Select User:</label>
							<select name="user-name" id="user-name">
								<option>Select</option>${userNameFetch}	
							</select>
							
							<label for="report-name">Select Report:</label>
							<select name="report-name" id="report-name">
								
							</select>
							
							<label for="table-name">Available Tables:</label>
							<select name="table-name" id="table-name">
								
							</select>
							
							<label for="column-name">Available Columns:</label>
							<select id="column-name" name="column-name"></select>
							
						</div>
						
						<div class="form-right">
							<label for="query-text">Report Query:</label>
							<textarea id="query-text" name="query-text" rows="5" required></textarea>
						</div>
						<input type="submit" value ="Update Report">
						
                    </form>
                    <iframe name="query-iframe"></iframe>
                </div>
            </body>
            </html>
        `);
	    } else if (req.method === 'POST' && req.url === '/update-report') {
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

	                const connectionPresales = await oracledb.getConnection(dbConfigSMRS);

	                const checkResult = await connectionPresales.execute(
	                    `SELECT COUNT(*) AS COUNT FROM SMREPORTING_REPORTS_DETAILS WHERE report_name = :reportName`,
	                    [reportName]
	                );

	                const reportExists = checkResult.rows[0][0] > 0;

	                let message, statusCode;

	                if (reportExists) {
	                    const updateResult = await connectionPresales.execute(
	                        `UPDATE SMREPORTING_REPORTS_DETAILS SET created_query = :queryText WHERE report_name = :reportName`,
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

	                res.writeHead(statusCode, {
	                    'Content-Type': 'text/html'
	                });
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
	                res.writeHead(500, {
	                    'Content-Type': 'text/html'
	                });
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
	    } else if (req.method === 'GET' && req.url === '/prepare') {

	        
			if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        // Serve the HTML for the PREPARE page
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const reportOptionsHTML = await createReportSelectHTML(req);
	        const {
	            optionsHTML,
	            reportData
	        } = await createQuerySelectHTML();
	        const tableColumnData = await userGetTableColumnData();
	        const reportOptionsHTML1 = await userCreateColumnSelectHTML();
	        const userNameFetch = await createReportNameSelectHTML();
	        const tableReportData = await getReportColumnData();

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
                    background: #B6D0E2;
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
					background-color: #6082B6;
					border-bottom:2px solid black;
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
					color: blue; /* Hover color */
				}
				nav a.header {
					color: blue; /* Active color */
				}
				nav a.active {
					color: blue; /* Active color */
				}
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
				
				.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(0, 0, 0, 0.3);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
                form {
                    background-color: #6082B6;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                    margin-bottom: 20px;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                }
                .form-left, .form-right {
                    flex: 1;
                    min-width: 300px; /* Ensures proper alignment on smaller screens */
                }
                form label, form select, form input {
                    display: block;
                    width: calc(100% - 40px);
                    margin: 10px auto;
                    padding: 10px;
                    border: none;
                    border-radius: 5px;
                }
				form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						height:200px;
						border: none;
						border-radius: 5px;
					}
                form input[type="submit"] {
                    background-color: rgba(0, 0, 0, 0.3);
                    color: white;
                    cursor: pointer;
                    transition: background-color 0.3s;
					border: 2px solid black;
                    width: calc(100% - 40px);
                    margin: 10px auto;
                }
                form input[type="submit"]:hover {
					border: 2px solid black;
                    background-color:rgba(0, 0, 0, 0.3);
                }
                iframe {
			background-color: #6082B6;
			
            width: 100%;
            height: 400px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
			<script>
    document.addEventListener('DOMContentLoaded', () => {
        const userSelect = document.getElementById('user-name');
        const tableSelect = document.getElementById('table-name');
        const columnSelect = document.getElementById('column-name');
        let tableColumnData = {}; // Define tableColumnData outside the event listener to make it accessible

        userSelect.addEventListener('change', async () => {
            console.log('Change event triggered');
            const selectedUser = userSelect.value;

            if (selectedUser) {
                tableColumnData = await fetchTableColumnData(selectedUser); // Update tableColumnData
                updateTableSelect(tableColumnData);
                columnSelect.innerHTML = ''; // Clear columns when user changes
            }
        });

        tableSelect.addEventListener('change', () => {
            const selectedTable = tableSelect.value;
            const columns = tableColumnData[selectedTable] || [];
            columnSelect.innerHTML = columns.map(column =>
                \`<option value="\${column}">\${column}</option>\`
            ).join('');
        });
		
		
		async function fetchTableColumnData(userName) {
        console.log(\`Fetching table and column data for user at fetchTableColumnData: \${userName}\`); // Add logging
        const response = await fetch(\`/api/userGetTableColumnData?user=\${userName}\`);
        return await response.json();
    }

    function updateTableSelect(data) {
        tableSelect.innerHTML = '<option value="">Select</option>' + Object.keys(data).map(table =>
            \`<option value="\${table}">\${table}</option>\`
        ).join('');
    }
		
		
    });

    
</script>
        </head>
        <body>
            <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare" class="active">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
            <div class="container">
                <form action="/prepare-query" method="post" target="data-iframe">
                    <div class="form-left">
                        <label for="user-name">Select User:</label>
						<select name="user-name" id="user-name">
							<option>Select</option>${userNameFetch}	
						</select>											
						
						<label for="table-name">Available Tables:</label>
						<select name="table-name" id="table-name">
							
						</select>
						
						<label for="column-name">Available Columns:</label>
						<select id="column-name" name="column-name"></select>
                        
                    </div>
                    <div class="form-right">
                        
						<label for="query-text">Write your query:</label>
                        <textarea id="query-text" name="query-text" rows="5" required></textarea>
                    </div>
					<input type="submit" value="Prepare Report">
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
	    } else if (req.method === 'POST' && req.url === '/prepare-query') {
	        // Handle form submission to fetch and display data
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const query = params.get('query-text');
	            const userName = params.get('user-name');

	            try {

	                // Fetch the user's database configuration
	                const connection = await oracledb.getConnection(dbConfigSMRS);
	                const userQueryResult = await connection.execute(`
                SELECT HOST, DBPORT, SID, DBPASSWORD, DBUSERNAME 
                FROM SMREPORTING_USERS 
                WHERE username = :userName
            `, [userName]);

	                if (userQueryResult.rows.length === 0) {
	                    throw new Error('No database configuration found for the selected user.');
	                }

	                const userConfig = userQueryResult.rows[0];
	                const dbConfig = {
	                    user: userConfig[4],
	                    password: userConfig[3],
	                    connectString: `${userConfig[0]}:${userConfig[1]}/${userConfig[2]}`
	                };

	                // Log the constructed query for debugging
	                console.log('Prepared Query:', query);

	                // Execute the fetched query with the replaced date
	                const userconnection = await oracledb.getConnection(dbConfig);
	                const resultUser = await userconnection.execute(query);

	                // Generate HTML for the table with the report name and date range
	                const tableHTML = createQueryHTML(resultUser);

	                // Serve the HTML response with the table
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(tableHTML);

	                // Release the connection for workshop
	                await userconnection.close();
	            } catch (err) {
	                console.error('Error executing query:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('An error occurred while fetching data.');
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/dcreate') {

	        
			 if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	       

	        // Serve the HTML for the CREATE page
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });

	        const reportOptionsHTML = await createAvailableUserSelectHTML();
	        res.end(`
            <!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Create Dashboard</title>
				
				<style>
					body {
						font-family: Arial, sans-serif;
						background: #B6D0E2;
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
					.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
					form {
						background-color: #6082B6; 
						padding: 20px;
						color:white;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
						margin-bottom: 20px;
						display: flex;
						flex-wrap: wrap;
						justify-content: space-between;
					}
					.form-left, .form-right {
						flex: 1;
						min-width: 300px; /* Ensures proper alignment on smaller screens */
					}
					form label, form select, form input {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						border: none;
						border-radius: 5px;
					}
					form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						height:200px;
						border: none;
						border-radius: 5px;
					}
					form input[type="submit"] {
						background-color: rgba(0, 0, 0, 0.3);
						color: white;
						cursor: pointer;
						transition: background-color 0.3s;
						width: calc(100% - 40px);
						margin: 10px auto;
						border: 2px solid black;
					}
					form input[type="submit"]:hover {
						background-color: rgba(0, 0, 0, 0.3);
						border: 2px solid black;
					}
					iframe {
						width: 100%;
						height: 400px;
						background-color: #6082B6;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
				
			</head>
			<body>
				<nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate" class="active">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
				<div class="container">
					<form action="/create-dashboard" method="post" target="query-iframe">
						<div class="form-left">
							<label for="dashboard-name">Enter Dashboard Name:</label>
							<input name="dashboard-name" id="dashboard-name" placeholder="Dashboard Name" required>
							<label for="user-name">For Users:</label>
							<select name="user-name" id="user-name">
								<option>Select</option>${reportOptionsHTML}
							</select>
							
							<label for="visual-type">Choose Visualised Type:</label>
							<select name="visual-type" id="visual-type">
								<option>Select</option>
								<option value="bar">Bar Chart</option>
								<option value="pie">Pie Chart</option>
								<option value="scatter">Scatter Chart</option>
								<option value="bubble">Bubble Chart</option>
								<option value="doughnut">Doughnut Chart</option>
								<option value="line">Line Chart</option>
								<option value="radar">Radar Chart</option>
								<option value="polarArea">PolarArea Chart</option>
							</select>
							
							
							
						</div>
						<div class="form-right">
							
							<label for="query-text">Write your dashboard query:</label>
							<textarea id="query-text" name="query-text" rows="5" required></textarea>
						</div>
						<input type="submit" value="Create Dashboard">
					</form>
					<iframe name="query-iframe"></iframe>
				</div>
				
				
				
			</body>
			</html>

        `);
	    } else if (req.method === 'POST' && req.url === '/create-dashboard') {
	        // Handle form submission to insert and display data
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const dashboardName = params.get('dashboard-name');
	            const queryText = params.get('query-text');
	            const userName = params.get('user-name');
	            const visName = params.get('visual-type');

	            try {
	                // Fetch the connection
	                const connection = await oracledb.getConnection(dbConfigSMRS);

	                // Check if the report already exists
	                const checkResult = await connection.execute(`
                SELECT COUNT(*) AS COUNT FROM SMREPORTING_DASHBOARDS_DETAILS WHERE dashboard_name = :dashboardName
            `, [dashboardName]);

	                const reportExists = checkResult.rows[0][0] > 0;

	                if (reportExists) {
	                    // If the report already exists, return a message
	                    res.writeHead(200, {
	                        'Content-Type': 'text/html'
	                    });
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
                            <h1>Dshboard already exists.</h1>
                        </div>
                    </body>
                    </html>
                `);
	                } else {
	                    // If the report does not exist, insert the new report
	                    const insertResult = await connection.execute(`
                    INSERT INTO SMREPORTING_DASHBOARDS_DETAILS 
                    VALUES (:dashboardName, :queryText, :visName, :userName, TO_DATE(SYSDATE, 'dd-MM-yyyy'))
                `, [dashboardName, queryText, visName, userName]);

	                    await connection.commit(); // Commit the transaction

	                    res.writeHead(200, {
	                        'Content-Type': 'text/html'
	                    });
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
                            <h1>Dashboard created successfully.</h1>
                        </div>
                    </body>
                    </html>
                `);
	                }

	                await connection.close();
	            } catch (err) {
	                console.error('Error during report creation:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/html'
	                });
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
                        <h1>Error during dashboard creation.</h1>
                    </div>
                </body>
                </html>
            `);
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/dprepare') {

	        
			 if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	       

	        // Serve the HTML for the PREPARE page
	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const reportOptionsHTML = await createReportSelectHTML(req);
	        const {
	            optionsHTML,
	            reportData
	        } = await createQuerySelectHTML();
	        const tableColumnData = await userGetTableColumnData();
	        const reportOptionsHTML1 = await userCreateColumnSelectHTML();
	        const userNameFetch = await createReportNameSelectHTML();
	        const tableReportData = await getReportColumnData();

	        res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Prepare Dashboard</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #B6D0E2;
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
				.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
                form {
                    background-color: #6082B6;
                    padding: 20px;
					color:white;
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
                    margin-bottom: 20px;
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                }
                .form-left, .form-right {
                    flex: 1;
                    min-width: 300px; /* Ensures proper alignment on smaller screens */
                }
                form label, form select, form input {
                    display: block;
                    width: calc(100% - 40px);
                    margin: 10px auto;
                    padding: 10px;
                    border: none;
                    border-radius: 5px;
                }
				form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						height:200px;
						border: none;
						border-radius: 5px;
					}
                form input[type="submit"] {
                    background-color: rgba(0, 0, 0, 0.3);
                    color: white;
                    cursor: pointer;
                    transition: background-color 0.3s;
                    width: calc(100% - 40px);
					border: 2px solid black;
                    margin: 10px auto;
                }
                form input[type="submit"]:hover {
					background-color: rgba(0, 0, 0, 0.3);
					border: 2px solid black;
				}
                iframe {
					background-color: #6082B6;
                    width: 100%;
                    height: 400px;
                    
                    border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
			<script>
    document.addEventListener('DOMContentLoaded', () => {
        const userSelect = document.getElementById('user-name');
        const tableSelect = document.getElementById('table-name');
        const columnSelect = document.getElementById('column-name');
        let tableColumnData = {}; // Define tableColumnData outside the event listener to make it accessible

        userSelect.addEventListener('change', async () => {
            console.log('Change event triggered');
            const selectedUser = userSelect.value;

            if (selectedUser) {
                tableColumnData = await fetchTableColumnData(selectedUser); // Update tableColumnData
                updateTableSelect(tableColumnData);
                columnSelect.innerHTML = ''; // Clear columns when user changes
            }
        });

        tableSelect.addEventListener('change', () => {
            const selectedTable = tableSelect.value;
            const columns = tableColumnData[selectedTable] || [];
            columnSelect.innerHTML = columns.map(column =>
                \`<option value="\${column}">\${column}</option>\`
            ).join('');
        });
		
		
		async function fetchTableColumnData(userName) {
        console.log(\`Fetching table and column data for user at fetchTableColumnData: \${userName}\`); // Add logging
        const response = await fetch(\`/api/userGetTableColumnData?user=\${userName}\`);
        return await response.json();
    }

    function updateTableSelect(data) {
        tableSelect.innerHTML = '<option value="">Select</option>' + Object.keys(data).map(table =>
            \`<option value="\${table}">\${table}</option>\`
        ).join('');
    }
		
		
    });

    
</script>
        </head>
        <body>
            <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare" class="active">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
            <div class="container">
                <form action="/prepare-query" method="post" target="data-iframe">
                    <div class="form-left">
                        <label for="user-name">Select User:</label>
						<select name="user-name" id="user-name">
							<option>Select</option>${userNameFetch}	
						</select>											
						
						<label for="table-name">Available Tables:</label>
						<select name="table-name" id="table-name">
							
						</select>
						
						<label for="column-name">Available Columns:</label>
						<select id="column-name" name="column-name"></select>
                        
                    </div>
                    <div class="form-right">
                        
						<label for="query-text">Write your query:</label>
                        <textarea id="query-text" name="query-text" rows="5" required></textarea>
                    </div>
					<input type="submit" value="Prepare Report">
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
	    } else if (req.method === 'GET' && req.url === '/dview') {

	        if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const userNameFetch = await createDashboardNameSelectHTML();
	        const tableReportData = await getDashboardNameData();

	        res.end(`
		   <!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>View Dashboard</title>
			<style>
				 body {
					font-family: Arial, sans-serif;
					background:#B6D0E2; /* linear-gradient(to right, #6a11cb, orange) */
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
				.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
				form {
            background-color: #6082B6;
            padding: 20px;
            border-radius: 10px;
			color:white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
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
            background-color: rgba(0, 0, 0, 0.3);
            color: white;
            cursor: pointer;
            transition: background-color 0.3s;
            grid-column: span 3;
            padding: 10px;
            border: 2px solid black;
            width: 847px;
            border-radius: 5px;
        }
        form input[type="submit"]:hover {
            background-color: rgba(0, 0, 0, 0.3);
			border: 2px solid black;
        }
        iframe {
			background-color: #6082B6; 
			
            width: 100%;
            height: 400px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
			<script>
                    const tableReportData = ${JSON.stringify(tableReportData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const userSelect = document.getElementById('user-name');
                        const dashboardSelect = document.getElementById('dashboard-name');

                        userSelect.addEventListener('change', () => {
                            const selectedUser = userSelect.value;
                            const report = tableReportData[selectedUser] || [];

                            dashboardSelect.innerHTML = report.map(column => 
                                \`<option value="\${column}">\${column}</option>\`
                            ).join('');
                        });
                    });
                </script>
		</head>
		<body>
		<nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview" class="active">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
		<div class="container">
			<form action="/fetch-dashboard-data" method="post" target="data-iframe">
				<div>
					<label for="user-name">Select User:</label>
					<select name="user-name" id="user-name">
						<option>Select</option>
						${userNameFetch}
					</select>
				</div>
				<div>
					<label for="dashboard-name">Select Dashboard:</label>
					<select name="dashboard-name" id="dashboard-name">
						
						
					</select>
				</div>
				
				<div>
					<label for="from-date">From Date:</label>
					<input type="date" id="from-date" name="from-date" >
				</div>
				<div>
					<label for="to-date">To Date:</label>
					<input type="date" id="to-date" name="to-date" >
				</div>
				
				<input type="submit" value="View Dashboard">
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
	    } else if (req.method === 'POST' && req.url === '/fetch-dashboard-data') {
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const userName = params.get('user-name');
	            const dashboardName = params.get('dashboard-name');
	            let fromDate = params.get('from-date');
	            let toDate = params.get('to-date');

	            if (!fromDate) {
	                const currentDate = new Date();
	                fromDate = currentDate.toISOString().split('T')[0];
	            }

	            if (!toDate) {
	                const currentDate = new Date();
	                toDate = currentDate.toISOString().split('T')[0];
	            }

	            const [year1, month1, day1] = fromDate.split('-');
	            const formattedFromDate = `${day1}-${month1}-${year1}`;
	            const [year2, month2, day2] = toDate.split('-');
	            const formattedToDate = `${day2}-${month2}-${year2}`;

	            try {
	                // Fetch the user's database configuration
	                const connection = await oracledb.getConnection(dbConfigSMRS);
	                const userQueryResult = await connection.execute(`
                SELECT HOST, DBPORT, SID, DBPASSWORD, DBUSERNAME 
                FROM SMREPORTING_USERS 
                WHERE username = :userName
            `, [userName]);

	                if (userQueryResult.rows.length === 0) {
	                    throw new Error('No database configuration found for the selected user.');
	                }

	                const userConfig = userQueryResult.rows[0];
	                const dbConfig = {
	                    user: userConfig[4],
	                    password: userConfig[3],
	                    connectString: `${userConfig[0]}:${userConfig[1]}/${userConfig[2]}`
	                };

	                // Fetch the query from the SMREPORTING_REPORTS_DETAILS table
	                const queryResult = await connection.execute(`
                SELECT CREATED_QUERY  
                FROM SMREPORTING_DASHBOARDS_DETAILS 
                WHERE dashboard_name = :dashboardName
            `, [dashboardName]);

	                const visualResult = await connection.execute(`
                SELECT VISUALISED_TYPE  
                FROM SMREPORTING_DASHBOARDS_DETAILS 
                WHERE dashboard_name = :dashboardName
            `, [dashboardName]);

	                if (queryResult.rows.length === 0) {
	                    throw new Error('No query found for the selected report name.');
	                }

	                if (visualResult.rows.length === 0) {
	                    throw new Error('No visual type found for the selected dashboard name.');
	                }

	                let vtype = visualResult.rows[0][0];

	                let query = queryResult.rows[0][0];

	                query = query.replace(/\+fromdate\+/g, `TO_DATE('${formattedFromDate}', 'DD-MM-YYYY')`);
	                query = query.replace(/\+todate\+/g, `TO_DATE('${formattedToDate}', 'DD-MM-YYYY')`);

	                // Log the constructed query for debugging
	                console.log('Constructed Query:', query);

	                await connection.close();

	                const userConnection = await oracledb.getConnection(dbConfig);
	                const reportResult = await userConnection.execute(query);

	                const metaData = reportResult.metaData;

	                let tableHTML;
	                if (metaData.length === 1) {
	                    tableHTML = createDashboardHTMLOne(reportResult, dashboardName, vtype, fromDate, toDate);
	                } else {
	                    tableHTML = createDashboardHTMLTwo(reportResult, dashboardName, vtype, fromDate, toDate);
	                }

	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
	                res.end(tableHTML);

	                await userConnection.close();
	            } catch (err) {
	                console.error('Error executing query:', err);
	                res.writeHead(500, {
	                    'Content-Type': 'text/plain'
	                });
	                res.end('An error occurred while fetching data.');
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/dupdate') {

	        if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			const {
	            optionsHTML,
	            reportData
	        } = await createQuerySelectDashboardHTML();
	        const tableColumnData = await userGetTableColumnData();

	        const userNameFetch = await createDashboardNameSelectHTML();
	        const tableReportData = await getDashboardNameData();

	        

	        // Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Update Dashboard</title>
                <style>
                    body {
						font-family: Arial, sans-serif;
						background: #B6D0E2; 
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
					.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
					form {
						background-color: #6082B6; 																							
						padding: 20px;
						color:white;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
						margin-bottom: 20px;
						display: flex;
						flex-wrap: wrap;
						justify-content: space-between;
					}
					.form-left, .form-right {
						flex: 1;
						min-width: 300px; /* Ensures proper alignment on smaller screens */
					}
					form label, form select, form input {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						border: none;
						border-radius: 5px;
					}
					form textarea {
						display: block;
						width: calc(100% - 40px);
						margin: 10px auto;
						padding: 10px;
						height:280px;
						border: none;
						border-radius: 5px;
					}
					form input[type="submit"] {
						background-color: rgba(0, 0, 0, 0.3);
						color: white;
						cursor: pointer;
						transition: background-color 0.3s;
						width: calc(100% - 40px);
						border: 2px solid black;
						margin: 10px auto;
					}
					form input[type="submit"]:hover {
						background-color: rgba(0, 0, 0, 0.3);
						border: 2px solid black;
					}
					iframe {
						width: 100%;
						height: 400px;
						background-color: #6082B6;
						border-radius: 10px;
						box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
    document.addEventListener('DOMContentLoaded', () => {
        const userSelect = document.getElementById('user-name');
        const tableSelect = document.getElementById('table-name');
        const columnSelect = document.getElementById('column-name');
        let tableColumnData = {}; // Define tableColumnData outside the event listener to make it accessible

        userSelect.addEventListener('change', async () => {
            console.log('Change event triggered');
            const selectedUser = userSelect.value;

            if (selectedUser) {
                tableColumnData = await fetchTableColumnData(selectedUser); // Update tableColumnData
                updateTableSelect(tableColumnData);
                columnSelect.innerHTML = ''; // Clear columns when user changes
            }
        });

        tableSelect.addEventListener('change', () => {
            const selectedTable = tableSelect.value;
            const columns = tableColumnData[selectedTable] || [];
            columnSelect.innerHTML = columns.map(column =>
                \`<option value="\${column}">\${column}</option>\`
            ).join('');
        });
		
		
		async function fetchTableColumnData(userName) {
        console.log(\`Fetching table and column data for user at fetchTableColumnData: \${userName}\`); // Add logging
        const response = await fetch(\`/api/userGetTableColumnData?user=\${userName}\`);
        return await response.json();
    }

    function updateTableSelect(data) {
        tableSelect.innerHTML = '<option value="">Select</option>' + Object.keys(data).map(table =>
            \`<option value="\${table}">\${table}</option>\`
        ).join('');
    }
		
		
    });

    
</script>
				
				<script>
                    const reportData = ${JSON.stringify(reportData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const dashboardSelect = document.getElementById('dashboard-name');
                        const queryTextarea = document.getElementById('query-text');

                        dashboardSelect.addEventListener('change', () => {
                            const selectedReport = dashboardSelect.value;
                            queryTextarea.value = reportData[selectedReport] || '';
                        });
                    });
                </script>
				
				<script>
                    const tableReportData = ${JSON.stringify(tableReportData)};

                    document.addEventListener('DOMContentLoaded', () => {
                        const userSelect = document.getElementById('user-name');
                        const dashboardSelect = document.getElementById('dashboard-name');

                        userSelect.addEventListener('change', () => {
                            const selectedUser = userSelect.value;
                            const report = tableReportData[selectedUser] || [];

                            dashboardSelect.innerHTML = '<option value="">Select</option>' + 	
							report.map(column => 
                                \`<option value="\${column}">\${column}</option>\`
                            ).join('');
                        });
                    });
                </script>
            </head>
            <body>
               <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate" class="active">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
        </div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
                <div class="container">
                    <form action="/update-dashboard" method="POST" target="query-iframe">
						<div class="form-left">
							<label for="user-name">Select User:</label>
							<select name="user-name" id="user-name">
								<option>Select</option>
								${userNameFetch}
							</select>
							
							<label for="dashboard-name">Select Dashboard:</label>
							<select name="dashboard-name" id="dashboard-name">
								
								
							</select>
							
							<label for="table-name">Available Tables:</label>
							<select name="table-name" id="table-name">
								
							</select>
							
							<label for="column-name">Available Columns:</label>
							<select id="column-name" name="column-name"></select>
							
						</div>
						
						<div class="form-right">
							<label for="query-text">Dashboard Query:</label>
							<textarea id="query-text" name="query-text" rows="5" required></textarea>
						</div>
						<input type="submit" value ="Update Dashboard">
						
                    </form>
                    <iframe name="query-iframe"></iframe>
                </div>
            </body>
            </html>
        `);
	    } else if (req.method === 'POST' && req.url === '/update-dashboard') {
	        let body = '';

	        req.on('data', chunk => {
	            body += chunk.toString();
	        });

	        req.on('end', async () => {
	            try {
	                const params = new URLSearchParams(body);
	                const dashboardName = params.get('dashboard-name');
	                const queryText = params.get('query-text');

	                if (!dashboardName || !queryText) {
	                    throw new Error("Report name or query text is missing.");
	                }

	                const connectionPresales = await oracledb.getConnection(dbConfigSMRS);

	                const checkResult = await connectionPresales.execute(
	                    `SELECT COUNT(*) AS COUNT FROM SMREPORTING_DASHBOARDS_DETAILS WHERE dashboard_name = :dashboardName`,
	                    [dashboardName]
	                );

	                const reportExists = checkResult.rows[0][0] > 0;

	                let message, statusCode;

	                if (reportExists) {
	                    const updateResult = await connectionPresales.execute(
	                        `UPDATE SMREPORTING_DASHBOARDS_DETAILS SET created_query = :queryText WHERE dashboard_name = :dashboardName`,
	                        [queryText, dashboardName]
	                    );

	                    await connectionPresales.commit();

	                    if (updateResult.rowsAffected && updateResult.rowsAffected === 1) {
	                        statusCode = 200;
	                        message = "Dashboard updated successfully.";
	                    } else {
	                        throw new Error("Failed to update report.");
	                    }
	                } else {
	                    statusCode = 200;
	                    message = "Dashboard does not exist.";
	                }

	                connectionPresales.close();

	                res.writeHead(statusCode, {
	                    'Content-Type': 'text/html'
	                });
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
	                res.writeHead(500, {
	                    'Content-Type': 'text/html'
	                });
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
							<h1>Error during Dashboard updation.</h1>
						</div>
					</body>
					</html>
				`);
	            }
	        });
	    } else if (req.method === 'GET' && req.url === '/ddelete') {

	        
			if (!isAuthenticated(req)) {
	            res.writeHead(302, {
	                'Location': '/'
	            });
	            res.end();
	            return;
	        }
			
			// Parse cookies from request
	        const cookies = parseCookies(req);

	        // Retrieve username from session
	        const sessionId = cookies.sessionId;
	        const session = sessions[sessionId];
	        const username = session ? session.username : '';

	        

	        res.writeHead(200, {
	            'Content-Type': 'text/html'
	        });
	        const userNameFetch = await createDashboardNameSelectHTML();
	        const tableReportData = await getDashboardNameData();
	        res.end(`
           <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DELETE DASHBOARD</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #B6D0E2; 
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
            background-color: #6082B6;
			border-bottom:2px solid black;
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
            color: blue; /* Hover color */
        }
        nav a.header {
            color: blue; /* Active color */
        }
        nav a.active {
            color: blue; /* Active color */
        }
        .dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
        form {
            background-color:#6082B6;
            color:white;
			padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
            background-color: rgba(0, 0, 0, 0.3);
            color: white;
            cursor: pointer;
            transition: background-color 0.3s;
            grid-column: span 3;
            padding: 10px;
            border: none;                    
            width: 100%;
			border: 2px solid black;
            border-radius: 5px;
        }
        form input[type="submit"]:hover {
            background-color: rgba(0, 0, 0, 0.3);
			border: 2px solid black;
        }
        iframe {
            width: 100%;
            height: 400px;
            background-color: #6082B6;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
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
    <script>
        const tableReportData = ${JSON.stringify(tableReportData)};

        document.addEventListener('DOMContentLoaded', () => {
            const userSelect = document.getElementById('user-name');
            const dashboardSelect = document.getElementById('dashboard-name');

            userSelect.addEventListener('change', () => {
                const selectedUser = userSelect.value;
                const report = tableReportData[selectedUser] || [];

                dashboardSelect.innerHTML = '<option value="">Select</option>' +     
                report.map(column => 
                    \`<option value="\${column}">\${column}</option>\`
                ).join('');
            });
        });
    </script>
</head>
<body>
    <nav>
        <a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete" class="active">DELETE DASHBOARD</a>
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">RAW REPORT</a>
            <div class="dropdown-content">
				<a href="/spreadsheet" class="active">SPREADSHEET FUNCTIONALITY</a>
            </div>
		</div>
        <a href="#" >user: ${username}</a>
        <a href="/logoff" >logout</a>
    </nav>
    <div class="container">
        <form action="/delete-dashboard-data" method="post" target="query-iframe">
            <div>
                <label for="user-name">Select User:</label>
                <select name="user-name" id="user-name">
                    <option>Select</option>
                    ${userNameFetch}
                </select>
            </div>
            <div>
                <label for="dashboard-name">Select Dashboard:</label>
                <select name="dashboard-name" id="dashboard-name"></select>
            </div>
            <div>
                <br>
                <input type="submit" value="Delete Report">
            </div>
        </form>
        <iframe name="query-iframe"></iframe>
    </div>
</body>
</html>

        `);
	    } else if (req.method === 'POST' && req.url === '/delete-dashboard-data') {
	        let body = '';
	        req.on('data', chunk => {
	            body += chunk.toString();
	        });
	        req.on('end', async () => {
	            const params = new URLSearchParams(body);
	            const dashboardName = params.get('dashboard-name');
	            const confirmDelete = params.get('confirm-delete');

	            if (confirmDelete === 'yes') {
	                // Proceed with the deletion
	                try {
	                    const connectionconfig = await oracledb.getConnection(dbConfigSMRS);
	                    const resultPresales = await connectionconfig.execute(`
                    DELETE FROM SMREPORTING_DASHBOARDS_DETAILS WHERE dashboard_name = :dashboardName
                `, [dashboardName]);

	                    await connectionconfig.commit(); // Commit the transaction
	                    await connectionconfig.close();

	                    res.writeHead(200, {
	                        'Content-Type': 'text/html'
	                    });
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
                            <h1>Dashboard deleted successfully.</h1>
                        </div>
                    </body>
                    </html>
                `);
	                } catch (err) {
	                    console.error('Error during deleting dashboard:', err);
	                    res.writeHead(500, {
	                        'Content-Type': 'text/html'
	                    });
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
                            <h1>Error during deleting dashboard.</h1>
                        </div>
                    </body>
                    </html>
                `);
	                }
	            } else {
	                // Show confirmation page
	                res.writeHead(200, {
	                    'Content-Type': 'text/html'
	                });
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
                        a {
                            color: #ffeb3b;
                            text-decoration: none;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    <div class="message-container">
                        <h1>Are you sure you want to delete the Dashboard "${dashboardName}"?</h1>
                        <form action="/delete-dashboard-data" method="post">
                            <input type="hidden" name="dashboard-name" value="${dashboardName}">
                            <button type="submit" name="confirm-delete" value="yes">Yes</button>
                            <button type="submit" name="confirm-delete" value="no">No</button>
                        </form>
                    </div>
                </body>
                </html>
            `);
	            }
	        });
	    }else if (req.method === 'GET' && req.url === '/spreadsheet') {

    // Parse cookies from request
    const cookies = parseCookies(req);

    // Retrieve username from session
    const sessionId = cookies.sessionId;
    const session = sessions[sessionId];
    const username = session ? session.username : '';

    if (!isAuthenticated(req)) {
        res.writeHead(302, {
            'Location': '/'
        });
        res.end();
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/html'
    });

    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spreadsheet Functionality</title>
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
            color: #00ff00;
        }
        nav a.active {
            color: #ffeb3b;
        }
		.dropdown {
            display: inline-block;
            position: relative;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: rgba(0, 0, 0, 0.3);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            z-index: 1;
        }
        .dropdown-content a {
            color: white;
            padding: 12px 16px;
            text-decoration: none;
            display: block;
            text-align: left;
        }
        .dropdown-content a:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }
        form {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 20px;
            align-items: start;
        }
        form label {
            display: block;
            margin-bottom: 5px;
        }
        form input, form button {
            display: block;
            width: 90%;
            padding: 10px;
            border: none;
            border-radius: 5px;
        }
        form button {
            background-color: #4CAF50;
            color: white;
            cursor: pointer;
            transition: background-color 0.3s;
            grid-column: span 3;
            padding: 10px;
            border: none;
            width: 847px;
            border-radius: 5px;
        }
        form button:hover {
            background-color: #45a049;
        }
        #display-area {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
        }
        th {
            background: #333;
            color: white;
        }
    </style>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const fileInput = document.getElementById('file-input');
            const fileForm = document.getElementById('file-form');
            const displayArea = document.getElementById('display-area');

            fileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const file = fileInput.files[0];
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch('/upload-spreadsheet', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        displayData(data);
                    }
                }
            });

            const displayData = (data) => {
                displayArea.innerHTML = '';
                if (Array.isArray(data) && data.length > 0) {
                    const table = document.createElement('table');
                    const thead = document.createElement('thead');
                    const headerRow = document.createElement('tr');
                    Object.keys(data[0]).forEach(key => {
                        const th = document.createElement('th');
                        th.textContent = key;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    table.appendChild(thead);

                    const tbody = document.createElement('tbody');
                    data.forEach(row => {
                        const tr = document.createElement('tr');
                        Object.values(row).forEach(cell => {
                            const td = document.createElement('td');
                            td.textContent = cell;
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody);
                    displayArea.appendChild(table);
                }
            }
        });
    </script>
</head>
<body>
    <nav>
		<a href="#" class="header">SM REPORTING</a>
        <div class="dropdown">
            <a href="#" class="dropbtn">REPORT</a>
            <div class="dropdown-content">
                <a href="/create">CREATE REPORT</a>
                <a href="/prepare">PREPARE REPORT</a>
                <a href="/admin">VIEW REPORT</a>
                <a href="/update">UPDATE REPORT</a>
				<a href="/delete">DELETE REPORT</a>                
            </div>
        </div>
		<div class="dropdown">
            <a href="#" class="dropbtn">DASHBOARD</a>
            <div class="dropdown-content">
				<a href="/dview">VIEW DASHBOARDS</a>
                <a href="/dcreate">CREATE DASHBOARDS</a>				
				<a href="/dprepare">PREPARE DASHBOARD</a>
				<a href="/dupdate">UPDATE DASHBOARD</a>
				<a href="/ddelete">DELETE DASHBOARD</a>
            </div>
		</div>
		<div class="dropdown">
            <a href="#" class="dropbtn">EXCEL REPORT</a>
            <div class="dropdown-content">
				<a href="/ecreate" class="active">CREATE REPORT</a>
            </div>
		</div>
        
        
        <a href="#">user: ${username}</a>
        <a href="/logoff">logout</a>
    </nav>
    <div class="container">
        <form id="file-form">
            <div>
                <label for="file-input">Upload XLSX or CSV File:</label>
                <input type="file" id="file-input" name="file" accept=".xlsx, .csv">
            </div>
            <button type="submit">Upload and Display</button>
        </form>
        <div id="display-area"></div>
    </div>
</body>
</html>
    `);
} else {
	        // Handle other routes
	        res.writeHead(404, {
	            'Content-Type': 'text/plain'
	        });
	        res.end('Not Found');
	    }
	});

	// Start the server
	const port = 3000;
	server.listen(port, () => {
	    console.log(`Server running at http://localhost:${port}`);
	});