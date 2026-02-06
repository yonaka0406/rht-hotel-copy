/**
 * Normalizes a client name for similarity matching.
 * Handles Japanese full-width/half-width conversion and common corporate noise.
 */
export const normalizeClientName = (name) => {
    if (!name) return '';
    // NFKC normalization handles full-width/half-width and other character variations
    let normalized = name.normalize('NFKC').toLowerCase().replace(/\s+/g, '');

    // Common corporate prefixes and suffixes in Japan
    const noise = [
        '株式会社', '有限会社', '合資会社', '合同会社',
        '特定非営利活動法人', 'npo法人',
        '一般社団法人', '公益社団法人', '一般財団法人', '公益財団法人',
        '(株)', '(有)', '（株）', '（有）'
    ];

    let searchName = normalized;
    let changed = true;
    while (changed) {
        changed = false;
        for (const term of noise) {
            // Remove from start or end
            if (searchName.startsWith(term)) {
                searchName = searchName.substring(term.length);
                changed = true;
            }
            if (searchName.endsWith(term)) {
                searchName = searchName.substring(0, searchName.length - term.length);
                changed = true;
            }
        }
    }

    return searchName || normalized; // fallback to normalized if searchName becomes empty
};

/**
 * Finds duplicate candidates for all clients.
 */
export const findDuplicates = (allClients) => {
    if (!allClients || allClients.length === 0) return [];

    // De-duplicate input clients by ID to prevent duplicate key warnings in UI
    const uniqueClientsMap = new Map();
    allClients.forEach(c => {
        if (c && c.id) uniqueClientsMap.set(c.id, c);
    });
    const clients = Array.from(uniqueClientsMap.values());

    // 1. Group clients by exact matches (Email, Phone, Normalized Name)
    const exactGroups = new Map();

    clients.forEach(client => {
        const keys = new Set();
        if (client.email) keys.add(`email:${client.email.toLowerCase()}`);
        if (client.phone) {
            const digits = client.phone.replace(/\D/g, '');
            if (digits.length >= 7) keys.add(`phone:${digits}`);
        }
        const searchName = normalizeClientName(client.name_kanji || client.name_kana || client.name);
        if (searchName.length >= 2) keys.add(`name:${searchName}`);

        keys.forEach(key => {
            if (!exactGroups.has(key)) exactGroups.set(key, new Set());
            exactGroups.get(key).add(client.id);
        });
    });

    // Union-Find for exact groups
    const parent = new Map();
    const find = (i) => {
        if (parent.get(i) === i) return i;
        const root = find(parent.get(i));
        parent.set(i, root);
        return root;
    };
    const union = (i, j) => {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) parent.set(rootI, rootJ);
    };

    clients.forEach(c => parent.set(c.id, c.id));
    for (const ids of exactGroups.values()) {
        const idArray = [...ids];
        for (let i = 1; i < idArray.length; i++) {
            union(idArray[0], idArray[i]);
        }
    }

    // Consolidate exact groups
    const consolidatedExactGroups = new Map();
    clients.forEach(client => {
        const root = find(client.id);
        if (!consolidatedExactGroups.has(root)) consolidatedExactGroups.set(root, []);
        consolidatedExactGroups.get(root).push(client);
    });

    // Leaders of exact groups
    const leaders = [];
    const finalPairs = [];

    consolidatedExactGroups.forEach(group => {
        // Sort by created_at to find the earliest
        group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const earliest = group[0];
        const duplicates = group.slice(1);

        leaders.push(earliest);

        if (duplicates.length > 0) {
            finalPairs.push({ earliest, duplicates, type: 'exact' });
        }
    });

    // 2. Similarity (Prefix) matching between leaders
    // Sort and search forward for prefix matches - O(N log N)
    const sortedLeaders = leaders.map(l => ({
        client: l,
        searchName: normalizeClientName(l.name_kanji || l.name_kana || l.name)
    })).sort((a, b) => a.searchName.localeCompare(b.searchName));

    for (let i = 0; i < sortedLeaders.length; i++) {
        const current = sortedLeaders[i];
        if (current.searchName.length < 4) continue; // Min length for prefix match

        const candidates = [];
        for (let j = i + 1; j < sortedLeaders.length; j++) {
            const other = sortedLeaders[j];

            // Check if current is a prefix of other
            if (other.searchName.startsWith(current.searchName)) {
                if (other.searchName !== current.searchName) {
                    const otherGroup = consolidatedExactGroups.get(find(other.client.id));
                    candidates.push(...otherGroup);
                }
            } else {
                // Since they are sorted, no more candidates for current start name
                break;
            }
        }

        if (candidates.length > 0) {
            const existingPair = finalPairs.find(p => p.earliest.id === current.client.id);
            if (existingPair) {
                const currentDupIds = new Set(existingPair.duplicates.map(d => d.id));
                candidates.forEach(c => {
                    if (!currentDupIds.has(c.id)) {
                        existingPair.duplicates.push(c);
                        currentDupIds.add(c.id);
                    }
                });
            } else {
                // Ensure unique candidates within the pair
                const uniqueCandidatesMap = new Map();
                candidates.forEach(c => uniqueCandidatesMap.set(c.id, c));
                finalPairs.push({
                    earliest: current.client,
                    duplicates: Array.from(uniqueCandidatesMap.values()),
                    type: 'similarity'
                });
            }
        }
    }

    return finalPairs;
};

/**
 * Finds candidates specifically for one client (for the Edit page).
 */
export const findCandidatesForClient = (targetClient, allClients) => {
    if (!targetClient || !allClients) return [];

    // De-duplicate input clients by ID
    const uniqueClientsMap = new Map();
    allClients.forEach(c => {
        if (c && c.id) uniqueClientsMap.set(c.id, c);
    });
    const clients = Array.from(uniqueClientsMap.values());

    const targetSearchName = normalizeClientName(targetClient.name_kanji || targetClient.name_kana || targetClient.name);
    const targetEmail = targetClient.email?.toLowerCase();
    const targetPhoneDigits = targetClient.phone?.replace(/\D/g, '');

    return clients.filter(client => {
        if (client.id === targetClient.id) return false;

        // Exact match on Email or Phone
        if (targetEmail && client.email?.toLowerCase() === targetEmail) return true;
        if (targetPhoneDigits && targetPhoneDigits.length >= 7 && client.phone?.replace(/\D/g, '') === targetPhoneDigits) return true;

        const searchName = normalizeClientName(client.name_kanji || client.name_kana || client.name);

        // Exact match on normalized name
        if (searchName === targetSearchName) return true;

        // Prefix similarity (either direction)
        if (targetSearchName.length >= 4 && searchName.startsWith(targetSearchName)) return true;
        if (searchName.length >= 4 && targetSearchName.startsWith(searchName)) return true;

        return false;
    });
};
