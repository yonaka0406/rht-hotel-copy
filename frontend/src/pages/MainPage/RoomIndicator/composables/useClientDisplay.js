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
    const addedClientNames = new Set(); // To prevent duplicates

    // Always add the booker from room.client_name first
    if (room?.client_name) {
      processedClients.push({
        name: room.client_name,
        isBooker: true,
        gender: null // Gender not available from client_name
      });
      addedClientNames.add(room.client_name);
    }

    // Add other clients from clients_json, avoiding duplicates with the booker
    clientsFromJSON.forEach(client => {
      const clientName = client.name_kanji || client.name_kana || client.name;
      if (clientName && !addedClientNames.has(clientName)) {
        processedClients.push({
          name: clientName,
          isBooker: false,
          gender: client.gender || null
        });
        addedClientNames.add(clientName);
      }
    });

    return processedClients;
  };

  return {
    getClientName
  };
}
