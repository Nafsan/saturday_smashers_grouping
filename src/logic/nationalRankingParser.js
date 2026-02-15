/**
 * Parses the HTML response from bttf.org.bd ranking pages
 * @param {string} htmlString 
 * @returns {Array} List of player ranking objects
 */
export const parseNationalRankingHTML = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // The ranking is usually in a table inside a figure with class 'wp-block-table'
    const table = doc.querySelector('.wp-block-table table');
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) return [];

    // Header is the first row
    const headers = Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent.trim());

    // Data starts from the second row
    const rankings = rows.slice(1).map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const data = {};

        cells.forEach((cell, index) => {
            const header = headers[index] || `col_${index}`;
            let value = cell.textContent.trim();

            // Try to convert numeric values
            if (!isNaN(value) && value !== '') {
                value = Number(value);
            }

            data[header] = value;
        });

        return data;
    });

    return rankings;
};
