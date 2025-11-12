export function useClientDisplay() {
  const getClientName = (room) => {
    //console.log('getClientName - room object:', room);
    let clientsFromJSON = [];
    try {
      if (room?.clients_json) {
        clientsFromJSON = typeof room.clients_json === 'string' 
          ? JSON.parse(room.clients_json)
          : room.clients_json;
      }
    } catch (e) {
      console.error('Error parsing clients_json:', e);
    }
    //console.log('getClientName - parsed clientsFromJSON:', clientsFromJSON);
          
    const processedClients = [];
    const addedClientIds = new Set(); // To prevent duplicates by client ID

    // Always add the booker from room.client_name first
    if (room?.client_name && room?.booker_client_id) {
      processedClients.push({
        name: room.client_name,
        isBooker: true,
        gender: room.booker_gender || null
      });
      addedClientIds.add(room.booker_client_id);
    }

    // Add other clients from clients_json, avoiding duplicates with the booker
    clientsFromJSON.forEach(client => {
      const clientName = client.name_kanji || client.name_kana || client.name;
      if (clientName && client.client_id && !addedClientIds.has(client.client_id)) {
        processedClients.push({
          name: clientName,
          isBooker: false,
          gender: client.gender || null
        });
        addedClientIds.add(client.client_id);
      }
    });

    return processedClients;
  };

  return {
    getClientName
  };
}
