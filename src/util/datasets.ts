export interface DatasetImage {
    url: string;
    thumbnail?: string;
}

export interface Dataset {
    id: string;
    nameKey: string; // Translation key for the name
    descriptionKey: string; // Translation key for the description
    images: DatasetImage[];
    categoryKey: string; // Translation key for the category
}

/** Bundled / local-only sample datasets. Remote GenAI catalog is intentionally unused. */
export let DATASETS: Dataset[] = [];

export const REMOTE_DATASETS_URL = '/tm-models/empty-datasets.json';

export async function fetchAndCacheDatasets(url: string = REMOTE_DATASETS_URL): Promise<Dataset[]> {
    try {
        // Never call third-party GenAI hosts. Prefer empty local catalog.
        if (url.startsWith('http://') || url.startsWith('https://')) {
            console.warn('Remote dataset catalogs are disabled; using local empty catalog.');
            DATASETS = [];
            return DATASETS;
        }
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Failed to fetch datasets: ${resp.status}`);
        const json = (await resp.json()) as Dataset[];
        if (Array.isArray(json)) {
            DATASETS = json;
            return DATASETS;
        }
        throw new Error('Invalid datasets format from server');
    } catch (err) {
        console.error('Error fetching datasets:', err);
        DATASETS = [];
        return DATASETS;
    }
}
