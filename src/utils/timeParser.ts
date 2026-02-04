export const formatTimeInput = (minutes: number): string => {
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export const parseTimeInput = (time: string): number => {
    const [h, m] = time.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return 0
    return h * 60 + m
}

export const parseTitleForTime = (title: string): { cleanTitle: string; minutes: number | null } => {
    // Regex to match "1h 30m", "20min", "1.5 hrs" etc.
    const timeRegex = /(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h|mins?|minutes?|m)\s*(?:(\d+)\s*(?:mins?|minutes?|m)?)?/i;

    // We only want to match if it's at the END of the string
    // Simplified logic: Check for matches, if found, extract

    // More specific regex for various formats at the end of string
    // "Task name 2h 30m"
    // "Task name 45min"

    const matches = title.match(timeRegex);
    if (!matches) return { cleanTitle: title, minutes: null };

    // This is a naive implementation, let's refine it.
    // Let's implement specific parsing logic similar to documentation examples
    // "28min", "1 hr", "2hr 15min"

    // Check for "Xhr Ymin" format first
    const hrMinRegex = /(\d+)\s*(?:hr|hrs|hour|hours|h)\s*(\d+)\s*(?:min|mins|minutes|m)$/i;
    const hrMinMatch = title.match(hrMinRegex);
    if (hrMinMatch) {
        const hours = parseInt(hrMinMatch[1]);
        const mins = parseInt(hrMinMatch[2]);
        const cleanTitle = title.replace(hrMinMatch[0], '').trim();
        return { cleanTitle, minutes: hours * 60 + mins };
    }

    // Check for "Xhr" format
    const hrRegex = /(\d+(?:\.\d+)?)\s*(?:hr|hrs|hour|hours|h)$/i;
    const hrMatch = title.match(hrRegex);
    if (hrMatch) {
        const hours = parseFloat(hrMatch[1]);
        const cleanTitle = title.replace(hrMatch[0], '').trim();
        return { cleanTitle, minutes: Math.round(hours * 60) };
    }

    // Check for "Xmin" format
    const minRegex = /(\d+)\s*(?:min|mins|minutes|m)$/i;
    const minMatch = title.match(minRegex);
    if (minMatch) {
        const mins = parseInt(minMatch[1]);
        const cleanTitle = title.replace(minMatch[0], '').trim();
        return { cleanTitle, minutes: mins };
    }

    return { cleanTitle: title, minutes: null };
}
