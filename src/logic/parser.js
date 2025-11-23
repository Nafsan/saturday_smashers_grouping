/**
 * Parses raw text input into the tournament JSON format.
 * 
 * Expected format:
 * DD/MM/YYYY
 * 1. Name
 * 2. Name
 * 3. Name, Name
 * ...
 * 
 * @param {string} text - The raw text input.
 * @returns {Object|null} The formatted JSON object or null if invalid.
 */
export const parseRankText = (text) => {
    try {
        const lines = text.trim().split('\n').filter(l => l.trim());
        if (lines.length < 2) return null;

        // Parse Date (First line)
        // Try to handle DD/MM/YYYY or YYYY-MM-DD
        let dateStr = lines[0].trim();
        let dateObj;

        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            // Assume DD/MM/YYYY
            if (parts[2].length === 4) {
                dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        } else {
            dateObj = new Date(dateStr);
        }

        if (isNaN(dateObj.getTime())) {
            // Fallback: maybe the first line isn't a date, use today?
            // But spec says "08/12/2025" is first line.
            // Let's try to be robust.
            console.warn("Could not parse date from first line, using today.");
            dateObj = new Date();
        }

        const formattedDate = dateObj.toISOString().split('T')[0];
        const id = `t_${formattedDate.replace(/-/g, '_')}`;

        const ranks = [];

        // Parse Ranks
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            // Match "1. Name" or "1. Name, Name2"
            const match = line.match(/^(\d+)\.\s+(.+)$/);
            if (match) {
                const rank = parseInt(match[1]);
                const namesPart = match[2];
                // Split by comma or " and "
                const players = namesPart.split(/,| and /).map(n => n.trim()).filter(n => n);
                ranks.push({ rank, players });
            }
        }

        return {
            id,
            date: formattedDate,
            ranks
        };
    } catch (e) {
        console.error("Parse error:", e);
        return null;
    }
};
