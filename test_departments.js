const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'wehub',
    password: 'postgres',
    port: 5432,
});

async function testDepartments() {
    try {
        const query = `
            SELECT DISTINCT 
                ad.name as department,
                ad.hotel_id,
                h.name as hotel_name
            FROM acc_departments ad
            JOIN hotels h ON ad.hotel_id = h.id
            WHERE ad.is_current = true
            ORDER BY h.name
        `;
        
        const result = await pool.query(query);
        console.log('Departments found:', result.rows.length);
        console.log('Data:', JSON.stringify(result.rows, null, 2));
        
        // Test the aggregation logic from frontend
        const hotelMap = new Map();
        result.rows.forEach(d => {
            if (d.hotel_id && !hotelMap.has(d.hotel_id)) {
                hotelMap.set(d.hotel_id, {
                    hotel_id: d.hotel_id,
                    hotel_name: d.hotel_name
                });
            }
        });
        const mappedHotels = Array.from(hotelMap.values()).sort((a, b) =>
            (a.hotel_name || '').localeCompare(b.hotel_name || '', 'ja')
        );
        
        console.log('Mapped hotels:', JSON.stringify(mappedHotels, null, 2));
        
        // Create hotel options like frontend does
        const options = [{ label: 'すべての施設 (全体平均と比較)', value: 0 }];
        if (mappedHotels?.length) {
            mappedHotels.forEach(h => {
                options.push({ label: h.hotel_name, value: h.hotel_id });
            });
        }
        
        console.log('Hotel options:', JSON.stringify(options, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testDepartments();